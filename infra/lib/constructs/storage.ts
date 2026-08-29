import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { USER_CREATED_AT_INDEX } from "@video-generation/shared";
import { Construct } from "constructs";

export interface StorageConstructProps {
  namePrefix: string;
}

/**
 * ジョブ状態を保持する DynamoDB テーブルと、
 * 入力アセット / 出力動画を保持する S3 バケット。
 */
export class StorageConstruct extends Construct {
  public readonly table: dynamodb.Table;
  public readonly assetBucket: s3.Bucket;
  public readonly outputBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, "VideoJobsTable", {
      tableName: `${props.namePrefix}-video-jobs`,
      partitionKey: { name: "videoId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: USER_CREATED_AT_INDEX,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.assetBucket = new s3.Bucket(this, "AssetBucket", {
      bucketName: undefined, // CDKに自動生成させ、名前衝突を避ける
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        { id: "expire-old-assets", expiration: Duration.days(90) },
      ],
    });

    this.outputBucket = new s3.Bucket(this, "OutputBucket", {
      bucketName: undefined,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        { id: "expire-old-outputs", expiration: Duration.days(30) },
      ],
    });
  }
}
