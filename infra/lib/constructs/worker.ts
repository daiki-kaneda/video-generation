import * as path from "node:path";
import { Duration } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as appscaling from "aws-cdk-lib/aws-applicationautoscaling";
import { EnvVar } from "@video-generation/shared";
import { Construct } from "constructs";

export interface WorkerConstructProps {
  namePrefix: string;
  table: dynamodb.Table;
  queue: sqs.Queue;
  outputBucket: s3.Bucket;
  assetBucket: s3.Bucket;
  sesSenderEmail: string;
  /** デプロイ直後の初期タスク数。以降はキューの状態に応じてオートスケーリングが上書きする。既定は0。 */
  desiredCount?: number;
  /** オートスケーリングの最小タスク数。既定は0(キューが空の間はタスクを起動せず常時稼働コストをゼロにする)。 */
  minCapacity?: number;
  maxCapacity?: number;
}

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

/**
 * SQSをポーリングしてRemotionレンダリングを実行するFargateワーカー。
 *
 * コスト最適化のため、以下の2点を徹底している:
 * 1. **NATゲートウェイを使わない**: タスクはパブリックサブネットに配置し、
 *    パブリックIPを付与してインターネットゲートウェイ経由で直接アウトバウンド通信する
 *    (NATゲートウェイの時間課金・データ処理課金を回避)。DynamoDB/S3への通信は
 *    無料のGateway VPCエンドポイント経由でAWSネットワーク内に閉じる。
 *    タスクにはインバウンドを許可するセキュリティグループルールを一切設定していないため、
 *    パブリックIPを持っていても外部から到達可能なポートは無い。
 * 2. **キューが空の間はタスクを0台にスケールインする**: SQSの滞留メッセージ数
 *    (処理中で不可視のものを含む)に応じたステップスケーリングで、
 *    メッセージが無くなればFargateタスクを0台にし、常時稼働コストをゼロにする。
 */
export class WorkerConstruct extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: WorkerConstructProps) {
    super(scope, id);

    // NATゲートウェイは作成しない(natGateways: 0)。タスクは後述のとおりパブリックサブネットに
    // 配置してインターネットゲートウェイ経由で直接通信するため、プライベートサブネットは不要。
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "Public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });

    // DynamoDB/S3向け通信はAWSネットワーク内に閉じるGateway VPCエンドポイント経由にする
    // (追加料金無し。インターネットゲートウェイ経由よりも優先してルーティングされる)。
    vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
    vpc.addGatewayEndpoint("DynamoDbEndpoint", {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: `${props.namePrefix}-video-cluster`,
      containerInsights: true,
    });

    const dockerImageAsset = new ecrAssets.DockerImageAsset(
      this,
      "WorkerImage",
      {
        directory: REPO_ROOT,
        file: path.join("apps", "worker", "Dockerfile"),
        platform: ecrAssets.Platform.LINUX_AMD64,
      },
    );

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 2048,
      memoryLimitMiB: 4096,
    });

    const logGroup = new logs.LogGroup(this, "WorkerLogGroup", {
      logGroupName: `/ecs/${props.namePrefix}-video-worker`,
      retention: logs.RetentionDays.TWO_WEEKS,
    });

    taskDefinition.addContainer("WorkerContainer", {
      image: ecs.ContainerImage.fromDockerImageAsset(dockerImageAsset),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "worker",
        logGroup,
      }),
      environment: {
        [EnvVar.TABLE_NAME]: props.table.tableName,
        [EnvVar.QUEUE_URL]: props.queue.queueUrl,
        [EnvVar.OUTPUT_BUCKET]: props.outputBucket.bucketName,
        [EnvVar.ASSET_BUCKET]: props.assetBucket.bucketName,
        [EnvVar.SES_SENDER_EMAIL]: props.sesSenderEmail,
      },
    });

    props.table.grantReadWriteData(taskDefinition.taskRole);
    props.queue.grantConsumeMessages(taskDefinition.taskRole);
    props.outputBucket.grantReadWrite(taskDefinition.taskRole);
    props.assetBucket.grantRead(taskDefinition.taskRole);
    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      }),
    );
    // ナレーション自動生成 (Amazon Polly) 用。Pollyはリソースレベル権限をサポートしないため resources: "*"。
    // 合成した音声のキャッシュ・保存先は既存の outputBucket (grantReadWrite 済み) を再利用する。
    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["polly:SynthesizeSpeech"],
        resources: ["*"],
      }),
    );

    this.service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: props.desiredCount ?? 0,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      // NATゲートウェイを使わずインターネットゲートウェイ経由で直接アウトバウンド通信するために必要。
      // セキュリティグループにインバウンドルールを追加していないため、外部から到達可能にはならない。
      assignPublicIp: true,
      circuitBreaker: { rollback: true },
    });

    const minCapacity = props.minCapacity ?? 0;
    const scaling = this.service.autoScaleTaskCount({
      minCapacity,
      maxCapacity: props.maxCapacity ?? 5,
    });

    // 処理中(受信済みだが未削除・可視性タイムアウト中)のメッセージも含めた滞留数。
    // `ApproximateNumberOfMessagesVisible` だけを見ると、レンダリング中のメッセージは
    // 可視性タイムアウトの間カウントされなくなるため、スケールインの判定に使うと
    // レンダリング中にタスクを0台にしてしまう恐れがある。可視+処理中を合算した
    // このメトリクスを両方向のスケーリングで統一して使う。
    const outstandingMessages = props.queue.metricApproximateNumberOfMessagesOutstanding({
      period: Duration.minutes(1),
    });

    // --- スケールアウト: キューにメッセージが滞留し始めたら台数を増やす(0台からの起動を含む) ---
    scaling.scaleOnMetric("ScaleOutOnQueueDepth", {
      metric: outstandingMessages,
      adjustmentType: appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      scalingSteps: [
        { upper: 0, change: 0 },
        { lower: 1, change: +1 },
        { lower: 10, change: +2 },
        { lower: 50, change: +5 },
      ],
      cooldown: Duration.minutes(2),
    });

    // --- スケールイン: キューが完全に空(処理中含め0件)になったら0台に縮退する ---
    // ステップスケーリングの「増やす」方向とは別に、明示的なCloudWatchアラームで
    // 「0件になったらdesired capacityを0にする」ExactCapacityのアクションを発火させる。
    // 突発的な一瞬の0件で縮退しすぎないよう、5分間連続で0件であることを確認してから実行する。
    const queueEmptyAlarm = new cloudwatch.Alarm(this, "QueueEmptyAlarm", {
      metric: outstandingMessages,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 0,
      evaluationPeriods: 5,
      datapointsToAlarm: 5,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const scaleToZeroAction = new appscaling.StepScalingAction(this, "ScaleToZeroAction", {
      scalingTarget: scaling,
      adjustmentType: appscaling.AdjustmentType.EXACT_CAPACITY,
      cooldown: Duration.minutes(5),
    });
    scaleToZeroAction.addAdjustment({ adjustment: 0, upperBound: 0 });
    queueEmptyAlarm.addAlarmAction({
      bind: () => ({ alarmActionArn: scaleToZeroAction.scalingPolicyArn }),
    });
  }
}
