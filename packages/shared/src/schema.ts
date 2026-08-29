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
 * 背景画像に適用する Ken Burns 風のパン/ズームアニメーション。
 * `zoomIn`/`zoomOut`: 画像中心を基準に拡大/縮小。
 * `panLeftToRight`等: 画像を軽くズームした状態で指定方向へゆっくり視点を移動。
 * `none`: アニメーションなし(静止画のまま)。
 */
export const ImageAnimationType = {
  NONE: "none",
  ZOOM_IN: "zoomIn",
  ZOOM_OUT: "zoomOut",
  PAN_LEFT_TO_RIGHT: "panLeftToRight",
  PAN_RIGHT_TO_LEFT: "panRightToLeft",
  PAN_TOP_TO_BOTTOM: "panTopToBottom",
  PAN_BOTTOM_TO_TOP: "panBottomToTop",
} as const;
export type ImageAnimationType =
  (typeof ImageAnimationType)[keyof typeof ImageAnimationType];
export const IMAGE_ANIMATION_TYPES = Object.values(
  ImageAnimationType,
) as [ImageAnimationType, ...ImageAnimationType[]];

/**
 * 動画全体のレイアウト・スタイル(テンプレート)。
 * `simple`: 全画面の画像/背景色 + 中央寄せテキスト(シンプルなスライドショー)。
 * `productShowcase`: 左に説明パネル(見出し・説明・価格/CTAバッジ)、右に商品画像。
 * `newsBulletin`: 全画面背景 + 左上のカテゴリバッジ + 下部ロワーサード(見出し・説明) + 右下に番組名の透かし。
 */
export const VideoTemplateId = {
  SIMPLE: "simple",
  PRODUCT_SHOWCASE: "productShowcase",
  NEWS_BULLETIN: "newsBulletin",
} as const;
export type VideoTemplateId =
  (typeof VideoTemplateId)[keyof typeof VideoTemplateId];
export const VIDEO_TEMPLATE_IDS = Object.values(
  VideoTemplateId,
) as [VideoTemplateId, ...VideoTemplateId[]];

/**
 * ナレーション音声合成に使う Amazon Polly のエンジン。
 * `standard`: 最安(100万文字$4.00)。日本語は Mizuki(女性)/Takumi(男性)のみ対応。
 * `neural`: より自然な抑揚(100万文字$16.00、Standardの4倍)。日本語は Takumi/Kazuha/Tomoko が対応。
 * コスト最小化のため既定は `standard`。
 */
export const NarrationEngine = {
  STANDARD: "standard",
  NEURAL: "neural",
} as const;
export type NarrationEngine =
  (typeof NarrationEngine)[keyof typeof NarrationEngine];
export const NARRATION_ENGINES = Object.values(
  NarrationEngine,
) as [NarrationEngine, ...NarrationEngine[]];

/** ナレーションに使用する Amazon Polly の日本語(ja-JP)対応音声 */
export const NarrationVoiceId = {
  MIZUKI: "Mizuki",
  TAKUMI: "Takumi",
  KAZUHA: "Kazuha",
  TOMOKO: "Tomoko",
} as const;
export type NarrationVoiceId =
  (typeof NarrationVoiceId)[keyof typeof NarrationVoiceId];
export const NARRATION_VOICE_IDS = Object.values(
  NarrationVoiceId,
) as [NarrationVoiceId, ...NarrationVoiceId[]];

/**
 * エンジンごとに利用可能な voiceId (Amazon Polly の日本語音声の対応表)。
 * Standardエンジンは Mizuki/Takumi のみ、Neuralエンジンは Takumi/Kazuha/Tomoko のみ対応。
 */
export const NARRATION_VOICES_BY_ENGINE: Record<
  NarrationEngine,
  readonly NarrationVoiceId[]
> = {
  standard: [NarrationVoiceId.MIZUKI, NarrationVoiceId.TAKUMI],
  neural: [
    NarrationVoiceId.TAKUMI,
    NarrationVoiceId.KAZUHA,
    NarrationVoiceId.TOMOKO,
  ],
};

/**
 * 動画全体のナレーション自動生成設定。
 * コストが発生する機能のため、既定では無効(`enabled: false`)。
 * 有効化した場合、ワーカーがレンダリング前にシーンごとのテキストを
 * Amazon Pollyで音声合成し、`VideoScene.narrationAudioUrl` を自動的に設定する。
 */
export const NarrationConfigSchema = z
  .object({
    /** ナレーション自動生成を有効にするか (既定は無効) */
    enabled: z.boolean().default(false),
    /** 合成エンジン。コスト最小化のため既定は最安の standard */
    engine: z.enum(NARRATION_ENGINES).default("standard"),
    /** 読み上げ音声。engine ごとに選べる voice が異なる (`NARRATION_VOICES_BY_ENGINE` 参照) */
    voiceId: z.enum(NARRATION_VOICE_IDS).default("Takumi"),
  })
  .refine((value) => NARRATION_VOICES_BY_ENGINE[value.engine].includes(value.voiceId), {
    message: "選択したエンジンではこの音声(voiceId)は利用できません",
    path: ["voiceId"],
  });
