import Fastify from "fastify";
import prismaPlugin from "@/plugins/prisma";
import rootRoutes from "@/routes/index";
import { checkRoutes } from "@/routes/check";
import websitesRoutes from "@/routes/websites";
import { createWorker, schedulePeriodicChecks } from "@/queues/check";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true
      }
    }
  }
});

app.register(prismaPlugin);

app.register(rootRoutes);
app.register(checkRoutes);
app.register(websitesRoutes);

app.ready(() => {
  createWorker(app);
  schedulePeriodicChecks(app);
});

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`Server is running on ${address}!`);
});