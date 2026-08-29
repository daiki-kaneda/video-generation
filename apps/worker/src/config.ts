import { EnvVar } from "@video-generation/shared";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  get tableName(): string {
    return requireEnv(EnvVar.TABLE_NAME);
  },
  get queueUrl(): string {
    return requireEnv(EnvVar.QUEUE_URL);
  },
  get outputBucket(): string {
    return requireEnv(EnvVar.OUTPUT_BUCKET);
  },
  get sesSenderEmail(): string {
    return requireEnv(EnvVar.SES_SENDER_EMAIL);
  },
  /** SQS ロングポーリングの待機秒数 */
  waitTimeSeconds: 20,
  /** 1回の ReceiveMessage で取得する最大件数 */
  maxMessagesPerPoll: Number(process.env.WORKER_MAX_MESSAGES ?? 1),
  /** レンダリング中にメッセージが再配信されないよう延長する可視性タイムアウト(秒) */
  visibilityTimeoutSeconds: Number(
    process.env.WORKER_VISIBILITY_TIMEOUT_SECONDS ?? 900,
  ),
};
