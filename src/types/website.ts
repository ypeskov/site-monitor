export type Website = {
    id: number;
    url: string;
    status?: number | string | null;
    lastCheckedAt?: Date | null;
    createdAt: Date;
  };