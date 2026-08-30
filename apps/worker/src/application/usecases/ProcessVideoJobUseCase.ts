import fs from "node:fs/promises";
import { isTerminalJob } from "../../domain/entities/VideoJob";
import type { JobRepository } from "../ports/JobRepository";
import type { NotificationService } from "../ports/NotificationService";
import type { VideoRenderer } from "../ports/VideoRenderer";
import type { VideoStorage } from "../ports/VideoStorage";
import type { ApplyNarrationUseCase } from "./ApplyNarrationUseCase";

/**
 * 1件の動画生成ジョブを最初から最後まで処理するユースケース。
 *
 * 要件のフロー: ステータスを処理中に更新 -> 動画生成開始
 * -> 成功時はパス・ステータスをDB更新してメール通知、失敗時はエラー内容を記録して通知する。
 *
 * 依存するのはポート(`JobRepository`/`VideoRenderer`/`VideoStorage`/`NotificationService`)と
 * 他のユースケース(`ApplyNarrationUseCase`)のみであり、AWS SDKには一切依存しない。
 */
export class ProcessVideoJobUseCase {
  constructor(
    private readonly jobs: JobRepository,
    private readonly renderer: VideoRenderer,
    private readonly storage: VideoStorage,
    private readonly notifications: NotificationService,
    private readonly applyNarration: ApplyNarrationUseCase,
  ) {}

  async execute(videoId: string): Promise<void> {
    const job = await this.jobs.getJob(videoId);
    if (!job) {
      console.error(`Job ${videoId} not found, skipping`);
      return;
    }
    if (isTerminalJob(job)) {
      // 既に終了しているジョブ (SQSのat-least-once配信による重複)
      console.warn(`Job ${videoId} already in terminal state ${job.status}`);
      return;
    }

    console.log(`Start processing job ${videoId}`);
    await this.jobs.markProcessing(videoId);

    let localFilePath: string | undefined;
    try {
      // ナレーションが有効な場合、レンダリング前にPollyで音声合成し、
      // シーンの `narrationAudioUrl`/`durationInSeconds` を確定させてから渡す。
      const renderInput = await this.applyNarration.execute(job.input);
      localFilePath = await this.renderer.render(videoId, renderInput);
      const output = await this.storage.uploadRenderedVideo(videoId, localFilePath);
      await this.jobs.markCompleted(videoId, output);
      await this.notifications.notifySuccess(job.notifyEmail, videoId, job.input.title, output.outputUrl);
      console.log(`Job ${videoId} completed successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Job ${videoId} failed:`, err);
      await this.jobs.markFailed(videoId, errorMessage);
      await this.notifications.notifyFailure(job.notifyEmail, videoId, job.input.title, errorMessage);
    } finally {
      if (localFilePath) {
        await fs.rm(localFilePath, { force: true });
      }
    }
  }
}
