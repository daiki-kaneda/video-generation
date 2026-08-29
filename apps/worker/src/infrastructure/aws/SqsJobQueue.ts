import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type SQSClient,
} from "@aws-sdk/client-sqs";
import type { JobQueue, QueueMessage } from "../../application/ports/JobQueue";

export interface SqsJobQueueOptions {
  maxMessagesPerPoll: number;
  waitTimeSeconds: number;
  visibilityTimeoutSeconds: number;
}

/** `JobQueue` ポートのSQS実装。 */
export class SqsJobQueue implements JobQueue {
  constructor(
    private readonly sqsClient: SQSClient,
    private readonly queueUrl: string,
    private readonly options: SqsJobQueueOptions,
  ) {}

  async receiveMessages(): Promise<QueueMessage[]> {
    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.options.maxMessagesPerPoll,
        WaitTimeSeconds: this.options.waitTimeSeconds,
        VisibilityTimeout: this.options.visibilityTimeoutSeconds,
      }),
    );

    const messages: QueueMessage[] = [];
    for (const message of response.Messages ?? []) {
      if (!message.Body || !message.ReceiptHandle) {
        console.warn("Skipping malformed SQS message", message.MessageId);
        continue;
      }
      messages.push({ body: message.Body, receiptHandle: message.ReceiptHandle });
    }
    return messages;
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }
}
