import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export interface AuthenticatedUser {
  userId: string;
  email?: string;
}

/**
 * API Gateway HTTP API の Cognito JWT オーソライザーが検証済みの
 * JWT クレームからユーザー情報を取り出す。
 */
export const getAuthenticatedUser = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): AuthenticatedUser => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const userId = claims.sub;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("JWT claims missing 'sub'");
  }
  const email = typeof claims.email === "string" ? claims.email : undefined;
  return { userId, email };
};
