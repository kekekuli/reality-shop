import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { hash } from "@node-rs/argon2";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { ErrorCode } from "../../common/errors/error-code";

export type RegisterResult =
  | { ok: true; user: { id: bigint; email: string; displayName: string } }
  | { ok: false; code: ErrorCode };

@Injectable()
export class UserService {
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
}
