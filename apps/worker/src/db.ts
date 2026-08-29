import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  VideoJobStatus,
  type VideoJobRecord,
} from "@video-generation/shared";
import { docClient } from "./clients";
import { config } from "./config";

export const getJob = async (
  videoId: string,
): Promise<VideoJobRecord | undefined> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: config.tableName,
      Key: { videoId },
    }),
  );
  return result.Item as VideoJobRecord | undefined;
};

/**
 * ワーカーがジョブを受け取った時点で、動画ID・メタデータ・ステータスをDBに保存(更新)する。
 */
export const markProcessing = async (videoId: string): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { videoId },
      UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": VideoJobStatus.PROCESSING,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );
};

/**
 * 動画生成が成功したら、動画のパスとステータスをDBに保存・更新する。
 */
export const markCompleted = async (
  videoId: string,
  output: { outputBucket: string; outputKey: string; outputUrl: string },
): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { videoId },
      UpdateExpression:
        "SET #status = :status, outputBucket = :outputBucket, outputKey = :outputKey, outputUrl = :outputUrl, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": VideoJobStatus.COMPLETED,
        ":outputBucket": output.outputBucket,
        ":outputKey": output.outputKey,
        ":outputUrl": output.outputUrl,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );
};

export const markFailed = async (
  videoId: string,
  errorMessage: string,
): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: config.tableName,
      Key: { videoId },
      UpdateExpression:
        "SET #status = :status, errorMessage = :errorMessage, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": VideoJobStatus.FAILED,
        ":errorMessage": errorMessage.slice(0, 2000),
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );
};
