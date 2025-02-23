import { FastifyInstance } from "fastify";
import { Website } from "@/types";
import { monitorQueue } from "@/queues/check";

export async function checkRoutes(fastify: FastifyInstance) {
  const checkSchemaOneURL = {
    querystring: {
      type: "object",
      properties: {
        url: { type: "string", format: "uri" }
      },
      required: ["url"]
    }
  };

  fastify.get("/check", {
    schema: checkSchemaOneURL
  }, async (request, reply) => {
    const { url } = request.query as { url: string };

    try {
      const start = Date.now();
      const response = await fetch(url, { method: "GET", headers: { "User-Agent": "fastify-monitor" } });
      const time = Date.now() - start;

      return reply.send({
        url,
        status: response.status,
        time
      });
    } catch (error) {
      return reply.code(500).send({ error: "Failed to check site", details: (error as Error).message });
    }
  });


  fastify.get("/check/multiple", async (request, reply) => {
    const websites: Website[] = await fastify.prisma.website.findMany();

    const results = await Promise.all(websites.map(async (website) => {
      const start = Date.now();
      try {
        const response = await fetch(website.url, { method: "GET", headers: { "User-Agent": "fastify-monitor" } });
        const time = Date.now() - start;

        return {
          url: website.url,
          status: response.status,
          time
        };
      } catch (error) {
        return {
          url: website.url,
          status: (error as Error).message,
          time: Date.now() - start
        };
      }
    }));

    return reply.send(results);
  });

  fastify.get("/run/check-queue", async (request, reply) => {
    const websites = await fastify.prisma.website.findMany();

    await Promise.all(
      websites.map((website) =>
        monitorQueue.add("check-website", { url: website.url })
      )
    );

    return reply.send({ message: "Bulk check scheduled", count: websites.length });
  });
}