import { Response } from "express";
import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../types";
import { LoginInput, RegisterInput } from "../utils/validators";
import { BadRequestError } from "../utils/errors";

export class AuthController {
  constructor(private authService: AuthService) {}

  register = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const data: RegisterInput = req.body;
    const tokens = await this.authService.register(data);

    res.status(201).json({
      success: true,
      data: tokens,
      message: "Registration successful",
    });
  };

  login = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const data: LoginInput = req.body;
    const tokens = await this.authService.login(data);

    res.status(200).json({
      success: true,
      data: tokens,
      message: "Login successful",
    });
  };

  refresh = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError("Refresh token is required");
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens,
      message: "Token refreshed successfully",
    });
  };

  logout = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const { refreshToken } = req.body;

    if (refreshToken) {
      await this.authService.logout(userId, refreshToken);
    }

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  };

  me = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const user = await this.authService.getMe(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  };
}
