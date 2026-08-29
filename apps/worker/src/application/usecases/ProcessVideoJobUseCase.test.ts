import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CreateVideoRequestSchema,
  VideoJobStatus,
  type VideoJobRecord,
} from "@video-generation/shared";
import type { RenderedVideoLocation } from "../../domain/entities/RenderedVideo";
import type { JobRepository } from "../ports/JobRepository";
import type { NotificationService } from "../ports/NotificationService";
import type { VideoRenderer } from "../ports/VideoRenderer";
import type { VideoStorage } from "../ports/VideoStorage";
import type { AudioCache } from "../ports/AudioCache";
import type { AudioDurationProbe } from "../ports/AudioDurationProbe";
import type { SpeechSynthesizer, SynthesizedSpeech } from "../ports/SpeechSynthesizer";
import { ApplyNarrationUseCase } from "./ApplyNarrationUseCase";
import { ProcessVideoJobUseCase } from "./ProcessVideoJobUseCase";

/*
 * このテストファイルもAWS SDKを一切importしない。
 * `ProcessVideoJobUseCase` はポートと他のユースケースにのみ依存するため、
 * DynamoDB/S3/SES/Remotion/Pollyいずれも実体を用意せずに全フローを検証できる。
 */

// ナレーションは無効な入力しか使わないため、合成系ポートが呼ばれたら失敗させて
// 「本当に呼ばれていないこと」も併せて検証する。
class UnusedSpeechSynthesizer implements SpeechSynthesizer {
  async synthesize(): Promise<SynthesizedSpeech> {
    throw new Error("should not be called");
  }
}
class UnusedAudioCache implements AudioCache {
  async exists(): Promise<boolean> {
    throw new Error("should not be called");
  }
  async get(): Promise<Uint8Array> {
    throw new Error("should not be called");
  }
  async put(): Promise<void> {
    throw new Error("should not be called");
  }
  async getPublicUrl(): Promise<string> {
    throw new Error("should not be called");
  }
}
class UnusedAudioDurationProbe implements AudioDurationProbe {
  async getDurationSeconds(): Promise<number> {
    throw new Error("should not be called");
  }
}

class FakeJobRepository implements JobRepository {
  public job: VideoJobRecord | undefined;
  public markProcessingCalls = 0;
  public completedOutput: RenderedVideoLocation | undefined;
  public failedMessage: string | undefined;

  async getJob(): Promise<VideoJobRecord | undefined> {
    return this.job;
  }
  async markProcessing(): Promise<void> {
    this.markProcessingCalls += 1;
    if (this.job) this.job = { ...this.job, status: VideoJobStatus.PROCESSING };
  }
  async markCompleted(_videoId: string, output: RenderedVideoLocation): Promise<void> {
    this.completedOutput = output;
    if (this.job) this.job = { ...this.job, status: VideoJobStatus.COMPLETED };
  }
  async markFailed(_videoId: string, errorMessage: string): Promise<void> {
    this.failedMessage = errorMessage;
    if (this.job) this.job = { ...this.job, status: VideoJobStatus.FAILED };
  }
}

class FakeVideoRenderer implements VideoRenderer {
  public shouldFail = false;
  async render(videoId: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error("render failed");
    }
    return `/tmp/${videoId}.mp4`;
  }
}

class FakeVideoStorage implements VideoStorage {
  async uploadRenderedVideo(videoId: string): Promise<RenderedVideoLocation> {
    return {
      outputBucket: "fake-bucket",
      outputKey: `videos/${videoId}.mp4`,
      outputUrl: `https://fake.example.com/${videoId}.mp4`,
    };
  }
}

class FakeNotificationService implements NotificationService {
  public successCalls: Array<{ to: string; videoId: string; title: string; outputUrl: string }> = [];
  public failureCalls: Array<{ to: string; videoId: string; title: string; errorMessage: string }> = [];

  async notifySuccess(to: string, videoId: string, title: string, outputUrl: string): Promise<void> {
    this.successCalls.push({ to, videoId, title, outputUrl });
  }
  async notifyFailure(to: string, videoId: string, title: string, errorMessage: string): Promise<void> {
    this.failureCalls.push({ to, videoId, title, errorMessage });
  }
}

const buildJob = (overrides: Partial<VideoJobRecord> = {}): VideoJobRecord => ({
  videoId: "11111111-1111-1111-1111-111111111111",
  userId: "user-1",
  status: VideoJobStatus.QUEUED,
  input: CreateVideoRequestSchema.parse({
    title: "テスト動画",
    scenes: [{ text: "こんにちは", durationInSeconds: 3 }],
  }),
  notifyEmail: "user@example.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const buildUseCase = (
  jobs: FakeJobRepository,
  renderer: FakeVideoRenderer,
  storage: FakeVideoStorage,
  notifications: FakeNotificationService,
) => {
  const applyNarration = new ApplyNarrationUseCase(
    new UnusedSpeechSynthesizer(),
    new UnusedAudioCache(),
    new UnusedAudioDurationProbe(),
  );
  return new ProcessVideoJobUseCase(jobs, renderer, storage, notifications, applyNarration);
};

test("存在しないジョブは何もせず正常終了する", async () => {
  const jobs = new FakeJobRepository();
  jobs.job = undefined;
  const useCase = buildUseCase(jobs, new FakeVideoRenderer(), new FakeVideoStorage(), new FakeNotificationService());

  await assert.doesNotReject(() => useCase.execute("does-not-exist"));
  assert.equal(jobs.markProcessingCalls, 0);
});

test("既に完了/失敗しているジョブは重複処理しない", async () => {
  const jobs = new FakeJobRepository();
  jobs.job = buildJob({ status: VideoJobStatus.COMPLETED });
  const useCase = buildUseCase(jobs, new FakeVideoRenderer(), new FakeVideoStorage(), new FakeNotificationService());

  await useCase.execute(jobs.job.videoId);

  assert.equal(jobs.markProcessingCalls, 0);
});

test("成功時: 処理中->完了への更新とレンダリング・アップロード・成功通知が行われる", async () => {
  const jobs = new FakeJobRepository();
  jobs.job = buildJob();
  const renderer = new FakeVideoRenderer();
  const storage = new FakeVideoStorage();
  const notifications = new FakeNotificationService();
  const useCase = buildUseCase(jobs, renderer, storage, notifications);

  await useCase.execute(jobs.job.videoId);

  assert.equal(jobs.markProcessingCalls, 1);
  assert.equal(jobs.job?.status, VideoJobStatus.COMPLETED);
  assert.equal(jobs.completedOutput?.outputUrl, `https://fake.example.com/${jobs.job?.videoId}.mp4`);
  assert.equal(notifications.successCalls.length, 1);
  assert.equal(notifications.failureCalls.length, 0);
});

test("失敗時: エラー内容を記録し失敗通知が行われる(成功通知は行われない)", async () => {
  const jobs = new FakeJobRepository();
  jobs.job = buildJob();
  const renderer = new FakeVideoRenderer();
  renderer.shouldFail = true;
  const notifications = new FakeNotificationService();
  const useCase = buildUseCase(jobs, renderer, new FakeVideoStorage(), notifications);

  await useCase.execute(jobs.job.videoId);

  assert.equal(jobs.job?.status, VideoJobStatus.FAILED);
  assert.equal(jobs.failedMessage, "render failed");
  assert.equal(notifications.failureCalls.length, 1);
  assert.equal(notifications.successCalls.length, 0);
});
