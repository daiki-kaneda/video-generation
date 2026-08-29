import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  CreateVideoRequestSchema,
  VideoJobStatus,
  type VideoJobMessage,
  type VideoJobRecord,
} from "@video-generation/shared";
import { docClient, sqsClient } from "../lib/clients";
import { getQueueUrl, getTableName } from "../lib/env";
import { errorResponse, jsonResponse } from "../lib/http";
import { getAuthenticatedUser } from "../lib/auth";

/**
 * POST /videos
 *
 * ユーザーが動画内容(JSON)を送信するエントリーポイント。
 * 1. リクエストボディを検証
 * 2. videoId を発行し、DynamoDB に QUEUED レコードを作成 (即時ステータス参照のため)
 * 3. SQS に軽量メッセージ ({ videoId }) を送信してキューへ格納
 * 4. 202 Accepted で videoId を返却
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  let user;
  try {
    user = getAuthenticatedUser(event);
  } catch (err) {
    return errorResponse(401, "Unauthorized", String(err));
  }

  let rawBody: unknown;
  try {
    rawBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return errorResponse(400, "Request body must be valid JSON");
  }

  const parsed = CreateVideoRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(400, "Validation failed", parsed.error.flatten());
  }

  const input = parsed.data;
  const notifyEmail = input.notifyEmail ?? user.email;
  if (!notifyEmail) {
    return errorResponse(
      400,
      "notifyEmail is required (or sign in with an account that has a verified email)",
    );
  }

  const videoId = randomUUID();
  const now = new Date().toISOString();

  const record: VideoJobRecord = {
    videoId,
    userId: user.userId,
    status: VideoJobStatus.QUEUED,
    input,
    notifyEmail,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: record,
    }),
  );

  const message: VideoJobMessage = { videoId };
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: getQueueUrl(),
      MessageBody: JSON.stringify(message),
    }),
  );

  return jsonResponse(202, {
    videoId,
    status: record.status,
    createdAt: record.createdAt,
  });
};
