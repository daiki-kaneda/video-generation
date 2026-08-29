import * as ses from "aws-cdk-lib/aws-ses";
import { Construct } from "constructs";

export interface NotificationsConstructProps {
  /** 通知メールの送信元アドレス。SESでの検証が必要。 */
  senderEmail: string;
}

/**
 * SES による完了/失敗メール通知の送信元アイデンティティ。
 * (サンドボックス環境では受信者アドレスも別途 SES 側で検証が必要)
 */
export class NotificationsConstruct extends Construct {
  public readonly senderEmail: string;

  constructor(
    scope: Construct,
    id: string,
    props: NotificationsConstructProps,
  ) {
    super(scope, id);

    this.senderEmail = props.senderEmail;

    new ses.EmailIdentity(this, "SenderIdentity", {
      identity: ses.Identity.email(props.senderEmail),
    });
  }
}