export type NarrationConfig = z.infer<typeof NarrationConfigSchema>;

/**
 * 1シーン分の内容。Remotion の Composition (`VideoComposition`) が
 * このスキーマの配列をそのまま `inputProps.scenes` として受け取る。
 */
export const VideoSceneSchema = z.object({
  /** シーンに表示するメインテキスト */
  text: z.string().min(1).max(280).optional(),
  /** シーンのサブテキスト */
  subtext: z.string().max(280).optional(),
  /** 背景に表示する画像 (S3 の公開/署名付きURL、または http(s) URL)。videoUrl 指定時は無視される */
  imageUrl: z.string().url().optional(),
  /**
   * 背景に合成する動画クリップ (mp4等, S3の公開/署名付きURL、または http(s) URL)。
   * 指定時は imageUrl より優先され、シーンの表示時間いっぱいに再生される
   * (`videoStartFromSeconds` から `durationInSeconds` 分だけ切り出す)。
   */
  videoUrl: z.string().url().optional(),
  /** videoUrl 再生開始位置 (秒)。クリップの一部だけをトリミングして使う場合に指定 */
  videoStartFromSeconds: z.number().min(0).default(0),
  /**
   * videoUrl クリップ自体の音量 (0〜1)。
   * 既定はミュート(0)で、`audioUrl` のBGMと音がぶつからないようにしている。
   */
  videoVolume: z.number().min(0).max(1).default(0),
  /** 背景色 (imageUrl/videoUrl が無い場合に使用, CSS color) */
  backgroundColor: z.string().max(32).optional(),
  /** シーンの表示時間 (秒) */
  durationInSeconds: z.number().positive().max(120).default(3),
  /** 背景画像に適用する Ken Burns 風パン/ズーム。imageUrl が無い場合、または videoUrl 指定時は無視される */
  imageAnimation: z.enum(IMAGE_ANIMATION_TYPES).default("none"),
  /** アニメーションの強さ (0〜1, 大きいほどズーム/移動量が大きい) */
  imageAnimationIntensity: z.number().min(0).max(1).default(0.15),
  /**
   * 前のシーンからこのシーンへ切り替わる際の演出。
   * 先頭シーンでは無視される (再生開始時にそのまま表示される)。
   */
  transitionType: z.enum(SCENE_TRANSITION_TYPES).default("fade"),
  /** slide/wipe/flip 選択時の方向 (省略時は右から) */
  transitionDirection: z.enum(SCENE_TRANSITION_DIRECTIONS).optional(),
  /** 切り替え演出の長さ (秒)。前後シーンの短い方の長さを超えないよう自動調整される */
  transitionDurationInSeconds: z.number().positive().max(5).default(0.5),
  /**
   * テンプレートごとに用途が変わる短いラベル (任意)。
   * - `productShowcase`: 価格/CTAバッジ (例: "¥1,980", "送料無料")
   * - `newsBulletin`: カテゴリ/速報ラベル (例: "速報", "スポーツ")
   * - `simple`: 未使用
   */
  badgeText: z.string().max(40).optional(),
  /**
   * ナレーションとして読み上げるテキスト (任意)。
   * 未指定の場合は `text` + `subtext` を結合した文章を読み上げる。
   * `CreateVideoRequest.narration.enabled` が true の場合のみ使用される。
   */
  narrationText: z.string().max(560).optional(),
  /** このシーンだけナレーションを無効化する (動画全体でナレーションが有効な場合でも読み上げない) */
  narrationSkip: z.boolean().default(false),
  /**
   * ワーカーがAmazon Pollyで合成したナレーション音声のURL。
   * 通常はレンダリング前処理で自動的に設定される計算済みフィールドであり、
   * ユーザーが直接指定した場合はそれを優先し、Pollyの呼び出しをスキップする。
   */
  narrationAudioUrl: z.string().url().optional(),
});
export type VideoScene = z.infer<typeof VideoSceneSchema>;

/**
 * ユーザーが動画生成時に入力するJSONの本体。
 * API Gateway -> Lambda(createVideo) が受け取るリクエストボディ。
 */
export const CreateVideoRequestSchema = z.object({
  /** 動画タイトル (メタデータ・通知メールにも利用。newsBulletinテンプレートでは番組名の透かしにも使用) */
  title: z.string().min(1).max(120),
  /** 使用するテンプレート(レイアウト・スタイル) */
  templateId: z.enum(VIDEO_TEMPLATE_IDS).default("simple"),
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
  /** ナレーション自動生成の設定 (既定では無効) */
  narration: NarrationConfigSchema.default({}),
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
