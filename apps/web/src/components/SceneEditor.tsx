import {
  useFieldArray,
  useWatch,
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

const TRANSITION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "fade", label: "クロスフェード" },
  { value: "slide", label: "スライド" },
  { value: "wipe", label: "ワイプ" },
  { value: "flip", label: "回転(フリップ)" },
  { value: "clockWipe", label: "時計回りワイプ" },
  { value: "iris", label: "円形ワイプ(アイリス)" },
  { value: "none", label: "カット(演出なし)" },
];

/** 方向の概念を持つ演出 (slide/wipe/flip) のみ方向選択を表示する */
const DIRECTIONAL_TRANSITION_TYPES = new Set(["slide", "wipe", "flip"]);

const TRANSITION_DIRECTION_OPTIONS: { value: string; label: string }[] = [
  { value: "from-right", label: "右から" },
  { value: "from-left", label: "左から" },
  { value: "from-top", label: "上から" },
  { value: "from-bottom", label: "下から" },
];

const IMAGE_ANIMATION_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "なし(静止画)" },
  { value: "zoomIn", label: "ゆっくりズームイン" },
  { value: "zoomOut", label: "ゆっくりズームアウト" },
  { value: "panLeftToRight", label: "左から右へパン" },
  { value: "panRightToLeft", label: "右から左へパン" },
  { value: "panTopToBottom", label: "上から下へパン" },
  { value: "panBottomToTop", label: "下から上へパン" },
];

interface SceneItemProps extends SceneEditorProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

const SceneItem: React.FC<SceneItemProps> = ({
  control,
  register,
  errors,
  index,
  isFirst,
  isLast,
  canRemove,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  const sceneErrors = errors.scenes?.[index];
  const transitionType = useWatch({
    control,
    name: `scenes.${index}.transitionType`,
  });
  const showDirection = DIRECTIONAL_TRANSITION_TYPES.has(
    transitionType ?? "fade",
  );
  const imageUrl = useWatch({ control, name: `scenes.${index}.imageUrl` });
  const imageAnimation = useWatch({
    control,
    name: `scenes.${index}.imageAnimation`,
  });
  const hasImage = Boolean(imageUrl);
  const showIntensity = hasImage && (imageAnimation ?? "none") !== "none";

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-700">シーン {index + 1}</h3>
        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="text-slate-500 hover:text-slate-800 disabled:opacity-30"
          >
            ↑ 上へ
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="text-slate-500 hover:text-slate-800 disabled:opacity-30"
          >
            ↓ 下へ
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
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

      {hasImage ? (
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
          <label className="text-sm text-slate-600">
            画像アニメーション(Ken Burns)
            <select
              {...register(`scenes.${index}.imageAnimation`)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
            >
              {IMAGE_ANIMATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {showIntensity ? (
            <label className="text-sm text-slate-600">
              強さ(ズーム/移動量)
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                {...register(`scenes.${index}.imageAnimationIntensity`, {
                  valueAsNumber: true,
                })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {isFirst ? (
        <p className="text-xs text-slate-400">
          先頭シーンは切り替え演出の対象外です(再生開始時にそのまま表示されます)。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
          <label className="text-sm text-slate-600">
            前のシーンからの切り替え演出
            <select
              {...register(`scenes.${index}.transitionType`)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
            >
              {TRANSITION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {showDirection ? (
            <label className="text-sm text-slate-600">
              方向
              <select
                {...register(`scenes.${index}.transitionDirection`)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
              >
                {TRANSITION_DIRECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-sm text-slate-600">
            演出時間(秒)
            <input
              type="number"
              step={0.1}
              min={0.1}
              max={5}
              {...register(`scenes.${index}.transitionDurationInSeconds`, {
                valueAsNumber: true,
              })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-slate-900"
            />
          </label>
        </div>
      )}

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
};

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
      {fields.map((field, index) => (
        <SceneItem
          key={field.id}
          control={control}
          register={register}
          errors={errors}
          index={index}
          isFirst={index === 0}
          isLast={index === fields.length - 1}
          canRemove={fields.length > 1}
          onMoveUp={() => index > 0 && move(index, index - 1)}
          onMoveDown={() =>
            index < fields.length - 1 && move(index, index + 1)
          }
          onRemove={() => remove(index)}
        />
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            text: "",
            durationInSeconds: 3,
            transitionType: "fade",
            transitionDurationInSeconds: 0.5,
          })
        }
        disabled={fields.length >= MAX_SCENES}
        className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-30"
      >
        + シーンを追加
      </button>
    </div>
  );
};
