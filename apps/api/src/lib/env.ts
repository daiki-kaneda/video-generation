import { EnvVar } from "@video-generation/shared";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const getTableName = (): string => requireEnv(EnvVar.TABLE_NAME);
export const getQueueUrl = (): string => requireEnv(EnvVar.QUEUE_URL);
