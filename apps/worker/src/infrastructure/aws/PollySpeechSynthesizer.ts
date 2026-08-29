import { SynthesizeSpeechCommand, type PollyClient } from "@aws-sdk/client-polly";
import type { NarrationEngine, NarrationVoiceId } from "@video-generation/shared";
import type {
  SpeechSynthesizer,
  SynthesizedSpeech,
} from "../../application/ports/SpeechSynthesizer";

/** `SpeechSynthesizer` ポートのAmazon Polly実装。 */
export class PollySpeechSynthesizer implements SpeechSynthesizer {
  constructor(private readonly pollyClient: PollyClient) {}

  async synthesize(
    text: string,
    engine: NarrationEngine,
    voiceId: NarrationVoiceId,
  ): Promise<SynthesizedSpeech> {
    const result = await this.pollyClient.send(
      new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: "mp3",
        Engine: engine,
        VoiceId: voiceId,
        LanguageCode: "ja-JP",
      }),
    );
    if (!result.AudioStream) {
      throw new Error("Pollyから音声データが返されませんでした");
    }
    const audioBytes = await result.AudioStream.transformToByteArray();
    return { audioBytes, contentType: "audio/mpeg" };
  }
}
