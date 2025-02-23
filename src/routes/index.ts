import { FastifyInstance } from "fastify";

export default async function rootRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    const websites = await fastify.prisma.website.findMany();
    return { message: "It is working!", websites };
  });
}