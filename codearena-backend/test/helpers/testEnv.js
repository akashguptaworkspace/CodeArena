// Imported first by API tests: configure an isolated in-memory database and test secrets
// before any app module reads the environment.
Object.assign(process.env, {
  NODE_ENV: "test",
  DB_DIALECT: "sqlite",
  DB_STORAGE: ":memory:",
  DB_NAME: "test",
  GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  JWT_ACCESS_SECRET: "test-secret-that-is-long-enough-for-hs256-signing",
  CLIENT_ORIGINS: "http://localhost:5173",
});
