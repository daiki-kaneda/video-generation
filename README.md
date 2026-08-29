# video-generation

[Remotion](https://www.remotion.dev/) を使った非同期の動画生成ワークフローです。
ユーザーが動画内容をJSONで送信すると、SQSキュー経由でFargate上のワーカーが
Remotionでレンダリングし、完了後にメール(SES)で通知します。

詳細なアーキテクチャ設計は [docs/architecture.md](./docs/architecture.md) を参照してください。

## 処理フロー

```
ユーザ (JSON入力)
  → API Gateway + Cognito(認証)
  → Lambda: バリデーション・DynamoDBへ初期レコード作成・SQSへ登録
  → Fargate ワーカーがSQSをポーリング
      → DynamoDBに動画ID・メタデータ・ステータス(PROCESSING)を保存
      → Remotionで動画をレンダリング
      → 成功: S3へアップロード、DynamoDBを更新(COMPLETED, 動画パス)
      → 失敗: DynamoDBを更新(FAILED, エラー内容)
  → SES でユーザーにメール通知
```

## 使用しているAWSサービス

| サービス | 用途 |
|---|---|
| Cognito | ユーザー認証 (User Pool + JWT) |
| API Gateway (HTTP API) | 動画生成リクエストの受付・ステータスAPI |
| Lambda | APIロジック(バリデーション、DynamoDB書き込み、SQS送信) |
| SQS | 動画生成ジョブのキュー(+DLQ) |
| Fargate (ECS) | Remotionレンダリングを実行する常駐ワーカー |
| DynamoDB | ジョブのステータス・メタデータ管理 |
| S3 | 入力アセット・生成済み動画の保存 |
| SES | 完了/失敗のメール通知 |

## リポジトリ構成

```
.
├── docs/
│   └── architecture.md        # アーキテクチャ設計・構成図
├── infra/                     # AWS CDK (TypeScript) - 全AWSリソースを定義
├── packages/
│   ├── shared/                # API/Worker/Infra 共通の型・zodスキーマ・定数
│   └── remotion-video/        # Remotion コンポジション (動画テンプレート)
└── apps/
    ├── api/                   # API Gateway から呼ばれる Lambda ハンドラー
    └── worker/                # SQSポーリング + Remotionレンダリングを行うFargateワーカー
```

## セットアップ

Node.js 20 以上、npm を利用します(npm workspaces によるモノレポ構成)。

```bash
npm install
```

`packages/shared` は他のワークスペース(API/Worker/Infra)から利用されるため、
`npm install` 実行後に `postinstall` スクリプトで自動的にビルドされます。

### 型チェック・ビルド

```bash
npm run typecheck   # 全ワークスペースの型チェック
npm run build       # 全ワークスペースのビルド
```

### Remotion のプレビュー(Remotion Studio)

`packages/remotion-video` のコンポジションをブラウザでプレビューできます。

```bash
npm run studio --workspace=@video-generation/remotion-video
```

## デプロイ (AWS CDK)

`infra/` に AWS CDK (TypeScript) スタックがあります。デプロイには Docker(ワーカーのコンテナイメージビルド用)と、
AWSクレデンシャル・CDK Bootstrap 済みの環境が必要です。

```bash
cd infra
npx cdk bootstrap        # 初回のみ
npx cdk deploy \
  --context namePrefix=video-gen-dev \
  --context sesSenderEmail=notify@example.com
```

- `namePrefix`: 作成するリソース名の接頭辞(環境ごとに変更可能)
- `sesSenderEmail`: 通知メールの送信元アドレス。SES未検証の場合、SESのサンドボックス制限により
  受信者アドレスも別途検証が必要です(SESの本番アクセス申請、または検証済みアドレスへの送信のみ可能)。

デプロイ後、`ApiUrl` / `UserPoolId` / `UserPoolClientId` などがスタックの Output として出力されます。

## API

すべて Cognito の JWT(IDトークン)を `Authorization` ヘッダーで要求します。

### `POST /videos` — 動画生成リクエスト

```json
{
  "title": "サンプル動画",
  "scenes": [
    { "text": "こんにちは", "subtext": "最初のシーン", "backgroundColor": "#1d4ed8", "durationInSeconds": 3 },
    { "text": "さようなら", "backgroundColor": "#111827", "durationInSeconds": 2 }
  ],
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "notifyEmail": "user@example.com"
}
```

レスポンス (`202 Accepted`):

```json
{ "videoId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "status": "QUEUED", "createdAt": "..." }
```

### `GET /videos/{videoId}` — ステータス取得

```json
{
  "videoId": "...",
  "status": "COMPLETED",
  "title": "サンプル動画",
  "outputUrl": "https://...(署名付きURL, 7日間有効)",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### `GET /videos?limit=20&cursor=...` — 自分が作成したジョブの一覧取得

## ローカルでのワーカー実行(参考)

Fargateにデプロイする前に、必要な環境変数を設定してローカルでワーカーを起動することもできます
(AWSクレデンシャルおよび下記リソースへのアクセス権限が必要です)。

```bash
cd apps/worker
npm run build
VIDEO_JOBS_TABLE_NAME=... \
VIDEO_RENDER_QUEUE_URL=... \
VIDEO_OUTPUT_BUCKET=... \
SES_SENDER_EMAIL=notify@example.com \
npm start
```
