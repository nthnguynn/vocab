import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Cache theo class PrismaClient: khi chạy `prisma generate` lúc dev server đang chạy,
// class mới được nạp lại và client cũ (schema cũ) sẽ được thay thế thay vì dùng tiếp.
const globalForPrisma = globalThis as unknown as {
  prismaCache?: { client: PrismaClient; ctor: typeof PrismaClient };
};

function createClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

const previous = globalForPrisma.prismaCache;
const cached = previous?.ctor === PrismaClient ? previous.client : undefined;
if (previous && !cached) void previous.client.$disconnect();

export const prisma = cached ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaCache = { client: prisma, ctor: PrismaClient };
