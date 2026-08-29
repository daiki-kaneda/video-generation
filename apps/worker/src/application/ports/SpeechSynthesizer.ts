import type { NarrationEngine, NarrationVoiceId } from "@video-generation/shared";

export interface SynthesizedSpeech {
  audioBytes: Uint8Array;
  contentType: string;
}

/**
 * テキストからの音声合成(TTS)を担うポート。
 * 実装はAmazon Polly等に依存するが、このインターフェース自体は依存しない。
 */
export interface SpeechSynthesizer {
  synthesize(
    text: string,
    engine: NarrationEngine,
    voiceId: NarrationVoiceId,
  ): Promise<SynthesizedSpeech>;
}
