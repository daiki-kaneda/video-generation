import type { VideoScene } from "@video-generation/shared";

/** 各シーンの長さ(秒)をフレーム数に変換する */
export const getSceneDurationsInFrames = (
  scenes: VideoScene[],
  fps: number,
): number[] => scenes.map((scene) => Math.max(1, Math.round(scene.durationInSeconds * fps)));

/** 全シーン合計のフレーム数 */
export const getTotalDurationInFrames = (
  scenes: VideoScene[],
  fps: number,
): number =>
  getSceneDurationsInFrames(scenes, fps).reduce((total, frames) => total + frames, 0);
