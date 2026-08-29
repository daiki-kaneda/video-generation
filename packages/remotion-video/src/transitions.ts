import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { none } from "@remotion/transitions/none";
import type { VideoScene } from "@video-generation/shared";

/**
 * シーンの `transitionType` / `transitionDirection` から
 * `@remotion/transitions` の presentation を組み立てる。
 * 各 presentation は互いに異なる props 型を持つため、共通の呼び出し口として
 * `TransitionPresentation<Record<string, unknown>>` にキャストして返す
 * (`component` と `props` は常に対応するペアで生成されるため実行時は安全)。
 */
export const getTransitionPresentation = (
  scene: Pick<VideoScene, "transitionType" | "transitionDirection">,
  videoWidth: number,
  videoHeight: number,
): TransitionPresentation<Record<string, unknown>> => {
  const direction = scene.transitionDirection ?? "from-right";

  switch (scene.transitionType) {
    case "slide":
      return slide({ direction }) as TransitionPresentation<
        Record<string, unknown>
      >;
    case "wipe":
      return wipe({ direction }) as TransitionPresentation<
        Record<string, unknown>
      >;
    case "flip":
      return flip({ direction }) as TransitionPresentation<
        Record<string, unknown>
      >;
    case "clockWipe":
      return clockWipe({
        width: videoWidth,
        height: videoHeight,
      }) as unknown as TransitionPresentation<Record<string, unknown>>;
    case "iris":
      return iris({
        width: videoWidth,
        height: videoHeight,
      }) as unknown as TransitionPresentation<Record<string, unknown>>;
    case "none":
      return none() as TransitionPresentation<Record<string, unknown>>;
    case "fade":
    default:
      return fade() as TransitionPresentation<Record<string, unknown>>;
  }
};
