import { ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./clients";
import { config } from "./config";
import { processMessage } from "./processJob";

let shuttingDown = false;

const registerShutdownHandlers = (): void => {
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, will stop polling after current batch`);
    shuttingDown = true;
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SQSをロングポーリングし続けるメインループ。
 * ECS Fargate タスクのエントリーポイントとして常駐実行される。
 */
const pollLoop = async (): Promise<void> => {
  console.log("Worker started. Polling", config.queueUrl);

  while (!shuttingDown) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: config.queueUrl,
          MaxNumberOfMessages: config.maxMessagesPerPoll,
          WaitTimeSeconds: config.waitTimeSeconds,
          VisibilityTimeout: config.visibilityTimeoutSeconds,
        }),
      );

      const messages = response.Messages ?? [];
      if (messages.length === 0) {
        continue;
      }

      // レンダリングはCPU/メモリ負荷が高いため、直列に処理する。
      for (const message of messages) {
        await processMessage(message);
      }
    } catch (err) {
      console.error("Error while polling SQS", err);
      // 一時的なエラー(スロットリング等)で無限ループにならないよう待機してから再試行する。
      await sleep(5_000);
    }
  }

  console.log("Worker stopped.");
};

registerShutdownHandlers();
pollLoop().catch((err) => {
  console.error("Fatal error in worker poll loop", err);
  process.exit(1);
});
