import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "./clients";
import { config } from "./config";

const sendEmail = async (
  to: string,
  subject: string,
  bodyText: string,
): Promise<void> => {
  await sesClient.send(
    new SendEmailCommand({
      Source: config.sesSenderEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Text: { Data: bodyText, Charset: "UTF-8" } },
      },
    }),
  );
};

export const notifySuccess = async (
  to: string,
  videoId: string,
  title: string,
  outputUrl: string,
): Promise<void> => {
  await sendEmail(
    to,
    `[動画生成完了] ${title}`,
    [
      `動画「${title}」の生成が完了しました。`,
      "",
      `動画ID: ${videoId}`,
      `ダウンロードURL (7日間有効): ${outputUrl}`,
    ].join("\n"),
  );
};

export const notifyFailure = async (
  to: string,
  videoId: string,
  title: string,
  errorMessage: string,
): Promise<void> => {
  await sendEmail(
    to,
    `[動画生成失敗] ${title}`,
    [
      `動画「${title}」の生成に失敗しました。`,
      "",
      `動画ID: ${videoId}`,
      `エラー内容: ${errorMessage}`,
    ].join("\n"),
  );
};
