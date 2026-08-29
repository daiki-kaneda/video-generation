# 計画: TTS連携によるナレーション自動生成(コスト最小化重視)

## 1. 背景・目的

`newsBulletin`(ニュース速報)や今後追加予定のショート動画テンプレートでは、画面のテロップだけでなく
音声ナレーションが実質必須の表現要素になる。本ドキュメントは、シーンの `text`/`subtext` から
ナレーション音声を自動生成し、動画に合成する機能の設計を、**コストを最小限に抑える方向**でまとめる。

対象シーン数・文字数は既存スキーマで既に上限が設定されているため(`text` ≤280文字、`subtext` ≤280文字、
シーン数 ≤30)、TTSの利用量は自然に頭打ちになる。この制約を前提にコスト試算・設計判断を行う。

## 2. TTSサービスの比較検討

| サービス | 価格帯 (100万文字あたり) | 備考 |
|---|---|---|
| **Amazon Polly (Standard)** | **$4.00** | 最安。日本語は Mizuki(女性)/ Takumi(男性)の2voice。品質はやや機械的だが、ニュース原稿の読み上げ用途には十分実用的 |
| Amazon Polly (Neural) | $16.00 | 日本語は Takumi(男性)/ Kazuha・Tomoko(女性)の3voice。自然な抑揚。Standardの4倍 |
| Amazon Polly (Generative) | $30.00 | 日本語音声は現状提供されていない(2026年8月時点) |
| Amazon Polly (Long-Form) | $100.00 | 日本語音声なし。長尺ナレーション向けで本用途には過剰 |
| Google Cloud TTS | Standard $4 / WaveNet-Neural $16 相当 | Pollyとほぼ同水準。ただしAWSスタック外への追加のクロスクラウド連携(認証情報・SDK・egress)が必要になり運用コストが増える |
| Azure AI Speech | オンデマンド $15/100万文字〜 | Pollyより高め |
| OpenAI TTS (`tts-1`) | 約$15/100万文字 | 高品質だがAWS外部サービス、レイテンシ・可用性もPollyより不安定になりがち |
| ElevenLabs | 月額サブスクリプション制(従量ではない) | 最高品質だが小規模利用でも固定費が高く、コスト最小化の方針に合わない |

**結論: Amazon Polly を採用し、既定は Standard エンジンとする。**

理由:
- 既存インフラが全面的にAWS(Fargateワーカーが既に同一IAMロール・同一リージョンで動作)であり、
  新規ベンダー統合(APIキー管理、ネットワークegress許可、SDK追加)が不要。
- Standard エンジンは Neural の 1/4 のコストで、ニュース原稿の読み上げ用途では実用上十分な品質。
- Polly は「新規AWSアカウントは12ヶ月間 Standard 500万文字/月が無料」という追加の無料枠もある
  (既存アカウントでは適用外の可能性があるため試算には含めない)。

## 3. コスト試算(既存スキーマの上限を前提)

- 1シーンの最大文字数: `text`(280) + `subtext`(280) = 560文字
- 1動画の最大シーン数: 30
- **理論上の最大値: 560 × 30 = 16,800文字/動画**

| エンジン | 平均的な動画(5シーン、シーンあたり150文字 ≒ 750文字/動画) | 最大構成(30シーン、16,800文字/動画) |
|---|---|---|
| Standard ($4/100万文字) | 約$0.003/本 | 約$0.067/本 |
| Neural ($16/100万文字) | 約$0.012/本 | 約$0.27/本 |

月間1,000本生成しても Standard で $3〜$67、Neural でも $12〜$270 程度に収まる計算になり、
既存のスキーマ上限がそのままコストのガードレールとして機能している。
過度な追加のコスト対策(文字数の追加課金枠、月次予算アラームなど)は初期スコープでは不要と判断するが、
運用開始後にCloudWatch Billing Alarmで `AWS/Polly` の使用量を監視することは推奨する。

## 4. コスト最小化のための設計方針

1. **既定エンジンは Standard 固定**。Neural は動画単位のオプトインとし、選択時にコスト差(4倍)を
   フロントエンドに表示してユーザーに意識させる。
2. **S3キャッシュによる重複排除**: `(正規化したナレーションテキスト, voiceId, engine, languageCode)` の
   ハッシュをキーに `s3://<bucket>/tts-cache/<hash>.mp3` を検索し、存在すればPollyを呼ばずに再利用する。
   同じ台本(定型の挨拶・注意書き・キャンペーン文言など)を使い回すケースでコストがほぼゼロになる。
