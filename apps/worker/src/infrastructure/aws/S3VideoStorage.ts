import fs from "node:fs";
import { GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { VideoStorage } from "../../application/ports/VideoStorage";
import type { RenderedVideoLocation } from "../../domain/entities/RenderedVideo";

const OUTPUT_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7日間

/** `VideoStorage` ポートのS3実装。 */
export class S3VideoStorage implements VideoStorage {
  constructor(
    private readonly s3Client: S3Client,
    private readonly bucket: string,
  ) {}

  async uploadRenderedVideo(videoId: string, localFilePath: string): Promise<RenderedVideoLocation> {
    const outputKey = `videos/${videoId}.mp4`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: outputKey,
        Body: fs.createReadStream(localFilePath),
        ContentType: "video/mp4",
      }),
    );

    const outputUrl = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: this.bucket, Key: outputKey }),
      { expiresIn: OUTPUT_URL_EXPIRY_SECONDS },
    );

    return { outputBucket: this.bucket, outputKey, outputUrl };
  }
}
