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
import { EnvVar } from "@video-generation/shared";
import { Construct } from "constructs";

export interface WorkerConstructProps {
  namePrefix: string;
  table: dynamodb.Table;
  queue: sqs.Queue;
  outputBucket: s3.Bucket;
  assetBucket: s3.Bucket;
  sesSenderEmail: string;
  /** 常時稼働させるタスク数 */
  desiredCount?: number;
  maxCapacity?: number;
}

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

/**
 * SQSをポーリングしてRemotionレンダリングを実行するFargateワーカー。
 */
export class WorkerConstruct extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: WorkerConstructProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
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

    this.service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: props.desiredCount ?? 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      circuitBreaker: { rollback: true },
    });

    const scaling = this.service.autoScaleTaskCount({
      minCapacity: props.desiredCount ?? 1,
      maxCapacity: props.maxCapacity ?? 5,
    });

    // キューの滞留メッセージ数に応じてワーカー数をスケールさせる。
    scaling.scaleOnMetric("ScaleOnQueueDepth", {
      metric: props.queue.metricApproximateNumberOfMessagesVisible({
        period: Duration.minutes(1),
      }),
      scalingSteps: [
        { upper: 0, change: 0 },
        { lower: 1, change: +1 },
        { lower: 10, change: +2 },
        { lower: 50, change: +5 },
      ],
      cooldown: Duration.minutes(2),
    });
  }
}
