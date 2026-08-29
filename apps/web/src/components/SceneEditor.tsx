import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import type { VideoFormInput } from "../types/videoForm";

interface SceneEditorProps {
  control: Control<VideoFormInput>;
  register: UseFormRegister<VideoFormInput>;
  errors: FieldErrors<VideoFormInput>;
}

const MAX_SCENES = 30;

export const SceneEditor: React.FC<SceneEditorProps> = ({
  control,
  register,
  errors,
}) => {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "scenes",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => {
        const sceneErrors = errors.scenes?.[index];
        return (
          <div
            key={field.id}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-700">シーン {index + 1}</h3>
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => index > 0 && move(index, index - 1)}
                  disabled={index === 0}
                  className="text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  ↑ 上へ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    index < fields.length - 1 && move(index, index + 1)
                  }
                  disabled={index === fields.length - 1}
                  className="text-slate-500 hover:text-slate-800 disabled:opacity-30"
                >
                  ↓ 下へ
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  className="text-red-500 hover:text-red-700 disabled:opacity-30"
                >
                  削除
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm text-slate-600">
                メインテキスト
                <input
                  {...register(`scenes.${index}.text`)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
                  placeholder="こんにちは"
                />
              </label>

              <label className="col-span-2 text-sm text-slate-600">
                サブテキスト
                <input
                  {...register(`scenes.${index}.subtext`)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
                />
              </label>

              <label className="text-sm text-slate-600">
                背景色
                <input
                  type="color"
                  {...register(`scenes.${index}.backgroundColor`)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300"
                />
              </label>

              <label className="text-sm text-slate-600">
                表示秒数
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  {...register(`scenes.${index}.durationInSeconds`, {
                    valueAsNumber: true,
                  })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
                />
              </label>

              <label className="col-span-2 text-sm text-slate-600">
                背景画像URL(任意)
                <input
                  {...register(`scenes.${index}.imageUrl`)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
                  placeholder="https://..."
                />
              </label>
            </div>

            {sceneErrors ? (
              <p className="text-xs text-red-500">
                {Object.values(sceneErrors)
                  .map((e) => (e as { message?: string } | undefined)?.message)
                  .filter(Boolean)
                  .join(" / ")}
              </p>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => append({ text: "", durationInSeconds: 3 })}
        disabled={fields.length >= MAX_SCENES}
        className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-30"
      >
        + シーンを追加
      </button>
    </div>
  );
};
