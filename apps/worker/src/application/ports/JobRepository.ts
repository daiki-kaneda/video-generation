import type { RenderedVideoLocation } from "../../domain/entities/RenderedVideo";
import type { VideoJob } from "../../domain/entities/VideoJob";

/**
 * 動画生成ジョブの永続化を担うポート。
 * 実装はDynamoDBなど特定のデータストアに依存するが、このインターフェース自体は依存しない。
 */
export interface JobRepository {
  getJob(videoId: string): Promise<VideoJob | undefined>;
  /** ワーカーがジョブを受け取った時点で、ステータスを処理中に更新する。 */
  markProcessing(videoId: string): Promise<void>;
  /** 動画生成が成功したら、出力先とステータスをDBに保存・更新する。 */
  markCompleted(videoId: string, output: RenderedVideoLocation): Promise<void>;
  /** 動画生成が失敗したら、エラー内容とステータスをDBに保存・更新する。 */
  markFailed(videoId: string, errorMessage: string): Promise<void>;
}
