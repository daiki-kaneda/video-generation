import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";
import { S3Client } from "@aws-sdk/client-s3";
import { SESClient } from "@aws-sdk/client-ses";
import { PollyClient } from "@aws-sdk/client-polly";

/**
 * AWS SDKクライアントのインスタンス化。
 * AWS依存を持つのはこの `infrastructure` 層のみであり、
 * `application`(ユースケース・ポート)・`domain`(エンティティ)からは一切参照されない。
 */
const ddbClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const sqsClient = new SQSClient({});
export const s3Client = new S3Client({});
export const sesClient = new SESClient({});
export const pollyClient = new PollyClient({});
