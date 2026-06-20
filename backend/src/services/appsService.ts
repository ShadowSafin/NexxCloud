import fs from "fs/promises";
import path from "path";
import { PrismaClient, User } from "@prisma/client";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";
import {
  dockerEngineService,
  DockerImageAnalysis,
  PortMapping,
  VolumeMapping,
} from "./dockerEngineService";
import { dockerHubService } from "./dockerHubService";

interface InstallDockerHubAppInput {
  image: string;
  tag?: string;
  name?: string;
  ports?: PortMapping[];
  environment?: Record<string, string>;
  volumes?: VolumeMapping[];
  restartPolicy?: "unless-stopped" | "always" | "on-failure" | "no";
  networkMode?: string;
  privileged?: boolean;
  storageMappings?: VolumeMapping[];
}

type InstallProgressStage =
  | "queued"
  | "pulling"
  | "analyzing"
  | "writing-compose"
  | "starting"
  | "running"
  | "error";

interface InstallProgress {
  stage: InstallProgressStage;
  percent: number;
  message: string;
  logs: string[];
  updatedAt: string;
}

const json = (value: unknown) => JSON.stringify(value ?? null);

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const safeTag = (value?: string) => {
  const tag = (value || "latest").trim();
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(tag)) {
    throw new BadRequestError("Invalid Docker image tag");
  }
  return tag;
};

