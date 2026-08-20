require("./observability/tracing");

const http = require("http");

const app = require("./app");
const env = require("./config/env");
const { logger } = require("./observability/logger");
const { shutdownTracing } = require("./observability/tracing");
const { initSocketServer } = require("./sockets");

const server = http.createServer(app);

initSocketServer(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "EventFlow AI backend listening");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    logger.info({ signal }, "EventFlow AI backend shutdown requested");
    await shutdownTracing().catch((error) => logger.error({ error }, "OpenTelemetry shutdown failed"));
    process.exit(0);
  });
}
