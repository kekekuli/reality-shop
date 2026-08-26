import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { hash, verify } from "@node-rs/argon2";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ErrorCode } from "../../common/errors/error-code";
import type { UserStatus } from "@reality-shop/shared-types";

const ACTIVE_STATUS = "active" satisfies UserStatus;

type SafeUser = {
  id: bigint;
  email: string;
  displayName: string;
};

export type RegisterResult =
  { ok: true; user: SafeUser } | { ok: false; code: ErrorCode };

export type LoginResult =
  | { ok: true; user: SafeUser }
  | { ok: false; code: ErrorCode.INVALID_CREDENTIALS };

@Injectable()
export class UserService {
  // Starts once with the service and gives unknown-email attempts the same
  // expensive Argon2 verification path as known-email attempts. The source
  // value is not a credential; only the encoded hash is used.
  private readonly dummyPasswordHash = hash(
    "dummy-password-never-used-for-login",
  );

  constructor(private readonly prisma: PrismaService) {}

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<RegisterResult> {
    email = email.trim().toLowerCase();
    const passwordHash = await hash(password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      });
      return {
        ok: true,
        user,
      };
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          return {
            ok: false,
            code: ErrorCode.EMAIL_ALREADY_TAKEN,
          };
        }
      }
      throw e;
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    email = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        status: true,
      },
    });

    const passwordHash = user?.passwordHash ?? (await this.dummyPasswordHash);
    const isValid = await verify(passwordHash, password);

    if (!user || user.status !== ACTIVE_STATUS || !isValid) {
      return {
        ok: false,
        code: ErrorCode.INVALID_CREDENTIALS,
      };
    }

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  async findActiveById(id: bigint): Promise<SafeUser | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        status: ACTIVE_STATUS,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });
  }
}
