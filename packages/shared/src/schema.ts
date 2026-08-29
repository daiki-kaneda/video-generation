import { z } from "zod";

/**
 * シーン切り替えの演出タイプ (`@remotion/transitions` の presentation に対応)。
 * `fade`: クロスフェード / `slide`: スライドイン / `wipe`: ワイプ /
 * `flip`: 回転 / `clockWipe`: 時計回りワイプ / `iris`: 円形ワイプ / `none`: カット(演出なし)
 */
export const SceneTransitionType = {
  FADE: "fade",
  SLIDE: "slide",
  WIPE: "wipe",
  FLIP: "flip",
  CLOCK_WIPE: "clockWipe",
  IRIS: "iris",
  NONE: "none",
} as const;
export type SceneTransitionType =
  (typeof SceneTransitionType)[keyof typeof SceneTransitionType];
export const SCENE_TRANSITION_TYPES = Object.values(
  SceneTransitionType,
) as [SceneTransitionType, ...SceneTransitionType[]];

/** スライド・ワイプ・回転演出の方向 */
export const SceneTransitionDirection = {
  FROM_LEFT: "from-left",
  FROM_RIGHT: "from-right",
  FROM_TOP: "from-top",
  FROM_BOTTOM: "from-bottom",
} as const;
export type SceneTransitionDirection =
  (typeof SceneTransitionDirection)[keyof typeof SceneTransitionDirection];
export const SCENE_TRANSITION_DIRECTIONS = Object.values(
  SceneTransitionDirection,
) as [SceneTransitionDirection, ...SceneTransitionDirection[]];

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
  /**
   * 前のシーンからこのシーンへ切り替わる際の演出。
   * 先頭シーンでは無視される (再生開始時にそのまま表示される)。
   */
  transitionType: z.enum(SCENE_TRANSITION_TYPES).default("fade"),
  /** slide/wipe/flip 選択時の方向 (省略時は右から) */
  transitionDirection: z.enum(SCENE_TRANSITION_DIRECTIONS).optional(),
  /** 切り替え演出の長さ (秒)。前後シーンの短い方の長さを超えないよう自動調整される */
  transitionDurationInSeconds: z.number().positive().max(5).default(0.5),
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
