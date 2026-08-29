import { VideoJobStatus, type VideoJobRecord } from "@video-generation/shared";

/**
 * 動画生成ジョブのエンティティ。
 *
 * 実体は `@video-generation/shared` の `VideoJobRecord` を用いる。
 * このスキーマはZodのみに依存しAWS SDKには一切依存しないため、
 * クリーンアーキテクチャにおけるエンティティとしてそのまま利用できる。
 * ここではワーカー固有のドメインルール(状態判定など)だけを追加で定義する。
 */
export type VideoJob = VideoJobRecord;
export { VideoJobStatus };

/**
 * ジョブが既に終了状態(完了/失敗)かどうかを判定する。
 * SQSはat-least-once配信のため同じジョブが再度届くことがあり、
 * 二重処理・二重通知を避けるためにこの判定を用いる。
 */
export const isTerminalJob = (job: Pick<VideoJob, "status">): boolean =>
  job.status === VideoJobStatus.COMPLETED || job.status === VideoJobStatus.FAILED;