const imageRef = (image: string, tag: string) => {
  const trimmed = image.trim().replace(/^docker\.io\//, "");
  const withoutTag = trimmed.includes(":") ? trimmed.split(":")[0] : trimmed;
  return `${withoutTag}:${tag}`;
};

const userCanAccessApp = (user: User, app: { userId: string }) =>
  user.role === "admin" || app.userId === user.id;

const progressEntry = (message: string) => `${new Date().toLocaleTimeString()} ${message}`;

const createInstallProgress = (
  stage: InstallProgressStage,
  percent: number,
  message: string,
  logs: string[] = []
): InstallProgress => ({
  stage,
  percent,
  message,
  logs: [...logs, progressEntry(message)].slice(-100),
  updatedAt: new Date().toISOString(),
});

export class AppsService {
  constructor(private prisma: PrismaClient) {}

  async dockerStatus() {
    return dockerEngineService.getStatus();
  }

  async marketplace(params: {
    search?: string;
    page?: number;
    pageSize?: number;
    filter?: "all" | "official" | "verified" | "popular" | "recent";
  }) {
    return dockerHubService.search({
      query: params.search || "",
      page: params.page,
      pageSize: params.pageSize,
      filter: params.filter || "all",
    });
  }

  async marketplaceDetails(namespace: string, repository: string) {
    return dockerHubService.getDetails(namespace, repository);
  }

  async analyzeImage(input: { image: string; tag?: string; pull?: boolean }) {
    const tag = safeTag(input.tag);
    const details = await dockerHubService.assertRepositoryExists(input.image);
    const fullImage = imageRef(details.image, tag);
    await dockerEngineService.ensureAvailable();

    if (input.pull) {
      await dockerEngineService.pullImage(fullImage);
    }

    try {
      const analysis = await dockerEngineService.analyzeImage(fullImage);
      return {
        ...analysis,
        marketplace: details,
        securityWarnings: dockerEngineService.scanSecurity({}),
      };
    } catch (error: any) {
      if (!input.pull) {
        return {
          image: fullImage,
          exposedPorts: [],
          suggestedPorts: [],
          volumes: [],
          environment: [],
          labels: {},
          entrypoint: [],
          command: [],
          user: null,
          healthcheck: false,
          warnings: [
            "Image analysis requires the image to be pulled locally. Continue installation to pull and inspect it.",
          ],
          marketplace: details,
          securityWarnings: [],
        } satisfies DockerImageAnalysis & { marketplace: unknown; securityWarnings: string[] };
      }
      throw error;
    }
  }

  async installFromDockerHub(user: User, input: InstallDockerHubAppInput) {
    const tag = safeTag(input.tag);
    const details = await dockerHubService.assertRepositoryExists(input.image);
    const fullImage = imageRef(details.image, tag);
    await dockerEngineService.ensureAvailable();

    const securityWarnings = dockerEngineService.scanSecurity({
      networkMode: input.networkMode,
      privileged: input.privileged,
      volumes: [...(input.volumes || []), ...(input.storageMappings || [])],
    });

    const appName = input.name?.trim() || details.name;
    const composeProject = dockerEngineService.createComposeProjectName(appName);
    const workspacePath = path.join(dockerEngineService.getAppsRoot(), composeProject);
    const composePath = path.join(workspacePath, "docker-compose.yml");
    const storageMappings = (input.storageMappings || []).map((mapping) => ({
      ...mapping,
      mode: (mapping.mode === "ro" ? "ro" : "rw") as "ro" | "rw",
      status: "pending-materialized-storage",
    }));

    const record = await this.prisma.installedApp.create({
      data: {
        userId: user.id,
        slug: details.repository,
        name: appName,
        description: details.description,
        icon: details.logoUrl || null,
        category: details.categories[0] || "Docker Hub",
        source: "docker-hub",
        status: "installing",
        composeProject,
        composePath,
        workspacePath,
        appUrl: null,
        image: fullImage,
        version: tag,
        ports: json(input.ports?.length ? dockerEngineService.normalizePorts(input.ports) : []),
        mounts: json({ appVolumes: [], storageMappings }),
        env: json(dockerEngineService.normalizeEnvironment(input.environment)),
        metadata: json({
          marketplace: details,
          analysis: null,
          securityWarnings,
          dockerHubOnly: true,
          installProgress: createInstallProgress(
            "queued",
            3,
            "Installation queued. Preparing Docker workspace."
          ),
        }),
      },
    });

    void this.runDockerHubInstallWorkflow(record.id, input, {
      tag,
      details,
      fullImage,
      appName,
      composeProject,
      workspacePath,
      composePath,
      securityWarnings,
      storageMappings,
    });

    return this.hydrateApp(record, {
      status: "installing",
      appUrl: null,
      containers: [],
      stats: null,
    });
  }

  async listInstalled(user: User) {
    const records = await this.prisma.installedApp.findMany({
      where: user.role === "admin" ? {} : { userId: user.id },
      orderBy: { installedAt: "desc" },
    });

    return Promise.all(records.map((record) => this.hydrateApp(record)));
  }

  async getInstalled(user: User, appId: string) {
    const record = await this.prisma.installedApp.findUnique({ where: { id: appId } });
    if (!record) throw new NotFoundError("Installed app not found");
    if (!userCanAccessApp(user, record)) throw new ForbiddenError("App access denied");
    return this.hydrateApp(record);
  }

  async action(user: User, appId: string, action: "start" | "stop" | "restart" | "update" | "remove") {
    const record = await this.prisma.installedApp.findUnique({ where: { id: appId } });
    if (!record) throw new NotFoundError("Installed app not found");
    if (!userCanAccessApp(user, record)) throw new ForbiddenError("App access denied");

    if (action === "remove") {
      await dockerEngineService.composeRemove(record.composePath, record.composeProject).catch(() => {});
      await fs.rm(record.workspacePath, { recursive: true, force: true }).catch(() => {});
      await this.prisma.installedApp.delete({ where: { id: record.id } });
      return { removed: true };
    }

    try {
      if (action === "update") {
        await dockerEngineService.composePull(record.composePath, record.composeProject);
      } else {
        await dockerEngineService.composeAction(record.composePath, record.composeProject, action);
      }

      const runtime = await dockerEngineService.getAppRuntime(record.composePath, record.composeProject);
      const updated = await this.prisma.installedApp.update({
        where: { id: record.id },
        data: {
          status: runtime.status,
          appUrl: runtime.appUrl,
          lastError: null,
        },
      });

      return this.hydrateApp(updated, runtime);
    } catch (error: any) {
      const updated = await this.prisma.installedApp.update({
        where: { id: record.id },
        data: {
          status: "error",
          lastError: error?.message || `${action} failed`,
        },
      });
      return this.hydrateApp(updated);
    }
  }

  async logs(user: User, appId: string, tail?: number) {
    const record = await this.prisma.installedApp.findUnique({ where: { id: appId } });
    if (!record) throw new NotFoundError("Installed app not found");
    if (!userCanAccessApp(user, record)) throw new ForbiddenError("App access denied");

    const metadata = parseJson<any>(record.metadata, {});
    const progressLogs = metadata.installProgress?.logs;
    try {
      await fs.access(record.composePath);
    } catch {
      return { logs: Array.isArray(progressLogs) ? progressLogs.join("\n") : "" };
    }

    const logs = await dockerEngineService.composeLogs(record.composePath, record.composeProject, tail);
    const prefix = Array.isArray(progressLogs) && progressLogs.length ? `${progressLogs.join("\n")}\n\n` : "";
    return { logs: `${prefix}${logs}` };
  }

  private async runDockerHubInstallWorkflow(
    appId: string,
    input: InstallDockerHubAppInput,
    context: {
      tag: string;
      details: any;
      fullImage: string;
      appName: string;
      composeProject: string;
      workspacePath: string;
      composePath: string;
      securityWarnings: string[];
      storageMappings: Array<VolumeMapping & { status: string }>;
    }
  ) {
    try {
      await this.setInstallProgress(appId, "pulling", 12, `Pulling ${context.fullImage} from Docker Hub.`);
      await dockerEngineService.pullImage(context.fullImage);

      await this.setInstallProgress(appId, "analyzing", 42, "Image pulled. Inspecting ports, volumes, environment, and safety hints.");
      const analysis = await dockerEngineService.analyzeImage(context.fullImage);

      const requestedPorts = input.ports?.length
        ? dockerEngineService.normalizePorts(input.ports)
        : analysis.suggestedPorts;
      const requestedEnvironment = dockerEngineService.normalizeEnvironment(input.environment);
      const appVolumes = dockerEngineService.normalizeVolumes(context.workspacePath, [
        ...(analysis.volumes || []),
        ...(input.volumes || []),
      ]);

      await this.updateInstallMetadata(appId, {
        marketplace: context.details,
        analysis,
        securityWarnings: context.securityWarnings,
        dockerHubOnly: true,
      });

      await this.prisma.installedApp.update({
        where: { id: appId },
        data: {
          ports: json(requestedPorts),
          mounts: json({ appVolumes, storageMappings: context.storageMappings }),
          env: json(requestedEnvironment),
          lastError: null,
        },
      });

      const composeConfig = {
        image: context.fullImage,
        appName: context.appName,
        composeProject: context.composeProject,
        workspacePath: context.workspacePath,
        composePath: context.composePath,
        ports: requestedPorts,
        volumes: appVolumes,
        environment: requestedEnvironment,
        restartPolicy: input.restartPolicy || "unless-stopped",
        networkMode: input.networkMode,
        privileged: input.privileged,
      };

      await this.setInstallProgress(appId, "writing-compose", 62, "Writing the managed Docker Compose file.");
      await dockerEngineService.writeComposeFile(composeConfig);

      await this.setInstallProgress(appId, "starting", 78, "Starting containers and waiting for Docker to report runtime state.");
      await dockerEngineService.composeUp(context.composePath, context.composeProject);
      const runtime = await dockerEngineService.getAppRuntime(context.composePath, context.composeProject);

      await this.prisma.installedApp.update({
        where: { id: appId },
        data: {
          status: runtime.status,
          appUrl: runtime.appUrl,
          lastError: null,
        },
      });
      await this.setInstallProgress(
        appId,
        "running",
        100,
        runtime.status === "running" ? "App is running. Live stats are available." : "Install finished, but the app is not running yet."
      );
    } catch (error: any) {
      const message = error?.message || "Installation failed";
      await this.prisma.installedApp
        .update({
          where: { id: appId },
          data: {
            status: "error",
            lastError: message,
          },
        })
        .catch(() => {});
      await this.setInstallProgress(appId, "error", 100, message).catch(() => {});
    }
  }

  private async setInstallProgress(
    appId: string,
    stage: InstallProgressStage,
    percent: number,
    message: string
  ) {
    const record = await this.prisma.installedApp.findUnique({
      where: { id: appId },
      select: { metadata: true },
    });
    if (!record) return;

    const metadata = parseJson<any>(record.metadata, {});
    const previous = metadata.installProgress || {};
    const previousLogs = Array.isArray(previous.logs) ? previous.logs : [];

    metadata.installProgress = createInstallProgress(stage, percent, message, previousLogs);

    await this.prisma.installedApp.update({
      where: { id: appId },
      data: { metadata: json(metadata) },
    });
  }

  private async updateInstallMetadata(appId: string, patch: Record<string, unknown>) {
    const record = await this.prisma.installedApp.findUnique({
      where: { id: appId },
      select: { metadata: true },
    });
    if (!record) return;

    const metadata = parseJson<any>(record.metadata, {});
    await this.prisma.installedApp.update({
      where: { id: appId },
      data: { metadata: json({ ...metadata, ...patch }) },
    });
  }

  private async hydrateApp(record: any, providedRuntime?: any) {
    let runtime = providedRuntime || null;
    if (!runtime) {
      try {
        const status = await dockerEngineService.getStatus();
        if (status.available) {
          runtime = await dockerEngineService.getAppRuntime(record.composePath, record.composeProject);
          if (runtime.status !== record.status || runtime.appUrl !== record.appUrl) {
            await this.prisma.installedApp.update({
              where: { id: record.id },
              data: {
                status: runtime.status,
                appUrl: runtime.appUrl,
              },
            });
          }
        }
      } catch {
        runtime = null;
      }
    }

    const metadata = parseJson<any>(record.metadata, {});

    return {
      id: record.id,
      userId: record.userId,
      slug: record.slug,
      name: record.name,
      description: record.description,
      icon: record.icon || metadata.marketplace?.logoUrl || null,
      category: record.category,
      source: record.source,
      status: runtime?.status || record.status,
      composeProject: record.composeProject,
      appUrl: runtime ? runtime.appUrl : record.appUrl,
      image: record.image,
      version: record.version,
      ports: parseJson(record.ports, []),
      mounts: parseJson(record.mounts, {}),
      environment: parseJson(record.env, {}),
      metadata,
      lastError: record.lastError,
      installedAt: record.installedAt,
      updatedAt: record.updatedAt,
      runtime,
    };
  }
}
