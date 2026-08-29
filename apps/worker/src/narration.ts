import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import type {
  CreateVideoRequest,
  NarrationConfig,
  VideoScene,
} from "@video-generation/shared";
import { pollyClient, s3Client } from "./clients";
import { config } from "./config";

const execFileAsync = promisify(execFile);

const NARRATION_CACHE_PREFIX = "tts-cache/";
/** 署名付きURLの有効期限。レンダリング中に取得できれば十分な長さで良い。 */
const NARRATION_URL_EXPIRY_SECONDS = 60 * 60 * 24;
/** ナレーションが途中で切れないよう、音声の実際の長さに足す余白(秒) */
const NARRATION_DURATION_BUFFER_SECONDS = 0.3;

export interface NarrationResult {
  audioUrl: string;
  durationSeconds: number;
}

/**
 * シーンの読み上げテキストを決定する。
 * `narrationSkip` が true、または読み上げるテキストが無い場合は `undefined` を返す
 * (= このシーンはナレーション対象外、Pollyの課金対象文字数にも含まれない)。
 * `narrationText` が指定されていればそれを優先し、無ければ `text`/`subtext` を結合する。
 */
export const resolveNarrationText = (
  scene: Pick<VideoScene, "narrationText" | "text" | "subtext" | "narrationSkip">,
): string | undefined => {
  if (scene.narrationSkip) {
    return undefined;
  }
  if (scene.narrationText && scene.narrationText.trim().length > 0) {
    return scene.narrationText.trim();
  }
  const parts = [scene.text, scene.subtext].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join("。");
};

/**
 * ナレーションのS3キャッシュキーを生成する。
 * 同一テキスト×engine×voiceIdの組み合わせは同じキーになるため、
 * 一度合成した音声はPollyを再度呼び出すことなく使い回せる(コスト削減)。
 */
export const getNarrationCacheKey = (
  text: string,
  engine: NarrationConfig["engine"],
  voiceId: NarrationConfig["voiceId"],
): string => {
  const hash = createHash("sha256")
    .update(JSON.stringify({ text, engine, voiceId }))
    .digest("hex");
  return `${NARRATION_CACHE_PREFIX}${engine}/${voiceId}/${hash}.mp3`;
};

const objectExists = async (bucket: string, key: string): Promise<boolean> => {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
};

/**
 * ffprobeで音声ファイルの長さ(秒)を取得する。
 * Pollyの Speech Marks API(発話タイミング情報)は文字数に対して別課金されるため、
 * 実際に生成された音声ファイルを解析するこの方法でコストをかけずに尺を把握する。
 */
const getAudioDurationSeconds = async (localFilePath: string): Promise<number> => {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    localFilePath,
  ]);
  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration)) {
    throw new Error(`ffprobeで音声の長さを取得できませんでした: ${localFilePath}`);
  }
  return duration;
};

/**
 * 1シーン分のナレーション音声を用意する。
 * S3キャッシュにヒットすればPollyを呼び出さずに再利用し(コスト削減)、
 * ミスした場合のみ `SynthesizeSpeech` を呼び出してキャッシュに保存する。
 */
export const synthesizeNarration = async (
  text: string,
  engine: NarrationConfig["engine"],
  voiceId: NarrationConfig["voiceId"],
): Promise<NarrationResult> => {
  const bucket = config.outputBucket;
  const key = getNarrationCacheKey(text, engine, voiceId);
  const tmpFilePath = path.join(
    os.tmpdir(),
    `narration-${createHash("sha1").update(key).digest("hex")}.mp3`,
  );

  try {
    const cached = await objectExists(bucket, key);
    if (cached) {
      const getResult = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const audioBytes = await getResult.Body?.transformToByteArray();
      if (!audioBytes) {
        throw new Error("キャッシュ済みナレーション音声の取得に失敗しました");
      }
      await fs.writeFile(tmpFilePath, audioBytes);
    } else {
      const result = await pollyClient.send(
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
      await fs.writeFile(tmpFilePath, audioBytes);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: audioBytes,
          ContentType: "audio/mpeg",
        }),
      );
    }

    const durationSeconds = await getAudioDurationSeconds(tmpFilePath);
    const audioUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: NARRATION_URL_EXPIRY_SECONDS },
    );

    return { audioUrl, durationSeconds };
  } finally {
    await fs.rm(tmpFilePath, { force: true });
  }
};

/**
 * 動画全体のナレーションを合成する。
 * `narration.enabled` が false の場合は何もせず入力をそのまま返す(Pollyは一切呼ばれない)。
 * シーンごとに `narrationAudioUrl` を設定し、ナレーション長がシーンの表示時間を超える場合は
 * `durationInSeconds` を自動的に延長する。
 * 個々のシーンの合成に失敗しても、そのシーンをナレーションなしで処理を継続する
 * (ジョブ全体を失敗させて Fargate の再実行コストを発生させないため)。
 */
export const applyNarration = async (
  input: CreateVideoRequest,
): Promise<CreateVideoRequest> => {
  if (!input.narration.enabled) {
    return input;
  }

  const scenes = await Promise.all(
    input.scenes.map(async (scene) => {
      if (scene.narrationAudioUrl) {
        // 既に合成済み(またはユーザーが直接指定した)URLがあれば再利用する
        return scene;
      }
      const text = resolveNarrationText(scene);
      if (!text) {
        return scene;
      }
      try {
        const { audioUrl, durationSeconds } = await synthesizeNarration(
          text,
          input.narration.engine,
          input.narration.voiceId,
        );
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
    }),
  );

  return { ...input, scenes };
};
