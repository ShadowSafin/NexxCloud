import { Request, Response } from "express";
import { config } from "../config";
import { getFrontendPort, getLanAddressInfo } from "../utils/network";

export class NetworkController {
  getStatus(req: Request, res: Response) {
    try {
      const { ips, primaryIp, hostname, machineHostname } = getLanAddressInfo();
      const frontendPort = getFrontendPort();
      const backendPort = config.port;

      const urls = [
        `http://${primaryIp}:${frontendPort}`,
        `http://${machineHostname}:${frontendPort}`
      ];

      res.json({
        success: true,
        data: {
          ips,
          primaryIp,
          hostname,
          machineHostname,
          port: backendPort,
          frontendPort,
          urls
        }
      });
    } catch (error) {
      console.error("[Network] Failed to get network status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch network status"
      });
    }
  }
}
