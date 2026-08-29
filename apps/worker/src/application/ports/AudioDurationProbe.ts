/**
 * 音声データの再生時間(秒)を取得するポート。
 * 実装はffprobe等の外部コマンドに依存するが、このインターフェース自体は依存しない。
 */
export interface AudioDurationProbe {
  getDurationSeconds(audioBytes: Uint8Array): Promise<number>;
}
