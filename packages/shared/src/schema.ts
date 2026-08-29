import { z } from "zod";

/**
 * 1シーン分の内容。Remotion の Composition (`SimpleVideo`) が
 * このスキーマの配列をそのまま `inputProps.scenes` として受け取る。
 */
export const VideoSceneSchema = z.object({
  /** シーンに表示するメインテキスト */
  text: z.string().min(1).max(280).optional(),
  /** シーンのサブテキスト */
  subtext: z.string().max(280).optional(),
  /** 背景に表示する画像 (S3 の公開/署名付きURL、または http(s) URL) */
  imageUrl: z.string().url().optional(),
  /** 背景色 (imageUrl が無い場合に使用, CSS color) */
  backgroundColor: z.string().max(32).optional(),
  /** シーンの表示時間 (秒) */
  durationInSeconds: z.number().positive().max(120).default(3),
});
export type VideoScene = z.infer<typeof VideoSceneSchema>;

/**
 * ユーザーが動画生成時に入力するJSONの本体。
 * API Gateway -> Lambda(createVideo) が受け取るリクエストボディ。
 */
export const CreateVideoRequestSchema = z.object({
  /** 動画タイトル (メタデータ・通知メールにも利用) */
  title: z.string().min(1).max(120),
  /** シーンのリスト (最低1つ) */
  scenes: z.array(VideoSceneSchema).min(1).max(30),
  /** 動画の fps */
  fps: z.number().int().min(1).max(60).default(30),
  /** 出力解像度 幅 */
  width: z.number().int().min(16).max(3840).default(1920),
  /** 出力解像度 高さ */
  height: z.number().int().min(16).max(3840).default(1080),
  /** BGM 等の音声ファイル (任意) */
  audioUrl: z.string().url().optional(),
  /**
   * 生成完了/失敗通知の送信先。省略時は Cognito トークンの email クレームを使用する。
   */
  notifyEmail: z.string().email().optional(),
});
export type CreateVideoRequest = z.infer<typeof CreateVideoRequestSchema>;

/** ジョブのステータス */
export const VideoJobStatus = {
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type VideoJobStatus =
  (typeof VideoJobStatus)[keyof typeof VideoJobStatus];

/** DynamoDB `VideoJobs` テーブルの1レコード */
export interface VideoJobRecord {
  videoId: string;
  userId: string;
  status: VideoJobStatus;
  input: CreateVideoRequest;
  notifyEmail: string;
  outputBucket?: string;
  outputKey?: string;
  outputUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/** SQS に載せる軽量メッセージ。本体は DynamoDB から取得する。 */
export const VideoJobMessageSchema = z.object({
  videoId: z.string().uuid(),
});
export type VideoJobMessage = z.infer<typeof VideoJobMessageSchema>;
