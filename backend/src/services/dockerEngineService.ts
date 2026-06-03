import { execFile, spawn } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import net from "net";
import path from "path";
import { promisify } from "util";
import { config } from "../config";
import { BadRequestError } from "../utils/errors";
import { getLanConnectionHosts } from "../utils/network";

const execFileAsync = promisify(execFile);

const DOCKER_TIMEOUT_MS = 120_000;
const DOCKER_PULL_TIMEOUT_MS = 15 * 60_000;
const LOG_TAIL_LINES = 500;
const PREFERRED_WEB_PORTS = [80, 443, 3000, 5000, 8000, 8080, 8096, 9000];
const DOCKER_EXECUTABLE = process.platform === "win32" ? "docker.exe" : "docker";
const DOCKER_DESKTOP_START_COOLDOWN_MS = 30_000;
const DOCKER_DESKTOP_READY_TIMEOUT_MS = 120_000;
const DOCKER_DESKTOP_POLL_MS = 2_000;

export interface DockerStatus {
  available: boolean;
  dockerCli: boolean;
  daemon: boolean;
  compose: boolean;
  dockerVersion: string | null;
  composeVersion: string | null;
  mode: "native" | "container" | "unknown";
  guidance: string[];
  error?: string;
}

export interface PortMapping {
  hostPort?: number | null;
  containerPort: number;
  protocol?: "tcp" | "udp";
}

export interface VolumeMapping {
  hostPath?: string;
  containerPath: string;
  mode?: "ro" | "rw";
  folderId?: string;
  folderName?: string;
}

export interface DockerImageAnalysis {
  image: string;
  exposedPorts: PortMapping[];
  suggestedPorts: PortMapping[];
  volumes: VolumeMapping[];
  environment: Array<{ key: string; value: string; fromImage: boolean }>;
  labels: Record<string, string>;
  entrypoint: string[];
  command: string[];
  user: string | null;
  healthcheck: boolean;
  warnings: string[];
}

export interface ComposeInstallConfig {
  image: string;
  appName: string;
  composeProject: string;
  workspacePath: string;
  composePath: string;
  ports: PortMapping[];
  volumes: VolumeMapping[];
  environment: Record<string, string>;
  restartPolicy: "unless-stopped" | "always" | "on-failure" | "no";
  networkMode?: string;
  privileged?: boolean;
}

interface RuntimePortMapping {
  containerPort: number;
  hostPort: number;
  protocol: "tcp" | "udp";
  hostIp: string;
  urls: string[];
}

const safeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "app";

const quoteYaml = (value: string | number | boolean) => JSON.stringify(String(value));

const splitDockerPort = (port: string): PortMapping | null => {
  const [numberPart, protocolPart] = port.split("/");
  const containerPort = Number.parseInt(numberPart, 10);
  if (!Number.isInteger(containerPort) || containerPort < 1 || containerPort > 65535) {
    return null;
  }
  return {
    containerPort,
    protocol: protocolPart === "udp" ? "udp" : "tcp",
  };
};

const ensureSafePort = (port: number | null | undefined) => {
  if (port == null) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new BadRequestError("Ports must be between 1 and 65535");
  }
  return port;
};

const isPortAvailable = (port: number) =>
  new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });

const getRandomPort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
    server.listen(0, "0.0.0.0");
  });

