import React from "react";
import { OffthreadVideo, useVideoConfig } from "remotion";
import type { VideoScene } from "@video-generation/shared";

/**
 * シーンに実写動画クリップを合成する `<OffthreadVideo>` ラッパー。
 *
 * `<Video>` (通常の `<video>` 要素ベース) ではなく `<OffthreadVideo>` を使うのは、
 * サーバーサイドレンダリング (`@remotion/renderer` の `renderMedia`) 時にffmpegで
 * 1フレームずつ正確に抽出するため、ブラウザの動画デコードタイミングに依存せず
 * コマ落ち/フレームずれのない決定的なレンダリング結果になるため
 * (Remotion公式もレンダリング用途では `OffthreadVideo` を推奨している)。
 *
 * `videoStartFromSeconds` でクリップの再生開始位置をトリミングし、
 * シーンの表示時間 (`durationInFrames`) を超える範囲は再生しない。
 */
export const AnimatedVideo: React.FC<{
  scene: Pick<VideoScene, "videoUrl" | "videoStartFromSeconds" | "videoVolume">;
  durationInFrames: number;
  style?: React.CSSProperties;
}> = ({ scene, durationInFrames, style }) => {
  const { fps } = useVideoConfig();

  if (!scene.videoUrl) {
    return null;
  }

  const trimBefore = Math.max(
    0,
    Math.round((scene.videoStartFromSeconds ?? 0) * fps),
  );

  return (
    <OffthreadVideo
      src={scene.videoUrl}
      trimBefore={trimBefore}
      trimAfter={trimBefore + durationInFrames}
      volume={scene.videoVolume ?? 0}
      pauseWhenBuffering
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }}
    />
  );
};
