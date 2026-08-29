import fs from "node:fs/promises";
import type { Message } from "@aws-sdk/client-sqs";
import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { VideoJobMessageSchema, VideoJobStatus } from "@video-generation/shared";
import { sqsClient } from "./clients";
import { config } from "./config";
import { getJob, markCompleted, markFailed, markProcessing } from "./db";
import { renderVideo } from "./render";
import { uploadRenderedVideo } from "./storage";
import { notifyFailure, notifySuccess } from "./notify";

const deleteMessage = async (receiptHandle: string): Promise<void> => {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: config.queueUrl,
      ReceiptHandle: receiptHandle,
    }),
  );
};

/**
 * SQSから受け取った1件のメッセージを処理する。
 * 要件のフロー: DBへ保存(動画ID・メタデータ・ステータス) -> 動画生成開始
 * -> 成功時はパス・ステータスをDB更新 -> メール通知。
 */
export const processMessage = async (message: Message): Promise<void> => {
  if (!message.Body || !message.ReceiptHandle) {
    console.warn("Skipping malformed SQS message", message.MessageId);
    return;
  }

  const parsed = VideoJobMessageSchema.safeParse(JSON.parse(message.Body));
  if (!parsed.success) {
    console.error("Invalid message payload, dropping", parsed.error);
    await deleteMessage(message.ReceiptHandle);
    return;
  }

  const { videoId } = parsed.data;
  const job = await getJob(videoId);

  if (!job) {
    console.error(`Job ${videoId} not found in DynamoDB, dropping message`);
    await deleteMessage(message.ReceiptHandle);
    return;
  }

  if (
    job.status === VideoJobStatus.COMPLETED ||
    job.status === VideoJobStatus.FAILED
  ) {
    // 既に終了しているジョブ (SQSのat-least-once配信による重複)
    console.warn(`Job ${videoId} already in terminal state ${job.status}`);
    await deleteMessage(message.ReceiptHandle);
    return;
  }

  console.log(`Start processing job ${videoId}`);
  await markProcessing(videoId);

  let localFilePath: string | undefined;
  try {
    localFilePath = await renderVideo(videoId, job.input);
    const output = await uploadRenderedVideo(videoId, localFilePath);
    await markCompleted(videoId, output);
    await notifySuccess(job.notifyEmail, videoId, job.input.title, output.outputUrl);
    console.log(`Job ${videoId} completed successfully`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Job ${videoId} failed:`, err);
    await markFailed(videoId, errorMessage);
    await notifyFailure(job.notifyEmail, videoId, job.input.title, errorMessage);
  } finally {
    if (localFilePath) {
      await fs.rm(localFilePath, { force: true });
    }
  }

  // 成功・失敗いずれも最終状態をDBに記録し通知済みのため、
  // 重複処理・重複通知を避けるためメッセージを削除する。
  await deleteMessage(message.ReceiptHandle);
};
