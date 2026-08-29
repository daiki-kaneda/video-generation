import type { RenderedVideoLocation } from "../../domain/entities/RenderedVideo";

/**
 * レンダリング済み動画の保存を担うポート。
 * 実装はS3等に依存するが、このインターフェース自体は依存しない。
 */
export interface VideoStorage {
  /** レンダリング済みの動画ファイルをアップロードし、保存先情報(ダウンロードURLを含む)を返す。 */
  uploadRenderedVideo(videoId: string, localFilePath: string): Promise<RenderedVideoLocation>;
}
