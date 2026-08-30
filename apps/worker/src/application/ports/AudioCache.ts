/**
 * 合成済み音声のキャッシュを担うポート。
 * 実装はS3等に依存するが、このインターフェース自体は依存しない。
 *
 * キーは論理キー(`domain/entities/NarrationRequest.ts` の `buildNarrationCacheKey` が生成)であり、
 * 実際のストレージ上のパスへの変換(プレフィックスや拡張子の付与等)は実装側の責務とする。
 */
export interface AudioCache {
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<Uint8Array>;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** 一定時間だけ有効なダウンロードURLを発行する(署名付きURL等)。 */
  getPublicUrl(key: string, expiresInSeconds: number): Promise<string>;
}
