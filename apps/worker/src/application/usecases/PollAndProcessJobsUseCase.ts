import { VideoJobMessageSchema } from "@video-generation/shared";
import type { JobQueue, QueueMessage } from "../ports/JobQueue";
import type { ProcessVideoJobUseCase } from "./ProcessVideoJobUseCase";

/**
 * キューをポーリングし、取得したメッセージを1件ずつ `ProcessVideoJobUseCase` に委譲するユースケース。
 * レンダリングはCPU/メモリ負荷が高いため、直列に処理する。
 *
 * 依存するのはポート(`JobQueue`)と他のユースケース(`ProcessVideoJobUseCase`)のみであり、
 * AWS SDKには一切依存しない。
 */
export class PollAndProcessJobsUseCase {
  constructor(
    private readonly queue: JobQueue,
    private readonly processVideoJob: ProcessVideoJobUseCase,
  ) {}

  /** 1回分のポーリング〜処理〜メッセージ削除を行う。戻り値は受信したメッセージ数。 */
  async pollOnce(): Promise<number> {
    const messages = await this.queue.receiveMessages();
    for (const message of messages) {
      await this.handleMessage(message);
    }
    return messages.length;
  }

  private async handleMessage(message: QueueMessage): Promise<void> {
    const videoId = this.parseVideoId(message.body);
    if (!videoId) {
      console.error("Invalid message payload, dropping");
      await this.queue.deleteMessage(message.receiptHandle);
      return;
    }

    await this.processVideoJob.execute(videoId);

    // 成功・失敗いずれも ProcessVideoJobUseCase 内で最終状態をDBに記録し通知済みのため、
    // 重複処理・重複通知を避けるためメッセージを削除する。
    await this.queue.deleteMessage(message.receiptHandle);
  }

  private parseVideoId(body: string): string | undefined {
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch (err) {
      console.error("Failed to parse message body as JSON", err);
      return undefined;
    }
    const parsed = VideoJobMessageSchema.safeParse(json);
    return parsed.success ? parsed.data.videoId : undefined;
  }
}
