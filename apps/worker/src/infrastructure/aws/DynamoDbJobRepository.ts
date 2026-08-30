import { GetCommand, UpdateCommand, type DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { VideoJobStatus, type VideoJobRecord } from "@video-generation/shared";
import type { JobRepository } from "../../application/ports/JobRepository";
import type { RenderedVideoLocation } from "../../domain/entities/RenderedVideo";

/** `JobRepository` ポートのDynamoDB実装。 */
export class DynamoDbJobRepository implements JobRepository {
  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getJob(videoId: string): Promise<VideoJobRecord | undefined> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { videoId },
      }),
    );
    return result.Item as VideoJobRecord | undefined;
  }

  async markProcessing(videoId: string): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { videoId },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": VideoJobStatus.PROCESSING,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );
  }

  async markCompleted(videoId: string, output: RenderedVideoLocation): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
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
  }

  async markFailed(videoId: string, errorMessage: string): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
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
  }
}
