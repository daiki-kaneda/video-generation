import React from "react";
import { Audio } from "remotion";
import type { VideoScene } from "@video-generation/shared";

/**
 * シーンに合成するナレーション音声。
 * `narrationAudioUrl` はワーカーがレンダリング前処理(Amazon Pollyでの音声合成)で
 * 設定する計算済みフィールドで、`TransitionSeries.Sequence` の中に配置することで
 * シーンの開始と同時に自動的に再生される(タイミング調整は不要)。
 */
export const SceneNarration: React.FC<{
  scene: Pick<VideoScene, "narrationAudioUrl">;
}> = ({ scene }) => {
  if (!scene.narrationAudioUrl) {
    return null;
  }

  return <Audio src={scene.narrationAudioUrl} />;
};
