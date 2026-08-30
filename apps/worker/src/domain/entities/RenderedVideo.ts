/**
 * レンダリング済み動画の保存先を表す値オブジェクト。
 *
 * `outputBucket`/`outputKey` という命名は `VideoJobRecord` の永続化スキーマに合わせているが、
 * 型としては単なる文字列でありAWS SDKの型には依存しない
 * (S3以外のオブジェクトストレージに置き換えても成立する)。
 */
export interface RenderedVideoLocation {
  outputBucket: string;
  outputKey: string;
  outputUrl: string;
}