const parseJsonLines = <T>(value: string): T[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class DockerEngineService {
  private dockerExecutable: string | null = null;
  private lastDockerDesktopStartAt = 0;

  getAppsRoot() {
    const dataRoot = path.resolve(config.storageRoot, "..");
    return path.join(dataRoot, "apps");
  }

  createComposeProjectName(name: string) {
    return `nexxcloud-${safeName(name)}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 63);
  }

  async getStatus(): Promise<DockerStatus> {
    const guidance = [
      config.nativeRuntime && process.platform === "win32"
        ? "NexxCloud can start Docker Desktop automatically after the bundled installer finishes."
        : "Install Docker Desktop or Docker Engine on the NexxCloud server.",
      "Make sure the Docker daemon is running before installing apps.",
      "If NexxCloud runs in Docker, mount the host Docker socket only if you understand the security risk.",
    ];

    const dockerVersion = await this.tryDocker(["--version"]);
    if (!dockerVersion.ok) {
      return {
        available: false,
        dockerCli: false,
        daemon: false,
        compose: false,
        dockerVersion: null,
        composeVersion: null,
        mode: config.nativeRuntime ? "native" : "container",
        guidance,
        error: dockerVersion.error,
      };
    }

    const dockerInfo = await this.tryDocker(["info", "--format", "{{json .}}"]);
    const composeVersion = await this.tryDocker(["compose", "version", "--short"]);
    let startedDockerDesktop = false;

    if (!dockerInfo.ok && config.nativeRuntime && process.platform === "win32") {
      startedDockerDesktop = await this.startDockerDesktop();
    }

    return {
      available: dockerInfo.ok && composeVersion.ok,
      dockerCli: true,
      daemon: dockerInfo.ok,
      compose: composeVersion.ok,
      dockerVersion: dockerVersion.stdout.trim() || null,
      composeVersion: composeVersion.stdout.trim() || null,
      mode: config.nativeRuntime ? "native" : "container",
      guidance: startedDockerDesktop
        ? ["Docker Desktop was started automatically. Docker apps will become available once the daemon is ready.", ...guidance]
        : guidance,
      error: dockerInfo.ok ? undefined : dockerInfo.error,
    };
  }

  async ensureAvailable(timeoutMs = DOCKER_DESKTOP_READY_TIMEOUT_MS): Promise<DockerStatus> {
    const startedAt = Date.now();
    let status = await this.getStatus();

    if (status.available) return status;
    if (!status.dockerCli) {
      throw new BadRequestError("Docker Desktop is not installed or the Docker CLI could not be found");
    }

    while (Date.now() - startedAt < timeoutMs) {
      await delay(DOCKER_DESKTOP_POLL_MS);
      status = await this.getStatus();
      if (status.available) return status;
    }

    const reason = status.error ? `: ${status.error}` : "";
    throw new BadRequestError(`Docker Desktop was started, but the Docker daemon is not ready yet${reason}`);
  }

  async pullImage(image: string) {
    return this.runDocker(["pull", image], { timeout: DOCKER_PULL_TIMEOUT_MS });
  }

  async analyzeImage(image: string): Promise<DockerImageAnalysis> {
    const inspect = await this.inspectImage(image);
    const imageInfo = inspect[0] || {};
    const configInfo = imageInfo.Config || {};
    const exposedPorts = Object.keys(configInfo.ExposedPorts || {})
      .map(splitDockerPort)
      .filter((port): port is PortMapping => Boolean(port));

    const volumes = Object.keys(configInfo.Volumes || {}).map((containerPath) => ({
      containerPath,
      mode: "rw" as const,
    }));

    const environment = (configInfo.Env || [])
      .map((entry: string) => {
        const [key, ...rest] = entry.split("=");
        return { key, value: rest.join("="), fromImage: true };
      })
      .filter((entry: { key: string }) => Boolean(entry.key));

    const labels = configInfo.Labels || {};
    const user = typeof configInfo.User === "string" && configInfo.User.trim() ? configInfo.User : null;
    const suggestedPorts = await this.suggestPorts(exposedPorts);
    const warnings: string[] = [];

    if (!user || user === "0" || user === "root") {
      warnings.push("This image appears to run as root unless you configure a user.");
    }
    if (exposedPorts.length === 0) {
      warnings.push("Docker Hub did not expose default web ports for this image. You may need to add a port manually.");
    }

    return {
      image,
      exposedPorts,
      suggestedPorts,
      volumes,
      environment,
      labels,
      entrypoint: Array.isArray(configInfo.Entrypoint) ? configInfo.Entrypoint : [],
      command: Array.isArray(configInfo.Cmd) ? configInfo.Cmd : [],
      user,
      healthcheck: Boolean(configInfo.Healthcheck),
      warnings,
    };
  }

  async writeComposeFile(input: ComposeInstallConfig) {
    await fs.mkdir(input.workspacePath, { recursive: true });
    await fs.mkdir(path.join(input.workspacePath, "volumes"), { recursive: true });

    for (const volume of input.volumes) {
      if (volume.hostPath) {
        await fs.mkdir(volume.hostPath, { recursive: true });
      }
    }

    const compose = this.generateComposeYaml(input);
    await fs.writeFile(input.composePath, compose, "utf8");
    return compose;
  }

  async composeUp(composePath: string, composeProject: string) {
    return this.runDocker(["compose", "-p", composeProject, "-f", composePath, "up", "-d"], {
      timeout: DOCKER_PULL_TIMEOUT_MS,
    });
  }

  async composeAction(composePath: string, composeProject: string, action: "start" | "stop" | "restart") {
    return this.runDocker(["compose", "-p", composeProject, "-f", composePath, action], {
      timeout: DOCKER_TIMEOUT_MS,
    });
  }

  async composeRemove(composePath: string, composeProject: string) {
    return this.runDocker(["compose", "-p", composeProject, "-f", composePath, "down", "--remove-orphans"], {
      timeout: DOCKER_TIMEOUT_MS,
    });
  }

  async composePull(composePath: string, composeProject: string) {
    await this.runDocker(["compose", "-p", composeProject, "-f", composePath, "pull"], {
      timeout: DOCKER_PULL_TIMEOUT_MS,
    });
    return this.composeUp(composePath, composeProject);
  }

  async composeLogs(composePath: string, composeProject: string, tail = LOG_TAIL_LINES) {
    const result = await this.runDocker([
      "compose",
      "-p",
      composeProject,
      "-f",
      composePath,
      "logs",
      "--tail",
      String(Math.min(Math.max(tail, 1), 2000)),
    ]);
    return result.stdout || result.stderr;
  }

  async getComposeContainers(composePath: string, composeProject: string) {
    const result = await this.runDocker([
      "compose",
      "-p",
      composeProject,
      "-f",
      composePath,
      "ps",
      "-q",
    ]);

    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  async getAppRuntime(composePath: string, composeProject: string) {
    const containers = await this.getComposeContainers(composePath, composeProject);
    if (containers.length === 0) {
      return {
        status: "stopped",
        appUrl: null,
        containers: [],
        stats: null,
      };
    }

    const inspect = await this.inspectContainers(containers);
    const status = this.detectRuntimeStatus(inspect);
    const portMappings = this.detectPortMappings(inspect);
    const appUrl = this.detectAppUrl(portMappings);
    const stats = await this.getStats(containers).catch(() => null);

    return {
      status,
      appUrl,
      containers: inspect.map((item) => ({
        id: item.Id,
        name: String(item.Name || "").replace(/^\//, ""),
        image: item.Config?.Image || null,
        status: item.State?.Status || "unknown",
        startedAt: item.State?.StartedAt || null,
        ports: item.NetworkSettings?.Ports || {},
        portMappings: this.detectPortMappings([item]),
      })),
      portMappings,
      connectionUrls: portMappings.flatMap((mapping) => mapping.urls),
      stats,
    };
  }

  private detectRuntimeStatus(containers: any[]) {
    if (containers.length === 0) return "stopped";

    if (containers.some((item) => item.State?.Dead || item.State?.OOMKilled)) {
      return "error";
    }

    if (containers.some((item) => item.State?.Restarting || item.State?.Status === "restarting")) {
      return "restarting";
    }

    if (containers.some((item) => item.State?.Status === "running")) {
      return "running";
    }

    if (containers.some((item) => item.State?.Status === "exited" && item.State?.ExitCode !== 0)) {
      return "error";
    }

    if (containers.every((item) => ["created", "exited", "stopped"].includes(item.State?.Status))) {
      return "stopped";
    }

    return String(containers[0]?.State?.Status || "unknown");
  }

  normalizePorts(ports: PortMapping[]) {
    return ports.map((port) => ({
      containerPort: ensureSafePort(port.containerPort)!,
      hostPort: ensureSafePort(port.hostPort),
      protocol: (port.protocol === "udp" ? "udp" : "tcp") as "tcp" | "udp",
    }));
  }

  normalizeEnvironment(env: Record<string, string> | undefined) {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(env || {})) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        throw new BadRequestError(`Invalid environment variable name: ${key}`);
      }
      normalized[key] = String(value);
    }
    return normalized;
  }

  normalizeVolumes(workspacePath: string, volumes: VolumeMapping[]) {
    return volumes.map((volume) => {
      if (!volume.containerPath.startsWith("/")) {
        throw new BadRequestError("Container volume paths must be absolute");
      }

      const hostPath =
        volume.hostPath ||
        path.join(workspacePath, "volumes", safeName(volume.containerPath.replace(/\//g, "-")));

      return {
        ...volume,
        hostPath,
        mode: (volume.mode === "ro" ? "ro" : "rw") as "ro" | "rw",
      };
    });
  }

  scanSecurity(input: {
    networkMode?: string;
    privileged?: boolean;
    volumes?: VolumeMapping[];
    capabilities?: string[];
  }) {
    const warnings: string[] = [];
    if (input.privileged) {
      warnings.push("Privileged containers can control host devices and should be installed only from trusted publishers.");
    }
    if (input.networkMode === "host") {
      warnings.push("Host networking exposes the container directly on the server network.");
    }
    if ((input.capabilities || []).length > 0) {
      warnings.push("Extra Linux capabilities increase container privileges.");
    }
    for (const volume of input.volumes || []) {
      if (volume.hostPath?.replace(/\\/g, "/").endsWith("/var/run/docker.sock")) {
        warnings.push("Mounting docker.sock gives the app control over Docker on the host.");
      }
    }
    return warnings;
  }

  private async inspectImage(image: string): Promise<any[]> {
    const result = await this.runDocker(["image", "inspect", image]);
    return JSON.parse(result.stdout);
  }

  private async inspectContainers(containerIds: string[]): Promise<any[]> {
    const result = await this.runDocker(["inspect", ...containerIds]);
    return JSON.parse(result.stdout);
  }

  private async getStats(containerIds: string[]) {
    if (containerIds.length === 0) return null;
    const result = await this.runDocker(["stats", "--no-stream", "--format", "{{json .}}", ...containerIds], {
      timeout: DOCKER_TIMEOUT_MS,
    });
    const rows = parseJsonLines<any>(result.stdout);
    return rows.map((row) => ({
      name: row.Name || row.Container || "container",
      cpu: row.CPUPerc || null,
      memory: row.MemUsage || null,
      memoryPercent: row.MemPerc || null,
      network: row.NetIO || null,
      block: row.BlockIO || null,
    }));
  }

  private detectPortMappings(containers: any[]): RuntimePortMapping[] {
    const mappings: RuntimePortMapping[] = [];
    for (const container of containers) {
      const ports = container.NetworkSettings?.Ports || {};
      for (const [containerPortKey, bindings] of Object.entries(ports)) {
        if (!Array.isArray(bindings) || bindings.length === 0) continue;
        const parsed = splitDockerPort(containerPortKey);
        if (!parsed) continue;

        for (const binding of bindings as any[]) {
          const hostPort = Number.parseInt(String(binding.HostPort), 10);
          if (!Number.isInteger(hostPort)) continue;
          const hostIp = String(binding.HostIp || "0.0.0.0");
          const protocol = parsed.protocol || "tcp";
          mappings.push({
            containerPort: parsed.containerPort,
            hostPort,
            hostIp,
            protocol,
            urls: protocol === "tcp" ? this.buildConnectionUrls(parsed.containerPort, hostPort, hostIp) : [],
          });
        }
      }
    }

    const seen = new Set<string>();
    return mappings.filter((mapping) => {
      const key = `${mapping.hostIp}:${mapping.hostPort}:${mapping.containerPort}/${mapping.protocol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private buildConnectionUrls(containerPort: number, hostPort: number, hostIp: string) {
    const scheme = containerPort === 443 ? "https" : "http";
    const bindingHosts =
      hostIp === "0.0.0.0" || hostIp === "::" || hostIp === ""
        ? getLanConnectionHosts()
        : [hostIp, "localhost"];

    return [...new Set(bindingHosts)]
      .filter((host) => host && host !== "0.0.0.0" && host !== "::")
      .map((host) => `${scheme}://${host}:${hostPort}`);
  }

  private detectAppUrl(portMappings: RuntimePortMapping[]) {
    const candidates = portMappings.filter((mapping) => mapping.protocol !== "udp" && mapping.urls.length > 0);
    if (candidates.length === 0) return null;
    const preferred = candidates.find((candidate) => PREFERRED_WEB_PORTS.includes(candidate.containerPort)) || candidates[0];
    return preferred.urls[0] || null;
  }

  private async suggestPorts(exposedPorts: PortMapping[]) {
    const suggested: PortMapping[] = [];
    for (const port of exposedPorts.filter((item) => item.protocol !== "udp")) {
      const preferredHostPort = PREFERRED_WEB_PORTS.includes(port.containerPort) ? port.containerPort : null;
      let hostPort: number | null = null;
      if (preferredHostPort && (await isPortAvailable(preferredHostPort))) {
        hostPort = preferredHostPort;
      } else if (preferredHostPort) {
        hostPort = await getRandomPort();
      }
      suggested.push({ ...port, hostPort });
    }
    return suggested;
  }

  private generateComposeYaml(input: ComposeInstallConfig) {
    const lines = [
      "services:",
      "  app:",
      `    image: ${quoteYaml(input.image)}`,
      `    container_name: ${quoteYaml(input.composeProject)}`,
      `    restart: ${quoteYaml(input.restartPolicy)}`,
    ];

    if (input.networkMode) {
      lines.push(`    network_mode: ${quoteYaml(input.networkMode)}`);
    }
    if (input.privileged) {
      lines.push("    privileged: true");
    }
    if (input.ports.length > 0) {
      lines.push("    ports:");
      input.ports.forEach((port) => {
        const protocol = port.protocol || "tcp";
        const container = `${port.containerPort}${protocol === "udp" ? "/udp" : ""}`;
        const host = port.hostPort ? `${port.hostPort}:` : "";
        lines.push(`      - ${quoteYaml(`${host}${container}`)}`);
      });
    }
    if (Object.keys(input.environment).length > 0) {
      lines.push("    environment:");
      Object.entries(input.environment).forEach(([key, value]) => {
        lines.push(`      ${key}: ${quoteYaml(value)}`);
      });
    }
    if (input.volumes.length > 0) {
      lines.push("    volumes:");
      input.volumes.forEach((volume) => {
        const mode = volume.mode || "rw";
        const hostPath = path.relative(input.workspacePath, volume.hostPath || input.workspacePath).replace(/\\/g, "/");
        const normalizedHost = hostPath.startsWith(".") ? hostPath : `./${hostPath}`;
        lines.push(`      - ${quoteYaml(`${normalizedHost}:${volume.containerPath}:${mode}`)}`);
      });
    }

    lines.push("");
    return lines.join("\n");
  }

  private async tryDocker(args: string[]) {
    try {
      const result = await this.runDocker(args);
      return { ok: true, stdout: result.stdout, stderr: result.stderr };
    } catch (error: any) {
      return {
        ok: false,
        stdout: "",
        stderr: "",
        error: error?.message || "Docker command failed",
      };
    }
  }

  private async runDocker(args: string[], options?: { timeout?: number }) {
    const executable = await this.resolveDockerExecutable();
    const env = { ...process.env };
    if (executable !== DOCKER_EXECUTABLE) {
      env.PATH = `${path.dirname(executable)}${path.delimiter}${env.PATH || ""}`;
    }

    try {
      return await execFileAsync(executable, args, {
        timeout: options?.timeout || DOCKER_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 20,
        env,
        windowsHide: true,
      });
    } catch (error: any) {
      const stderr = error?.stderr ? String(error.stderr).trim() : "";
      const stdout = error?.stdout ? String(error.stdout).trim() : "";
      throw new BadRequestError(stderr || stdout || error?.message || "Docker command failed");
    }
  }

  private async resolveDockerExecutable() {
    if (this.dockerExecutable && await this.fileExists(this.dockerExecutable)) {
      return this.dockerExecutable;
    }

    for (const candidate of this.dockerExecutableCandidates()) {
      if (candidate && await this.fileExists(candidate)) {
        this.dockerExecutable = candidate;
        return candidate;
      }
    }

    return DOCKER_EXECUTABLE;
  }

  private dockerExecutableCandidates() {
    const candidates = [process.env.DOCKER_CLI_PATH || ""];

    if (process.platform === "win32") {
      const localAppData = process.env.LOCALAPPDATA || "";
      const programFiles = process.env.ProgramFiles || process.env.PROGRAMFILES || "";
      const programFilesX86 = process.env["ProgramFiles(x86)"] || process.env["PROGRAMFILES(X86)"] || "";

      candidates.push(
        path.join(localAppData, "Programs", "DockerDesktop", "resources", "bin", "docker.exe"),
        path.join(localAppData, "Programs", "Docker", "Docker", "resources", "bin", "docker.exe"),
        path.join(programFiles, "Docker", "Docker", "resources", "bin", "docker.exe"),
        path.join(programFilesX86, "Docker", "Docker", "resources", "bin", "docker.exe")
      );
    } else {
      candidates.push("/usr/local/bin/docker", "/usr/bin/docker", "/snap/bin/docker");
    }

    return [...new Set(candidates.filter(Boolean))];
  }

  private async startDockerDesktop() {
    if (!config.nativeRuntime || process.platform !== "win32") return false;

    const now = Date.now();
    if (now - this.lastDockerDesktopStartAt < DOCKER_DESKTOP_START_COOLDOWN_MS) {
      return false;
    }

    const executable = await this.resolveDockerDesktopExecutable();
    if (!executable) return false;

    try {
      const child = spawn(executable, [], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
      this.lastDockerDesktopStartAt = now;
      return true;
    } catch {
      return false;
    }
  }

  private async resolveDockerDesktopExecutable() {
    for (const candidate of this.dockerDesktopExecutableCandidates()) {
      if (candidate && await this.fileExists(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private dockerDesktopExecutableCandidates() {
    if (process.platform !== "win32") return [];

    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || process.env.PROGRAMFILES || "";
    const programW6432 = process.env.ProgramW6432 || process.env.PROGRAMW6432 || "";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || process.env["PROGRAMFILES(X86)"] || "";

    return [...new Set([
      path.join(localAppData, "Programs", "DockerDesktop", "Docker Desktop.exe"),
      path.join(localAppData, "Programs", "Docker", "Docker", "Docker Desktop.exe"),
      path.join(programFiles, "Docker", "Docker", "Docker Desktop.exe"),
      path.join(programW6432, "Docker", "Docker", "Docker Desktop.exe"),
      path.join(programFilesX86, "Docker", "Docker", "Docker Desktop.exe"),
    ].filter(Boolean))];
  }

  private async fileExists(filePath: string) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const dockerEngineService = new DockerEngineService();
