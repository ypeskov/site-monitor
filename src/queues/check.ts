import { Queue, Worker } from "bullmq";
import { FastifyInstance } from "fastify";
import IORedis from "ioredis";

const connection = new IORedis({
    maxRetriesPerRequest: null
});

export const monitorQueue = new Queue("monitorQueue", {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export function createWorker(fastify: FastifyInstance) {
    new Worker(
        "monitorQueue",
        async (job) => {
            console.log(`Checking website (attempt ${job.attemptsMade + 1}/${job.opts.attempts}):`, job.data);
            const { url } = job.data;
            const start = Date.now();

            try {
                const response = await fetch(url, { method: "GET", headers: { "User-Agent": "fastify-monitor" } });
                const time = Date.now() - start;

                await fastify.prisma.website.update({
                    where: { url },
                    data: { lastCheckedAt: new Date(), status: response.status.toString(), responseTime: time }
                });

                console.log(`Checked ${url}: ${response.status} (${time}ms)`);
            } catch (error) {
                console.error(`Error checking ${url} (attempt ${job.attemptsMade + 1}):`, error);

                if (job.attemptsMade + 1 === job.opts.attempts) {
                    await fastify.prisma.website.update({
                        where: { url },
                        data: { lastCheckedAt: new Date(), status: "error", responseTime: null }
                    });
                }

                throw error;
            }
        },
        { connection }
    );
}

export async function schedulePeriodicChecks(fastify: FastifyInstance) {
    const websites = await fastify.prisma.website.findMany();

    for (const site of websites) {
        monitorQueue.add(
            "check-website",
            { url: site.url },
            {
                jobId: `check-website-${site.url}`,
                repeat: { every: 5 * 60 * 1000 }, // Run every 5 minutes
            }
        );
    }

    console.log(`Scheduled periodic checks for ${websites.length} websites.`);
}