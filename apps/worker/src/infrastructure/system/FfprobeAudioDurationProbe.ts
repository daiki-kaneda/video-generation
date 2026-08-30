import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AudioDurationProbe } from "../../application/ports/AudioDurationProbe";

const execFileAsync = promisify(execFile);

/**
 * `AudioDurationProbe` ポートのffprobe実装。
 * 音声データを一時ファイルに書き出し、ffprobeで長さ(秒)を取得する。
 */
export class FfprobeAudioDurationProbe implements AudioDurationProbe {
  async getDurationSeconds(audioBytes: Uint8Array): Promise<number> {
    const tmpFilePath = path.join(os.tmpdir(), `narration-${randomUUID()}.mp3`);
    try {
      await fs.writeFile(tmpFilePath, audioBytes);
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        tmpFilePath,
      ]);
      const duration = Number.parseFloat(stdout.trim());
      if (!Number.isFinite(duration)) {
        throw new Error(`ffprobeで音声の長さを取得できませんでした: ${tmpFilePath}`);
      }
      return duration;
    } finally {
      await fs.rm(tmpFilePath, { force: true });
    }
  }
}
