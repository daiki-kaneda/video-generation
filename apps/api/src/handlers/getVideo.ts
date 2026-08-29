import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { VideoJobRecord } from "@video-generation/shared";
import { docClient } from "../lib/clients";
import { getTableName } from "../lib/env";
import { errorResponse, jsonResponse } from "../lib/http";
import { getAuthenticatedUser } from "../lib/auth";

/**
 * GET /videos/{videoId}
 * ジョブのステータス・出力パスを取得する。他ユーザーのジョブは 404 を返す。
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

  const videoId = event.pathParameters?.videoId;
  if (!videoId) {
    return errorResponse(400, "videoId path parameter is required");
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { videoId },
    }),
  );

  const item = result.Item as VideoJobRecord | undefined;
  if (!item || item.userId !== user.userId) {
    return errorResponse(404, "Video job not found");
  }

  return jsonResponse(200, {
    videoId: item.videoId,
    status: item.status,
    title: item.input?.title,
    outputUrl: item.outputUrl,
    errorMessage: item.errorMessage,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
};
