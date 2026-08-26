import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` (Vercel install/build) must not require a live database.
// Runtime still uses process.env.DATABASE_URL in lib/db/prisma.ts.
const datasourceUrl =
  process.env.DATABASE_URL?.trim() || "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
