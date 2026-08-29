// 明示的な named export を用いる(`export * from` は避ける)。
// `export * from` はCommonJSへコンパイルすると実行時に動的にプロパティをコピーする
// ヘルパー関数になり、esbuild/Vite等のバンドラーが静的解析で named export を
// 検出できず、ブラウザ(Web)側での `import { X } from "@video-generation/shared"`
// が解決できなくなるため。
export {
  VideoSceneSchema,
  CreateVideoRequestSchema,
  VideoJobStatus,
  VideoJobMessageSchema,
  SceneTransitionType,
  SCENE_TRANSITION_TYPES,
  SceneTransitionDirection,
  SCENE_TRANSITION_DIRECTIONS,
  ImageAnimationType,
  IMAGE_ANIMATION_TYPES,
  VideoTemplateId,
  VIDEO_TEMPLATE_IDS,
  NarrationEngine,
  NARRATION_ENGINES,
  NarrationVoiceId,
  NARRATION_VOICE_IDS,
  NARRATION_VOICES_BY_ENGINE,
  NarrationConfigSchema,
} from "./schema";
export type {
  VideoScene,
  CreateVideoRequest,
  VideoJobRecord,
  VideoJobMessage,
  NarrationConfig,
} from "./schema";

export {
  USER_CREATED_AT_INDEX,
  VIDEO_COMPOSITION_ID,
  EnvVar,
} from "./constants";
