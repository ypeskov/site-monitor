import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { Website } from "@/types";

export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
    // Get all websites
    fastify.get("/websites", async (_request: FastifyRequest, reply: FastifyReply) => {
        const websites: Website[] = await fastify.prisma.website.findMany();
        return reply.send(websites);
    });

    // Add new website
    const websiteSchema = {
        body: {
            type: 'object',
            required: ['url'],
            properties: {
                url: {
                    type: 'string',
                    format: 'uri',
                    pattern: '^https?://'
                }
            }
        }
    };

    fastify.post("/websites",
        { schema: websiteSchema },
        async (request: FastifyRequest<{ Body: { url: string } }>, reply: FastifyReply) => {
            const { url } = request.body;

            try {
                const website: Website = await fastify.prisma.website.create({
                    data: {
                        url,
                        createdAt: new Date().toISOString()
                    }
                });
                return reply.status(201).send(website);
            } catch (error) {
                console.error(error);
                return reply.status(500).send({ error: "Failed to create website" });
            }
        });

    // Update website status
    fastify.put("/websites/:id", async (request: FastifyRequest<{ Params: { id: number }; Body: { status?: string; lastCheckedAt?: string } }>, reply: FastifyReply) => {
        const { id } = request.params;
        const { status, lastCheckedAt } = request.body;

        try {
            const website: Website = await fastify.prisma.website.update({
                where: { id },
                data: { status, lastCheckedAt: lastCheckedAt ? new Date(lastCheckedAt) : undefined },
            });
            return reply.send(website);
        } catch (error) {
            return reply.status(500).send({ error: "Failed to update website" });
        }
    });

    // Delete website
    fastify.delete("/websites/:id", async (request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) => {
        const { id } = request.params;

        try {
            await fastify.prisma.website.delete({ where: { id } });
            return reply.send({ message: "Website deleted" });
        } catch (error) {
            return reply.status(500).send({ error: "Failed to delete website" });
        }
    });
}