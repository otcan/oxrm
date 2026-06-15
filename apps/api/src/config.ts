export interface ApiConfig {
  host: string;
  port: number;
  databaseUrl: string;
  nodeEnv: string;
  logLevel: string;
}

export function loadConfig(): ApiConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return {
    host: process.env.API_HOST ?? "0.0.0.0",
    port: Number(process.env.API_PORT ?? 18181),
    databaseUrl,
    nodeEnv: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "info"
  };
}
