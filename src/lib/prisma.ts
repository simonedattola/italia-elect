import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.includes("localhost") || url.includes("127.0.0.1")) {
    throw new Error(
      "DATABASE_URL non valida su Vercel (manca o punta a localhost). " +
        "Imposta un Postgres cloud (Neon/Vercel Postgres) in Settings → Environment Variables, " +
        "poi Redeploy. Esempio: postgresql://user:pass@….neon.tech/neondb?sslmode=require",
    );
  }

  const pool =
    globalForPrisma.pgPool ??
    new pg.Pool({
      connectionString: url,
      // Vercel / serverless: connessioni brevi
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Lazy singleton — evita di aprire il pool durante `next build` senza DB. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma ?? createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    } else if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = client;
    }
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
