import type { CreateVideoRequest, NarrationConfig, VideoScene } from "@video-generation/shared";
import { buildNarrationCacheKey, resolveNarrationText } from "../../domain/entities/NarrationRequest";
import type { AudioCache } from "../ports/AudioCache";
import type { AudioDurationProbe } from "../ports/AudioDurationProbe";
import type { SpeechSynthesizer } from "../ports/SpeechSynthesizer";

/** 署名付きURLの有効期限。レンダリング中に取得できれば十分な長さで良い。 */
const NARRATION_URL_EXPIRY_SECONDS = 60 * 60 * 24;
/** ナレーションが途中で切れないよう、音声の実際の長さに足す余白(秒) */
const NARRATION_DURATION_BUFFER_SECONDS = 0.3;

/**
 * 動画全体のナレーションを合成するユースケース。
 *
 * `narration.enabled` が false の場合は何もせず入力をそのまま返す(合成系ポートは一切呼ばれない)。
 * シーンごとに `narrationAudioUrl` を設定し、ナレーション長がシーンの表示時間を超える場合は
 * `durationInSeconds` を自動的に延長する。
 * 個々のシーンの合成に失敗しても、そのシーンをナレーションなしで処理を継続する
 * (ジョブ全体を失敗させて Fargate の再実行コストを発生させないため)。
 *
 * 依存するのはポート(`SpeechSynthesizer`/`AudioCache`/`AudioDurationProbe`)のみであり、
 * AWS SDKには一切依存しない。
 */
export class ApplyNarrationUseCase {
  constructor(
    private readonly speechSynthesizer: SpeechSynthesizer,
    private readonly audioCache: AudioCache,
    private readonly durationProbe: AudioDurationProbe,
  ) {}

  async execute(input: CreateVideoRequest): Promise<CreateVideoRequest> {
    if (!input.narration.enabled) {
      return input;
    }

    // 同一ジョブ内に同じテキスト・設定のシーンが複数ある場合、シーンは並行処理されるため、
    // キャッシュ確認が同時に走ると全シーンがキャッシュミスと判定されPollyが重複課金されうる。
    // ジョブ単位でキーごとの合成処理をメモ化し、後発のシーンは先発の結果を待つだけにする。
    const inFlightSynthesis = new Map<string, Promise<{ audioUrl: string; durationSeconds: number }>>();

    const scenes = await Promise.all(
      input.scenes.map((scene) => this.applyToScene(scene, input.narration, inFlightSynthesis)),
    );

    return { ...input, scenes };
  }

  private async applyToScene(
    scene: VideoScene,
    narration: NarrationConfig,
    inFlightSynthesis: Map<string, Promise<{ audioUrl: string; durationSeconds: number }>>,
  ): Promise<VideoScene> {
    if (scene.narrationAudioUrl) {
      // 既に合成済み(またはユーザーが直接指定した)URLがあれば再利用する
      return scene;
    }
    const text = resolveNarrationText(scene);
    if (!text) {
      return scene;
    }
    try {
      const { audioUrl, durationSeconds } = await this.synthesizeOnce(text, narration, inFlightSynthesis);
      return {
        ...scene,
        narrationAudioUrl: audioUrl,
        durationInSeconds: Math.max(
          scene.durationInSeconds,
          durationSeconds + NARRATION_DURATION_BUFFER_SECONDS,
        ),
      };
    } catch (err) {
      console.error(
        "ナレーション合成に失敗しました。このシーンは音声なしで続行します。",
        err,
      );
      return scene;
    }
  }

  /** 同一キーの合成が既に進行中であればそれに相乗りし、Polly呼び出しの重複を避ける。 */
  private synthesizeOnce(
    text: string,
    narration: Pick<NarrationConfig, "engine" | "voiceId">,
    inFlightSynthesis: Map<string, Promise<{ audioUrl: string; durationSeconds: number }>>,
  ): Promise<{ audioUrl: string; durationSeconds: number }> {
    const key = buildNarrationCacheKey(text, narration.engine, narration.voiceId);
    const existing = inFlightSynthesis.get(key);
    if (existing) {
      return existing;
    }
    const promise = this.synthesize(key, text, narration);
    inFlightSynthesis.set(key, promise);
    return promise;
  }

  /**
   * キャッシュにヒットすれば合成ポート(Polly等)を呼び出さずに再利用し(コスト削減)、
   * ミスした場合のみ合成してキャッシュに保存する。
   */
  private async synthesize(
    key: string,
    text: string,
    narration: Pick<NarrationConfig, "engine" | "voiceId">,
  ): Promise<{ audioUrl: string; durationSeconds: number }> {
    let audioBytes: Uint8Array;
    if (await this.audioCache.exists(key)) {
      audioBytes = await this.audioCache.get(key);
    } else {
      const synthesized = await this.speechSynthesizer.synthesize(
        text,
        narration.engine,
        narration.voiceId,
      );
      audioBytes = synthesized.audioBytes;
      await this.audioCache.put(key, audioBytes, synthesized.contentType);
    }

    // Pollyの Speech Marks API(発話タイミング情報)は文字数に対して別課金されるため、
    // 実際に生成された音声データを解析するこの方法でコストをかけずに尺を把握する。
    const durationSeconds = await this.durationProbe.getDurationSeconds(audioBytes);
    const audioUrl = await this.audioCache.getPublicUrl(key, NARRATION_URL_EXPIRY_SECONDS);

    return { audioUrl, durationSeconds };
  }
}
