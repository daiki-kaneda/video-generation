import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface QueueConstructProps {
  namePrefix: string;
}

/**
 * 動画生成ジョブのキュー。Fargate ワーカーがポーリングする。
 * 規定回数処理に失敗したメッセージは DLQ に移動する。
 */
export class QueueConstruct extends Construct {
  public readonly queue: sqs.Queue;
  public readonly deadLetterQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: QueueConstructProps) {
    super(scope, id);

    this.deadLetterQueue = new sqs.Queue(this, "DeadLetterQueue", {
      queueName: `${props.namePrefix}-video-render-dlq`,
      retentionPeriod: Duration.days(14),
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.queue = new sqs.Queue(this, "VideoRenderQueue", {
      queueName: `${props.namePrefix}-video-render-queue`,
      // レンダリングの最大想定時間より十分長い可視性タイムアウト
      visibilityTimeout: Duration.minutes(15),
      retentionPeriod: Duration.days(4),
      deadLetterQueue: {
        queue: this.deadLetterQueue,
        maxReceiveCount: 3,
      },
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
