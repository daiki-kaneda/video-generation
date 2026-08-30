import { createHash } from "node:crypto";
import type { NarrationEngine, NarrationVoiceId, VideoScene } from "@video-generation/shared";

/**
 * シーンの読み上げテキストを決定する(純粋関数、外部I/Oなし)。
 * `narrationSkip` が true、または読み上げるテキストが無い場合は `undefined` を返す
 * (= このシーンはナレーション対象外、Pollyの課金対象文字数にも含まれない)。
 * `narrationText` が指定されていればそれを優先し、無ければ `text`/`subtext` を結合する。
 */
export const resolveNarrationText = (
  scene: Pick<VideoScene, "narrationText" | "text" | "subtext" | "narrationSkip">,
): string | undefined => {
  if (scene.narrationSkip) {
    return undefined;
  }
  if (scene.narrationText && scene.narrationText.trim().length > 0) {
    return scene.narrationText.trim();
  }
  const parts = [scene.text, scene.subtext].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join("。");
};

/**
 * ナレーションのキャッシュキー(論理キー)を生成する(純粋関数)。
 * 同一テキスト×engine×voiceIdの組み合わせは同じキーになるため、
 * 一度合成した音声はPollyを再度呼び出すことなく使い回せる(コスト削減)。
 *
 * このキーはストレージ非依存の論理的な識別子であり、実際の保存先パス
 * (S3のオブジェクトキー等)へのマッピングは `AudioCache` ポートの実装側の責務とする。
 */
export const buildNarrationCacheKey = (
  text: string,
  engine: NarrationEngine,
  voiceId: NarrationVoiceId,
): string => {
  const hash = createHash("sha256")
    .update(JSON.stringify({ text, engine, voiceId }))
    .digest("hex");
  return `${engine}/${voiceId}/${hash}`;
};
