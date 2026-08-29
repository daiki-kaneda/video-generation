import type { CreateVideoRequest } from "@video-generation/shared";

/**
 * 動画のレンダリングを担うポート。
 * 実装はRemotion等に依存するが、このインターフェース自体は依存しない。
 */
export interface VideoRenderer {
  /** 入力内容から動画をレンダリングし、ローカルの一時ファイルパスを返す。 */
  render(videoId: string, input: CreateVideoRequest): Promise<string>;
}
