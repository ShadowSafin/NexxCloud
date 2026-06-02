import { Response } from "express";
import { AppsService } from "../services/appsService";
import { AuthenticatedRequest } from "../types";
import { BadRequestError, UnauthorizedError } from "../utils/errors";

const getUser = (req: AuthenticatedRequest) => {
  if (!req.user) throw new UnauthorizedError("Authentication required");
  return req.user;
};

const optionalNumber = (value: unknown) => {
  if (value == null) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export class AppsController {
  constructor(private appsService: AppsService) {}

  dockerStatus = async (_req: AuthenticatedRequest, res: Response) => {
    const status = await this.appsService.dockerStatus();
    res.json({ success: true, data: status });
  };

  marketplace = async (req: AuthenticatedRequest, res: Response) => {
    const data = await this.appsService.marketplace({
      search: typeof req.query.search === "string" ? req.query.search : "",
      page: optionalNumber(req.query.page),
      pageSize: optionalNumber(req.query.pageSize),
      filter:
        req.query.filter === "official" ||
        req.query.filter === "verified" ||
        req.query.filter === "popular" ||
        req.query.filter === "recent"
          ? req.query.filter
          : "all",
    });
    res.json({ success: true, data });
  };

  marketplaceDetails = async (req: AuthenticatedRequest, res: Response) => {
    const namespace = req.params.namespace;
    const repository = req.params.repository;
    if (!namespace || !repository) {
      throw new BadRequestError("Docker Hub namespace and repository are required");
    }
    const data = await this.appsService.marketplaceDetails(namespace, repository);
    res.json({ success: true, data });
  };

  analyze = async (req: AuthenticatedRequest, res: Response) => {
    const image = String(req.body?.image || "");
    if (!image) throw new BadRequestError("Docker image is required");
    const data = await this.appsService.analyzeImage({
      image,
      tag: req.body?.tag,
      pull: Boolean(req.body?.pull),
    });
    res.json({ success: true, data });
  };

  install = async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    const image = String(req.body?.image || "");
    if (!image) throw new BadRequestError("Docker image is required");

    const data = await this.appsService.installFromDockerHub(user, {
      image,
      tag: req.body?.tag,
      name: req.body?.name,
      ports: req.body?.ports,
      environment: req.body?.environment,
      volumes: req.body?.volumes,
      restartPolicy: req.body?.restartPolicy,
      networkMode: req.body?.networkMode,
      privileged: req.body?.privileged,
      storageMappings: req.body?.storageMappings,
    });
    res.status(201).json({ success: true, data });
  };

  installed = async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    const data = await this.appsService.listInstalled(user);
    res.json({ success: true, data });
  };

  installedById = async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    const data = await this.appsService.getInstalled(user, req.params.id);
    res.json({ success: true, data });
  };

  action = async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    const action = req.params.action;
    if (!["start", "stop", "restart", "update", "remove"].includes(action)) {
      throw new BadRequestError("Unsupported app action");
    }

    const data = await this.appsService.action(
      user,
      req.params.id,
      action as "start" | "stop" | "restart" | "update" | "remove"
    );
    res.json({ success: true, data });
  };

  logs = async (req: AuthenticatedRequest, res: Response) => {
    const user = getUser(req);
    const data = await this.appsService.logs(user, req.params.id, optionalNumber(req.query.tail));
    res.json({ success: true, data });
  };
}
