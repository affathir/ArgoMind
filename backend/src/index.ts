// =============================================================================
//  AgriMind Backend – Server entry point
// =============================================================================
import { createApp }    from "./app";
import { env }          from "./config/env";
import { logger }       from "./config/logger";
import { prisma }       from "./services/dbService";

async function main() {
  const app = createApp();

  // Verify DB connection before accepting traffic
  await prisma.$connect();
  logger.info("✅  Database connected");

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀  AgriMind backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully…`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Database disconnected. Bye!");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
