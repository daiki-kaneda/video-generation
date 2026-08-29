import React from "react";
import type { VideoScene } from "@video-generation/shared";
import { AnimatedImage } from "./AnimatedImage";
import { AnimatedVideo } from "./AnimatedVideo";

type MediaScene = Pick<
  VideoScene,
  | "imageUrl"
  | "imageAnimation"
  | "imageAnimationIntensity"
  | "videoUrl"
  | "videoStartFromSeconds"
  | "videoVolume"
>;

/**
 * シーンの背景メディアを描画する。`videoUrl` が指定されていれば動画クリップを、
 * なければ `imageUrl` があれば Ken Burns 対応の画像を表示する
 * (両方未指定なら何も描画せず、呼び出し側の背景色がそのまま見える)。
 * 各テンプレートはこのコンポーネント経由でメディアを描画することで、
 * 画像/動画どちらの背景でも同じように扱える。
 */
export const SceneMedia: React.FC<{
  scene: MediaScene;
  durationInFrames: number;
  containerWidth?: number;
  containerHeight?: number;
  style?: React.CSSProperties;
}> = ({ scene, durationInFrames, containerWidth, containerHeight, style }) => {
  if (scene.videoUrl) {
    return (
      <AnimatedVideo
        scene={scene}
        durationInFrames={durationInFrames}
        style={style}
      />
    );
  }

  if (scene.imageUrl) {
    return (
      <AnimatedImage
        scene={scene}
        durationInFrames={durationInFrames}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        style={style}
      />
    );
  }

  return null;
};
