/** キューから取得した1件のメッセージ。 */
export interface QueueMessage {
  body: string;
  receiptHandle: string;
}

/**
 * 動画生成ジョブのキューイングを担うポート。
 * 実装はSQSなど特定のメッセージキューサービスに依存するが、このインターフェース自体は依存しない。
 */
export interface JobQueue {
  /** メッセージをロングポーリング等で受信する(0件のこともある)。 */
  receiveMessages(): Promise<QueueMessage[]>;
  /** 処理済みメッセージをキューから削除する。 */
  deleteMessage(receiptHandle: string): Promise<void>;
}
