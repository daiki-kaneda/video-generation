import { config } from "./infrastructure/config";
import { docClient, pollyClient, s3Client, sesClient, sqsClient } from "./infrastructure/aws/awsClients";
import { DynamoDbJobRepository } from "./infrastructure/aws/DynamoDbJobRepository";
import { SqsJobQueue } from "./infrastructure/aws/SqsJobQueue";
import { S3VideoStorage } from "./infrastructure/aws/S3VideoStorage";
import { S3AudioCache } from "./infrastructure/aws/S3AudioCache";
import { SesNotificationService } from "./infrastructure/aws/SesNotificationService";
import { PollySpeechSynthesizer } from "./infrastructure/aws/PollySpeechSynthesizer";
import { RemotionVideoRenderer } from "./infrastructure/remotion/RemotionVideoRenderer";
import { FfprobeAudioDurationProbe } from "./infrastructure/system/FfprobeAudioDurationProbe";
import { ApplyNarrationUseCase } from "./application/usecases/ApplyNarrationUseCase";
import { ProcessVideoJobUseCase } from "./application/usecases/ProcessVideoJobUseCase";
import { PollAndProcessJobsUseCase } from "./application/usecases/PollAndProcessJobsUseCase";

/*
 * --- Composition Root ---
 * AWS SDKのクライアント生成・具体的なアダプターの組み立ては、アプリケーション全体でここでのみ行う。
 * `application`(ユースケース・ポート)・`domain`(エンティティ)はAWSは元より、
 * ここで選んだアダプターの実装詳細を一切知らない。
 */
const jobRepository = new DynamoDbJobRepository(docClient, config.tableName);
const jobQueue = new SqsJobQueue(sqsClient, config.queueUrl, {
  maxMessagesPerPoll: config.maxMessagesPerPoll,
  waitTimeSeconds: config.waitTimeSeconds,
  visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
});
const videoStorage = new S3VideoStorage(s3Client, config.outputBucket);
const notificationService = new SesNotificationService(sesClient, config.sesSenderEmail);
const speechSynthesizer = new PollySpeechSynthesizer(pollyClient);
// ナレーション音声のキャッシュも動画と同じ出力バケットを間借りする(tts-cache/ プレフィックス配下)。
const audioCache = new S3AudioCache(s3Client, config.outputBucket);
const audioDurationProbe = new FfprobeAudioDurationProbe();
const videoRenderer = new RemotionVideoRenderer();

const applyNarrationUseCase = new ApplyNarrationUseCase(speechSynthesizer, audioCache, audioDurationProbe);
const processVideoJobUseCase = new ProcessVideoJobUseCase(
  jobRepository,
  videoRenderer,
  videoStorage,
  notificationService,
  applyNarrationUseCase,
);
const pollAndProcessJobsUseCase = new PollAndProcessJobsUseCase(jobQueue, processVideoJobUseCase);

/*
 * --- プロセスのライフサイクル管理 (エントリーポイント) ---
 * SQSのロングポーリング・シグナルハンドリングはECS Fargateタスクの実行環境に紐づく
 * ブートストラップ処理であり、ユースケースそのものではないためここに置く。
 */
let shuttingDown = false;

const registerShutdownHandlers = (): void => {
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, will stop polling after current batch`);
    shuttingDown = true;
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SQSをロングポーリングし続けるメインループ。
 * ECS Fargate タスクのエントリーポイントとして常駐実行される。
 */
const pollLoop = async (): Promise<void> => {
  console.log("Worker started. Polling", config.queueUrl);

  while (!shuttingDown) {
    try {
      await pollAndProcessJobsUseCase.pollOnce();
    } catch (err) {
      console.error("Error while polling SQS", err);
      // 一時的なエラー(スロットリング等)で無限ループにならないよう待機してから再試行する。
      await sleep(5_000);
    }
  }

  console.log("Worker stopped.");
};

registerShutdownHandlers();
pollLoop().catch((err) => {
  console.error("Fatal error in worker poll loop", err);
  process.exit(1);
});