3. **Speech Marks は使わない**: Pollyの発話タイミング情報(Speech Marks)はSSMLタグ等を除いた
   文字数に対して**別課金(同エンジン単価が加算)**されるため、字幕同期や尺調整のためだけに
   Speech Marksを使うとコストが実質2倍になる。本設計では生成した音声ファイルを`ffprobe`で解析して
   実際の再生時間を取得する(無料)方式を採用し、Speech Marks APIは使用しない。
4. **同期API (`SynthesizeSpeech`) のみを使用**: 1シーンの最大文字数(560文字)はPollyの同期APIの
   上限(3,000文字)を大きく下回るため、シーンごとに1回の同期呼び出しで完結させる。
   非同期API(`StartSpeechSynthesisTask`、長尺音声向け)や追加のS3ポーリングは不要で、
   実装・運用コストの両方を抑えられる。
5. **ナレーション対象の絞り込み**: `text`/`subtext` が空のシーン、または明示的に無効化されたシーンは
   Pollyを呼び出さない(課金対象文字数を最小化)。
6. **失敗時のフォールバック**: Polly呼び出しが失敗してもジョブ全体を失敗させず、該当シーンのナレーション
   なしで動画を完成させる(Fargateタスクの再実行コストを避ける)。
7. **既存のFargateワーカー内で完結させる**: 専用Lambdaやマイクロサービスを追加しない。
   ワーカーは既にAWS SDK・IAMロールを持っているため、`@aws-sdk/client-polly` を追加するだけで済み、
   追加のコンピューティングリソース費用が発生しない(Polly呼び出しはI/O待ちが中心で、
   Fargateタスクの実行時間への影響も1シーンあたり数百ms程度と軽微)。

## 5. アーキテクチャ設計

### 5.1 処理の流れ

```
processJob.ts
  1. job.input (CreateVideoRequest) を取得
  2. narration.enabled が true の場合、
     applyNarration(input) を呼び出す (新規: apps/worker/src/narration.ts)
       - シーンごとに: ナレーション対象テキストを決定
         (scene.narrationText があれば優先、無ければ text + "。" + subtext を結合)
       - キャッシュキー(SHA-256ハッシュ)を計算し、S3の tts-cache/ を確認
       - キャッシュがヒットしなければ Polly.SynthesizeSpeech を呼び出し、
         結果をS3にアップロード(以後のキャッシュとして永続化)
       - ffprobe で音声の長さを取得
       - scene.narrationAudioUrl (署名付きURL) を設定
       - durationInSeconds を「ナレーション長 + 余白(例: 0.3秒)」未満にしない
         ように自動調整(元の値の方が長ければそのまま維持)
     -> 加工済みの CreateVideoRequest を返す
  3. renderVideo(videoId, 加工済みinput) を呼び出す (既存のまま)
```

- ナレーション合成・尺調整は **Remotionのレンダリング前(ワーカー内の前処理)** で完結させる。
  Remotionコンポジション自体はAWS SDKを呼び出さず、常に「すでに用意された音声URLと確定した
  シーン尺」を受け取るだけにする(Remotion Studioでのプレビューや純粋なレンダリングの
  決定性を保つため)。

### 5.2 スキーマ変更 (`packages/shared/src/schema.ts`)

```typescript
export const NarrationEngine = { STANDARD: "standard", NEURAL: "neural" } as const;
// ...

export const NarrationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  engine: z.enum(NARRATION_ENGINES).default("standard"),
  // Standard: Mizuki(女性) / Takumi(男性)。Neural: Takumi / Kazuha / Tomoko
  voiceId: z.enum(NARRATION_VOICE_IDS).default("Takumi"),
  languageCode: z.literal("ja-JP").default("ja-JP"),
});

// VideoSceneSchema に追加
narrationText: z.string().max(560).optional(), // 未指定なら text+subtextから自動生成
narrationSkip: z.boolean().default(false),      // このシーンだけナレーションを無効化

// CreateVideoRequestSchema に追加
narration: NarrationConfigSchema.default({}),
```

### 5.3 ワーカー (`apps/worker`)

