import { Easing, interpolate } from "remotion";
import type { VideoScene } from "@video-generation/shared";

/**
 * Ken Burns 風の背景画像パン/ズーム効果を CSS `transform` として計算する。
 *
 * 実装方針:
 * - `object-fit: cover` で画面いっぱいに表示された画像に対し、追加で `scale()` を掛けて
 *   はみ出し分(スラック)を作り、そのスラックの範囲内で `translate()` することで
 *   画像の端が見切れないようにパンする。
 * - `transform: translate(px, py) scale(s)` の順で指定することで、
 *   `translate` の px/py は最終的な画面上のピクセル量そのものになる
 *   (`scale` の影響を受けない)。これにより移動量の計算が単純になる。
 */
export const getImageAnimationTransform = (
  scene: Pick<VideoScene, "imageAnimation" | "imageAnimationIntensity">,
  frame: number,
  durationInFrames: number,
  videoWidth: number,
  videoHeight: number,
): string => {
  const animation = scene.imageAnimation ?? "none";
  if (animation === "none") {
    return "none";
  }

  const intensity = scene.imageAnimationIntensity ?? 0.15;
  if (intensity <= 0) {
    return "none";
  }

  const progress = interpolate(
    frame,
    [0, Math.max(durationInFrames - 1, 1)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    },
  );

  switch (animation) {
    case "zoomIn": {
      const scale = 1 + intensity * progress;
      return `scale(${scale})`;
    }
    case "zoomOut": {
      const scale = 1 + intensity * (1 - progress);
      return `scale(${scale})`;
    }
    case "panLeftToRight":
    case "panRightToLeft": {
      const scale = 1 + intensity;
      const maxOffsetX = ((scale - 1) * videoWidth) / 2;
      const direction = animation === "panLeftToRight" ? 1 : -1;
      const x = direction * (maxOffsetX - progress * maxOffsetX * 2);
      return `translate(${x}px, 0) scale(${scale})`;
    }
    case "panTopToBottom":
    case "panBottomToTop": {
      const scale = 1 + intensity;
      const maxOffsetY = ((scale - 1) * videoHeight) / 2;
      const direction = animation === "panTopToBottom" ? 1 : -1;
      const y = direction * (maxOffsetY - progress * maxOffsetY * 2);
      return `translate(0, ${y}px) scale(${scale})`;
    }
    default:
      return "none";
  }
};
