import fs from "node:fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./clients";
import { config } from "./config";

const OUTPUT_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7日間

export interface UploadResult {
  outputBucket: string;
  outputKey: string;
  outputUrl: string;
}

/**
 * レンダリング済みの動画ファイルをS3にアップロードし、
 * ダウンロード用の署名付きURLを発行する。
 */
export const uploadRenderedVideo = async (
  videoId: string,
  localFilePath: string,
): Promise<UploadResult> => {
  const outputBucket = config.outputBucket;
  const outputKey = `videos/${videoId}.mp4`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: outputBucket,
      Key: outputKey,
      Body: fs.createReadStream(localFilePath),
      ContentType: "video/mp4",
    }),
  );

  const outputUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: outputBucket, Key: outputKey }),
    { expiresIn: OUTPUT_URL_EXPIRY_SECONDS },
  );

  return { outputBucket, outputKey, outputUrl };
};
