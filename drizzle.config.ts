import { env } from "!/env";
import type { Config } from "drizzle-kit";

export default {
  schema: "./server/lib/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
