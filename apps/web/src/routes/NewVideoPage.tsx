import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
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

const { CreateVideoRequestSchema } = sharedSchemas;

const defaultValues: VideoFormInput = {
  title: "",
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
};

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
    formState: { errors, isSubmitting },
  } = useForm<VideoFormInput, unknown, VideoFormOutput>({
    resolver: zodResolver(CreateVideoRequestSchema),
    defaultValues,
  });

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
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              シーン構成
            </h2>
            <SceneEditor control={control} register={register} errors={errors} />
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
