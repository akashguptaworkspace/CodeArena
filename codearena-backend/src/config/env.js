import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

// Every setting the server reads, validated once at startup so a missing or wrong value
// fails immediately with a clear message instead of breaking a request later.
const list = (value) =>
  (value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Browser origins allowed to call the API and connect to presence (comma-separated).
  CLIENT_ORIGINS: z.string().default("http://localhost:5173"),

  // Database
  DB_DIALECT: z.enum(["mysql", "sqlite"]).default("mysql"), // sqlite is for automated tests only
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_STORAGE: z.string().default(":memory:"),
  DB_LOGGING: z.enum(["true", "false"]).default("false"),

  // Google sign-in: the OAuth "Web application" client ID from Google Cloud Console.
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),

  // Tokens
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Refresh-token cookie. Use SameSite=none + secure when the API and site are on different domains.
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\nInvalid server configuration. Check codearena-backend/.env:\n${problems}\n`);
  process.exit(1);
}

const env = parsed.data;
const isProd = env.NODE_ENV === "production";

export const config = {
  env: env.NODE_ENV,
  isProd,
  isTest: env.NODE_ENV === "test",
  port: env.PORT,
  clientOrigins: list(env.CLIENT_ORIGINS),
  db: {
    dialect: env.DB_DIALECT,
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    storage: env.DB_STORAGE,
    logging: env.DB_LOGGING === "true",
  },
  google: { clientId: env.GOOGLE_CLIENT_ID },
  jwt: { accessSecret: env.JWT_ACCESS_SECRET, accessTtl: env.ACCESS_TOKEN_TTL },
  refresh: {
    ttlDays: env.REFRESH_TOKEN_TTL_DAYS,
    cookieName: "pg_refresh",
    cookie: {
      httpOnly: true,
      secure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProd,
      sameSite: env.COOKIE_SAMESITE,
      path: "/api/auth",
    },
  },
};

if (config.refresh.cookie.sameSite === "none" && !config.refresh.cookie.secure) {
  console.error("COOKIE_SAMESITE=none requires COOKIE_SECURE=true (browsers reject it otherwise).");
  process.exit(1);
}
