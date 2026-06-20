import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { UserRepository } from "../repositories/UserRepository";
import { config } from "../config";
import { TokenPayload } from "../types";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { LoginInput, RegisterInput } from "../utils/validators";

export class AuthService {
  private userRepository: UserRepository;

  constructor(private prisma: PrismaClient) {
    this.userRepository = new UserRepository(prisma);
  }

  private generateTokens(user: { id: string; username: string; email: string }) {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration as any,
    });

    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiration as any,
    });

    return { accessToken, refreshToken };
  }

  async register(data: RegisterInput) {
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new BadRequestError("Email is already registered");
    }

    const existingUsername = await this.userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new BadRequestError("Username is already taken");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.userRepository.create({
      username: data.username,
      email: data.email,
      passwordHash,
      storageQuota: config.defaultStorageQuota,
    });

    const tokens = this.generateTokens(user);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(data: LoginInput) {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const tokens = this.generateTokens(user);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const tokens = this.generateTokens(record.user);

    // Rotate refresh token: delete old, save new
    await this.prisma.refreshToken.delete({ where: { id: record.id } });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: record.userId,
        expiresAt,
      },
    });

    return tokens;
  }

  async logout(userId: string, token: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        token,
        userId,
      },
    });
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      storageQuota: user.storageQuota.toString(),
      storageUsed: user.storageUsed.toString(),
      trashSize: user.trashSize.toString(),
      createdAt: user.createdAt,
    };
  }
}
