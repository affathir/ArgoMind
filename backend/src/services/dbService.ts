// =============================================================================
//  Service – Prisma singleton (shared DB client)
// =============================================================================
import { PrismaClient } from "@prisma/client";
import { env }          from "../config/env";

declare global {
  // prevent hot-reload from creating multiple instances in development
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
