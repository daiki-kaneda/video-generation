import { SendEmailCommand, type SESClient } from "@aws-sdk/client-ses";
import type { NotificationService } from "../../application/ports/NotificationService";

/** `NotificationService` ポートのSES実装。 */
export class SesNotificationService implements NotificationService {
  constructor(
    private readonly sesClient: SESClient,
    private readonly senderEmail: string,
  ) {}

  private async sendEmail(to: string, subject: string, bodyText: string): Promise<void> {
    await this.sesClient.send(
      new SendEmailCommand({
        Source: this.senderEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Text: { Data: bodyText, Charset: "UTF-8" } },
        },
      }),
    );
  }

  async notifySuccess(to: string, videoId: string, title: string, outputUrl: string): Promise<void> {
    await this.sendEmail(
      to,
      `[動画生成完了] ${title}`,
      [
        `動画「${title}」の生成が完了しました。`,
        "",
        `動画ID: ${videoId}`,
        `ダウンロードURL (7日間有効): ${outputUrl}`,
      ].join("\n"),
    );
  }

  async notifyFailure(
    to: string,
    videoId: string,
    title: string,
    errorMessage: string,
  ): Promise<void> {
    await this.sendEmail(
      to,
      `[動画生成失敗] ${title}`,
      [
        `動画「${title}」の生成に失敗しました。`,
        "",
        `動画ID: ${videoId}`,
        `エラー内容: ${errorMessage}`,
      ].join("\n"),
    );
  }
}