- `src/narration.ts` (新規)
  - `synthesizeNarrationForScene(text, engine, voiceId, cacheBucket)`:
    キャッシュ確認 → (ミス時のみ) Polly呼び出し → S3アップロード → `{ url, durationSeconds }` を返す
  - `applyNarration(input: CreateVideoRequest): Promise<CreateVideoRequest>`:
    上記をシーンごとに実行し、`narrationAudioUrl` 付与・`durationInSeconds` 調整を行う
- `src/clients.ts`: `PollyClient` を追加
- `src/processJob.ts`: `renderVideo` 呼び出し前に `applyNarration` を呼ぶ一行を追加
- キャッシュ先バケット: 追加のバケットは作らず、既存の `outputBucket`(ワーカーが既にRead/Write権限を
  持つ)に `tts-cache/` プレフィックスで保存する(IAM変更を最小化するため)

### 5.4 Remotion (`packages/remotion-video`)

- 各テンプレート(`SimpleTemplate`/`ProductShowcaseTemplate`/`NewsBulletinTemplate`)のシーン内に
  `scene.narrationAudioUrl` があれば `<Audio src={...} />` を追加するだけ
  (`TransitionSeries.Sequence` の中でシーンごとに独立して再生されるため、タイミング調整は不要)
- 既存のBGM(`audioUrl`、動画全体に対して1トラック)と共存させるため、ナレーションがあるシーンでは
  BGMの音量を下げる(ダッキング)処理を `VideoComposition.tsx` に追加検討
  (初期スコープでは固定の低ボリューム値、例: ナレーション有り動画は `audioVolume` を0.3倍にする、
  程度のシンプルな実装に留め、動的な音声解析によるダッキングは将来拡張とする)

### 5.5 インフラ (`infra`)

- `WorkerConstruct` の `taskDefinition.taskRole` に `polly:SynthesizeSpeech` を許可する
  `iam.PolicyStatement` を追加(Pollyはリソースレベル権限がないため `resources: ["*"]`)
- 新規AWSリソースは不要(既存の `outputBucket` を再利用)

### 5.6 フロントエンド (`apps/web`)

- `NewVideoPage.tsx`: 「ナレーションを自動生成する」チェックボックス + エンジン選択
  (Standard/Neural、Neural選択時は「読み上げ文字数に応じて費用が上がります」の注記)
- `SceneEditor.tsx`: シーンごとに「このシーンのナレーションを無効化」チェックボックスと、
  読み上げテキストを `text`/`subtext` と別に指定したい場合の任意入力欄(`narrationText`)

## 6. 実装ステップ

1. スキーマ: `NarrationConfigSchema`・シーンの `narrationText`/`narrationSkip` を追加
2. ワーカー: `@aws-sdk/client-polly` 追加、`narration.ts`(キャッシュ・合成・尺調整)実装
3. ワーカー: `processJob.ts` に `applyNarration` 呼び出しを組み込み
4. Remotion: 各テンプレートに `<Audio src={scene.narrationAudioUrl}>` を追加、BGMダッキングの簡易実装
5. インフラ: `WorkerConstruct` にPollyの実行権限を追加、`cdk synth` で検証
6. フロントエンド: ナレーション設定UI(動画全体のトグル・エンジン選択、シーン単位の無効化/上書き)
7. ドキュメント (`docs/architecture.md`) にナレーション機能とコスト特性を追記
8. 検証: キャッシュヒット/ミスの両方のパスで実レンダリングを行い、
   - 音声が正しいタイミングで再生されること
   - キャッシュが2回目以降Pollyを呼ばないこと(CloudWatch Logsで確認、またはユニットテストでモック)
   - ナレーションが `durationInSeconds` を超える場合にシーンの尺が自動延長されること
   を確認する

## 7. 将来の拡張候補(初期スコープ外)

- BGMの動的ダッキング(ナレーション区間のみ音量を滑らかに下げる、`@remotion/media-utils` 等での
  音声波形解析)
- SSMLによる読み上げ調整(ポーズ・略語の読み方指定)。SSMLのタグ自体は課金対象文字数に含まれないため、
  追加コストなしで導入可能
- 英語など多言語対応(Polly Generative/Long-Formは英語圏の音声が豊富なため、言語によっては
  Neural以外の選択肢も検討可能)
- 自動字幕(キャプション)生成。Speech Marksを使う場合はコスト増(倍額)になる点に注意し、
  必要になった時点で追加のコスト試算を行う
