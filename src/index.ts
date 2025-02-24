import Fastify from "fastify";
import prismaPlugin from "@/plugins/prisma";
import rootRoutes from "@/routes/index";
import { checkRoutes } from "@/routes/check";
import websitesRoutes from "@/routes/websites";
import { createWorker, schedulePeriodicChecks } from "@/queues/check";
import env from "@fastify/env";

const schema = {
  type: "object",
  required: ["DATABASE_URL"],
  properties: {
    DATABASE_URL: { type: "string" },
    PORT: { type: "number", default: 3000 },
    START_PERIODIC_CHECKS: { type: "boolean", default: true },
    MINUTES_BETWEEN_CHECKS: { type: "number", default: 5 }
  }
};

const options = {
  confKey: "config",
  schema,
  dotenv: true
};

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

declare module "fastify" {
  interface FastifyInstance {
    config: {
      DATABASE_URL: string;
      PORT: number;
      START_PERIODIC_CHECKS: boolean;
      MINUTES_BETWEEN_CHECKS: number;
    };
  }
}

app.register(env, options).ready((err) => {
  if (err) console.error(err);
  console.log("Loaded ENV:", app.config);
}); 

app.register(prismaPlugin);

app.register(rootRoutes);
app.register(checkRoutes);
app.register(websitesRoutes);

app.ready(() => {
  createWorker(app);
  if (app.config.START_PERIODIC_CHECKS) {
    schedulePeriodicChecks(app);
  }

  // console.log("Loaded ENV:", app.config);

  app.listen({ port: app.config.PORT }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`Server is running on ${address}!`);
  });
});
