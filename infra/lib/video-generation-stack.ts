import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AuthConstruct } from "./constructs/auth";
import { StorageConstruct } from "./constructs/storage";
import { QueueConstruct } from "./constructs/queue";
import { NotificationsConstruct } from "./constructs/notifications";
import { ApiConstruct } from "./constructs/api";
import { WorkerConstruct } from "./constructs/worker";

export interface VideoGenerationStackProps extends StackProps {
  /** リソース名のプレフィックス。例: "video-gen-dev" */
  namePrefix: string;
  /** SESで検証済みの通知メール送信元アドレス */
  sesSenderEmail: string;
}

export class VideoGenerationStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: VideoGenerationStackProps,
  ) {
    super(scope, id, props);

    const auth = new AuthConstruct(this, "Auth", {
      namePrefix: props.namePrefix,
    });

    const storage = new StorageConstruct(this, "Storage", {
      namePrefix: props.namePrefix,
    });

    const queue = new QueueConstruct(this, "Queue", {
      namePrefix: props.namePrefix,
    });

    const notifications = new NotificationsConstruct(this, "Notifications", {
      senderEmail: props.sesSenderEmail,
    });

    const api = new ApiConstruct(this, "Api", {
      namePrefix: props.namePrefix,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      table: storage.table,
      queue: queue.queue,
    });

    new WorkerConstruct(this, "Worker", {
      namePrefix: props.namePrefix,
      table: storage.table,
      queue: queue.queue,
      outputBucket: storage.outputBucket,
      assetBucket: storage.assetBucket,
      sesSenderEmail: notifications.senderEmail,
    });

    new CfnOutput(this, "ApiUrl", { value: api.httpApi.apiEndpoint });
    new CfnOutput(this, "UserPoolId", { value: auth.userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, "VideoJobsTableName", {
      value: storage.table.tableName,
    });
    new CfnOutput(this, "VideoRenderQueueUrl", {
      value: queue.queue.queueUrl,
    });
    new CfnOutput(this, "OutputBucketName", {
      value: storage.outputBucket.bucketName,
    });
  }
}
