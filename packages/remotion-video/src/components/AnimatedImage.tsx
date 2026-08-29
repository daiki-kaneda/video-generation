import React from "react";
import { Img, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoScene } from "@video-generation/shared";
import { getImageAnimationTransform } from "../kenBurns";

/**
 * Ken Burns 風のズーム/パンアニメーションを適用する `<Img>` ラッパー。
 * 各テンプレートで画像の表示領域(フルスクリーン or 一部パネル)が異なるため、
 * アニメーション計算に使う `containerWidth`/`containerHeight` を明示的に渡せるようにしている
 * (省略時は動画全体の width/height を使う)。
 */
export const AnimatedImage: React.FC<{
  scene: Pick<VideoScene, "imageUrl" | "imageAnimation" | "imageAnimationIntensity">;
  durationInFrames: number;
  containerWidth?: number;
  containerHeight?: number;
  style?: React.CSSProperties;
}> = ({ scene, durationInFrames, containerWidth, containerHeight, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const transform = getImageAnimationTransform(
    scene,
    frame,
    durationInFrames,
    containerWidth ?? width,
    containerHeight ?? height,
  );

  if (!scene.imageUrl) {
    return null;
  }

  return (
    <Img
      src={scene.imageUrl}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform,
        transformOrigin: "center center",
        ...style,
      }}
    />
  );
};
