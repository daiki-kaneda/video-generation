import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  USER_CREATED_AT_INDEX,
  type VideoJobRecord,
} from "@video-generation/shared";
import { docClient } from "../lib/clients";
import { getTableName } from "../lib/env";
import { errorResponse, jsonResponse } from "../lib/http";
import { getAuthenticatedUser } from "../lib/auth";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /videos?limit=20&cursor=...
 * ログイン中のユーザーが作成したジョブを新しい順に一覧取得する。
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

  const query = event.queryStringParameters ?? {};
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(query.limit) || DEFAULT_LIMIT),
  );

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (query.cursor) {
    try {
      exclusiveStartKey = JSON.parse(
        Buffer.from(query.cursor, "base64url").toString("utf8"),
      );
    } catch {
      return errorResponse(400, "Invalid cursor");
    }
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: USER_CREATED_AT_INDEX,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: { ":userId": user.userId },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  );

  const items = (result.Items ?? []) as VideoJobRecord[];
  const nextCursor = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
        "base64url",
      )
    : undefined;

  return jsonResponse(200, {
    items: items.map((item) => ({
      videoId: item.videoId,
      status: item.status,
      title: item.input?.title,
      outputUrl: item.outputUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    nextCursor,
  });
};
