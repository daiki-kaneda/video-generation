import assert from "node:assert/strict";
import { test } from "node:test";
import { CreateVideoRequestSchema, type CreateVideoRequest } from "@video-generation/shared";
import type { AudioCache } from "../ports/AudioCache";
import type { AudioDurationProbe } from "../ports/AudioDurationProbe";
import type { SpeechSynthesizer, SynthesizedSpeech } from "../ports/SpeechSynthesizer";
import { ApplyNarrationUseCase } from "./ApplyNarrationUseCase";

/*
 * このテストファイルはAWS SDKを一切importしない。
 * `ApplyNarrationUseCase` はポート(インターフェース)にのみ依存するため、
 * 以下のようなインメモリの偽実装だけで挙動を検証できる
 * (= クリーンアーキテクチャ化によって得られるテスト容易性)。
 */

class FakeSpeechSynthesizer implements SpeechSynthesizer {
  public callCount = 0;

  async synthesize(text: string): Promise<SynthesizedSpeech> {
    this.callCount += 1;
    return { audioBytes: new TextEncoder().encode(text), contentType: "audio/mpeg" };
  }
}

class FailingSpeechSynthesizer implements SpeechSynthesizer {
  async synthesize(): Promise<SynthesizedSpeech> {
    throw new Error("Polly is down");
  }
}

class FakeAudioCache implements AudioCache {
  private readonly store = new Map<string, Uint8Array>();

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async get(key: string): Promise<Uint8Array> {
    const value = this.store.get(key);
    if (!value) {
      throw new Error(`not found: ${key}`);
    }
    return value;
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    this.store.set(key, bytes);
  }

  async getPublicUrl(key: string): Promise<string> {
    return `https://fake-cache.example.com/${key}`;
  }
}

class FakeAudioDurationProbe implements AudioDurationProbe {
  async getDurationSeconds(audioBytes: Uint8Array): Promise<number> {
    // テスト用のダミー実装: バイト数をそのまま秒数とみなす
    return audioBytes.byteLength;
  }
}

const buildRequest = (overrides: Record<string, unknown> = {}): CreateVideoRequest =>
  CreateVideoRequestSchema.parse({
    title: "テスト動画",
    scenes: [{ text: "こんにちは", durationInSeconds: 3 }],
    narration: { enabled: true },
    ...overrides,
  });

test("narration.enabled=falseなら合成系ポートを一切呼ばない", async () => {
  const synthesizer = new FakeSpeechSynthesizer();
  const useCase = new ApplyNarrationUseCase(synthesizer, new FakeAudioCache(), new FakeAudioDurationProbe());
  const input = buildRequest({ narration: { enabled: false } });

  const result = await useCase.execute(input);

  assert.equal(synthesizer.callCount, 0);
  assert.deepEqual(result, input);
});

test("narration.enabled=trueならシーンにnarrationAudioUrlが設定される", async () => {
  const synthesizer = new FakeSpeechSynthesizer();
  const useCase = new ApplyNarrationUseCase(synthesizer, new FakeAudioCache(), new FakeAudioDurationProbe());
  const input = buildRequest();

  const result = await useCase.execute(input);

  assert.equal(synthesizer.callCount, 1);
  assert.ok(result.scenes[0].narrationAudioUrl?.startsWith("https://fake-cache.example.com/"));
});

test("同一テキスト・設定は2回目以降キャッシュを再利用し合成ポートを呼ばない", async () => {
  const synthesizer = new FakeSpeechSynthesizer();
  const cache = new FakeAudioCache();
  const useCase = new ApplyNarrationUseCase(synthesizer, cache, new FakeAudioDurationProbe());
  const input = buildRequest({
    scenes: [
      { text: "こんにちは", durationInSeconds: 3 },
      { text: "こんにちは", durationInSeconds: 3 },
    ],
  });

  await useCase.execute(input);

  assert.equal(synthesizer.callCount, 1);
});

test("ナレーションがシーンの表示時間より長い場合、durationInSecondsが自動延長される", async () => {
  const synthesizer = new FakeSpeechSynthesizer();
  const useCase = new ApplyNarrationUseCase(synthesizer, new FakeAudioCache(), new FakeAudioDurationProbe());
  const longText = "あ".repeat(10);
  const input = buildRequest({ scenes: [{ text: longText, durationInSeconds: 3 }] });

  const result = await useCase.execute(input);

  assert.ok(result.scenes[0].durationInSeconds > 3);
});

test("合成に失敗してもそのシーンはナレーションなしで処理を継続する", async () => {
  const useCase = new ApplyNarrationUseCase(
    new FailingSpeechSynthesizer(),
    new FakeAudioCache(),
    new FakeAudioDurationProbe(),
  );
  const input = buildRequest();

  const result = await useCase.execute(input);

  assert.equal(result.scenes[0].narrationAudioUrl, undefined);
  assert.equal(result.scenes[0].durationInSeconds, input.scenes[0].durationInSeconds);
});

test("narrationSkip=trueのシーンは合成しない", async () => {
  const synthesizer = new FakeSpeechSynthesizer();
  const useCase = new ApplyNarrationUseCase(synthesizer, new FakeAudioCache(), new FakeAudioDurationProbe());
  const input = buildRequest({
    scenes: [{ text: "こんにちは", durationInSeconds: 3, narrationSkip: true }],
  });

  const result = await useCase.execute(input);

  assert.equal(synthesizer.callCount, 0);
  assert.equal(result.scenes[0].narrationAudioUrl, undefined);
});

test("既にnarrationAudioUrlが設定されているシーンは合成せずそのまま使う", async () => {
  const synthesizer = new FakeSpeechSynthesizer();
  const useCase = new ApplyNarrationUseCase(synthesizer, new FakeAudioCache(), new FakeAudioDurationProbe());
  const input = buildRequest({
    scenes: [
      {
        text: "こんにちは",
        durationInSeconds: 3,
        narrationAudioUrl: "https://example.com/existing.mp3",
      },
    ],
  });

  const result = await useCase.execute(input);

  assert.equal(synthesizer.callCount, 0);
  assert.equal(result.scenes[0].narrationAudioUrl, "https://example.com/existing.mp3");
});
