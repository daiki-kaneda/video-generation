/** DynamoDB のユーザー別一覧取得用 GSI 名 */
export const USER_CREATED_AT_INDEX = "userId-createdAt-index";

/**
 * Remotion コンポジションのID。
 * `packages/remotion-video` (ブラウザ/webpackバンドル側) と
 * `apps/worker` (Node.jsプロセス側, `selectComposition` 呼び出し) の
 * 両方から参照するため、JSXを含まないこのパッケージで共有する。
 */
export const SIMPLE_VIDEO_COMPOSITION_ID = "SimpleVideo";

/** 環境変数キー (Lambda / Fargate 双方で共通利用) */
export const EnvVar = {
  TABLE_NAME: "VIDEO_JOBS_TABLE_NAME",
  QUEUE_URL: "VIDEO_RENDER_QUEUE_URL",
  OUTPUT_BUCKET: "VIDEO_OUTPUT_BUCKET",
  ASSET_BUCKET: "VIDEO_ASSET_BUCKET",
  SES_SENDER_EMAIL: "SES_SENDER_EMAIL",
  AWS_REGION_OVERRIDE: "APP_AWS_REGION",
} as const;
