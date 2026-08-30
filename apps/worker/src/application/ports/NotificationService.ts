/**
 * ユーザーへの生成完了/失敗通知を担うポート。
 * 実装はSES等に依存するが、このインターフェース自体は依存しない。
 */
export interface NotificationService {
  notifySuccess(to: string, videoId: string, title: string, outputUrl: string): Promise<void>;
  notifyFailure(to: string, videoId: string, title: string, errorMessage: string): Promise<void>;
}
