import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
// 名前付きインポートではなく名前空間インポートを使う。
// `@video-generation/shared` はCommonJSパッケージであり、Viteの依存事前バンドル(esbuild/rolldown)が
// 動的なre-export(TSの `Object.defineProperty` によるgetterベースの named export)を
// 常に静的解析できるとは限らないため、名前空間インポートの方が確実に動作する。
import * as sharedSchemas from "@video-generation/shared";
import { AppHeader } from "../components/AppHeader";
import { SceneEditor } from "../components/SceneEditor";
import { useCreateVideo } from "../hooks/useCreateVideo";
import { ApiError } from "../lib/apiClient";
import type { VideoFormInput, VideoFormOutput } from "../types/videoForm";

const { CreateVideoRequestSchema, NARRATION_VOICES_BY_ENGINE } = sharedSchemas;

const defaultValues: VideoFormInput = {
  title: "",
  templateId: "simple",
  scenes: [
    {
      text: "",
      durationInSeconds: 3,
      transitionType: "fade",
      transitionDurationInSeconds: 0.5,
    },
  ],
  fps: 30,
  width: 1920,
  height: 1080,
  narration: { enabled: false, engine: "standard", voiceId: "Takumi" },
};

const NARRATION_ENGINE_OPTIONS: { value: string; label: string }[] = [
  { value: "standard", label: "Standard(低コスト・既定 / 100万文字$4)" },
  { value: "neural", label: "Neural(高品質 / 100万文字$16, Standardの4倍)" },
];

/** voiceId ごとの表示名(性別)。利用可否は NARRATION_VOICES_BY_ENGINE で判定する。 */
const NARRATION_VOICE_LABELS: Record<string, string> = {
  Takumi: "Takumi(男性)",
  Mizuki: "Mizuki(女性)",
  Kazuha: "Kazuha(女性)",
  Tomoko: "Tomoko(女性)",
};

const TEMPLATE_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: "simple",
    label: "シンプル",
    description: "全画面の画像/背景色に見出し・説明文を重ねるスライドショー",
  },
  {
    value: "productShowcase",
    label: "商品紹介",
    description: "左に見出し・説明・価格/CTAバッジ、右に商品画像を配置",
  },
  {
    value: "newsBulletin",
    label: "ニュース速報",
    description: "全画面背景 + カテゴリバッジ + 下部ロワーサード(見出し・説明)",
  },
];

export const NewVideoPage: React.FC = () => {
  const navigate = useNavigate();
  const createVideo = useCreateVideo();
  const [submitError, setSubmitError] = useState<string | undefined>(
    undefined,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VideoFormInput, unknown, VideoFormOutput>({
    resolver: zodResolver(CreateVideoRequestSchema),
    defaultValues,
  });
  const templateId = useWatch({ control, name: "templateId" }) ?? "simple";
  const narrationEnabled = useWatch({ control, name: "narration.enabled" }) ?? false;
  const narrationEngine =
    useWatch({ control, name: "narration.engine" }) ?? "standard";
  const narrationVoiceId = useWatch({ control, name: "narration.voiceId" });
  const availableVoices = NARRATION_VOICES_BY_ENGINE[narrationEngine] ?? [];

  useEffect(() => {
    // エンジン切り替え時、現在選択中のvoiceIdが新エンジンで使えない場合は
    // そのエンジンで利用可能な最初のvoiceIdに自動修正する
    // (例: Neural選択中にStandardへ戻すと Kazuha/Tomoko は選べなくなる)。
    if (narrationVoiceId && !availableVoices.includes(narrationVoiceId)) {
      setValue("narration.voiceId", availableVoices[0]);
    }
  }, [narrationEngine, narrationVoiceId, availableVoices, setValue]);

  const onSubmit: SubmitHandler<VideoFormOutput> = async (data) => {
    setSubmitError(undefined);
    try {
      const result = await createVideo.mutateAsync(data);
      navigate(`/videos/${result.videoId}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "動画生成の依頼に失敗しました",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-lg font-semibold text-slate-900">
          新しい動画を作成
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <label className="block text-sm text-slate-600">
            動画タイトル
            <input
              {...register("title")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="サンプル動画"
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-red-500">
                {errors.title.message}
              </p>
            ) : null}
          </label>

          <div>
            <span className="block text-sm text-slate-600">テンプレート</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {TEMPLATE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                    templateId === option.value
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register("templateId")}
                    className="sr-only"
                  />
                  <span className="block font-medium text-slate-900">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                {...register("narration.enabled")}
                className="h-4 w-4 rounded border-slate-300"
              />
              ナレーションを自動生成する(Amazon Polly)
            </label>
            <p className="mt-1 text-xs text-slate-400">
              各シーンの見出し・説明文を読み上げます。追加費用が発生します(既定のStandardエンジンなら
              動画1本あたり数円未満が目安)。
            </p>
            {narrationEnabled ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm text-slate-600">
                  エンジン
                  <select
                    {...register("narration.engine")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
                  >
                    {NARRATION_ENGINE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  読み上げ音声
                  <select
                    {...register("narration.voiceId")}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
                  >
                    {availableVoices.map((voice) => (
                      <option key={voice} value={voice}>
                        {NARRATION_VOICE_LABELS[voice] ?? voice}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              シーン構成
            </h2>
            <SceneEditor
              control={control}
              register={register}
              errors={errors}
              templateId={templateId}
              narrationEnabled={narrationEnabled}
            />
            {errors.scenes?.message ? (
              <p className="mt-1 text-xs text-red-500">
                {errors.scenes.message}
              </p>
            ) : null}
          </div>

          <label className="block text-sm text-slate-600">
            BGM音声URL(任意)
            <input
              {...register("audioUrl")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="https://..."
            />
            {errors.audioUrl ? (
              <p className="mt-1 text-xs text-red-500">
                {errors.audioUrl.message}
              </p>
            ) : null}
          </label>

          <label className="block text-sm text-slate-600">
            通知先メールアドレス(空欄の場合はログイン中のアカウントのメールに送信)
            <input
              {...register("notifyEmail")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="user@example.com"
            />
            {errors.notifyEmail ? (
              <p className="mt-1 text-xs text-red-500">
                {errors.notifyEmail.message}
              </p>
            ) : null}
          </label>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm text-slate-500 underline"
            >
              {showAdvanced ? "詳細設定を隠す" : "詳細設定を表示(fps・解像度)"}
            </button>
            {showAdvanced ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <label className="text-sm text-slate-600">
                  fps
                  <input
                    type="number"
                    {...register("fps", { valueAsNumber: true })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  幅(px)
                  <input
                    type="number"
                    {...register("width", { valueAsNumber: true })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  高さ(px)
                  <input
                    type="number"
                    {...register("height", { valueAsNumber: true })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
            ) : null}
          </div>

          {submitError ? (
            <p className="text-sm text-red-500">{submitError}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isSubmitting ? "送信中..." : "動画生成を依頼する"}
          </button>
        </form>
      </main>
    </div>
  );
};
