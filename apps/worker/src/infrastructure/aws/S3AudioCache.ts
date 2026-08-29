import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AudioCache } from "../../application/ports/AudioCache";

const NARRATION_CACHE_PREFIX = "tts-cache/";
const NARRATION_CACHE_EXTENSION = ".mp3";

/**
 * `AudioCache` ポートのS3実装。
 * 論理キーを実際のS3オブジェクトキー(`tts-cache/<key>.mp3`)へマッピングする責務を持つ。
 */
export class S3AudioCache implements AudioCache {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucket: string,
  ) {}

  private toObjectKey(key: string): string {
    return `${NARRATION_CACHE_PREFIX}${key}${NARRATION_CACHE_EXTENSION}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.toObjectKey(key) }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<Uint8Array> {
    const result = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.toObjectKey(key) }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error(`キャッシュ済みナレーション音声の取得に失敗しました: ${key}`);
    }
    return bytes;
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.toObjectKey(key),
        Body: bytes,
        ContentType: contentType,
      }),
    );
  }

  async getPublicUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: this.bucket, Key: this.toObjectKey(key) }),
      { expiresIn: expiresInSeconds },
    );
  }
}
