import type { VideoScene } from "@video-generation/shared";

/** 各シーンの長さ(秒)をフレーム数に変換する */
export const getSceneDurationsInFrames = (
  scenes: VideoScene[],
  fps: number,
): number[] => scenes.map((scene) => Math.max(1, Math.round(scene.durationInSeconds * fps)));

/**
 * 各シーンに入る際のトランジション(前シーンとのクロスオーバー)の長さをフレーム数で返す。
 * 先頭シーンや `transitionType: "none"` の場合は 0。
 * `@remotion/transitions` の制約上、トランジション長は前後シーンの短い方より
 * 必ず短くする必要があるため、自動的にクランプする。
 */
export const getTransitionDurationsInFrames = (
  scenes: VideoScene[],
  fps: number,
): number[] => {
  const sceneDurations = getSceneDurationsInFrames(scenes, fps);

  return scenes.map((scene, index) => {
    if (index === 0 || scene.transitionType === "none") {
      return 0;
    }

    const requested = Math.max(
      1,
      Math.round(scene.transitionDurationInSeconds * fps),
    );
    const shorterAdjacentDuration = Math.min(
      sceneDurations[index - 1],
      sceneDurations[index],
    );
    // TransitionSeries はトランジション長が前後シーンの尺以上だとエラーになるため、
    // 常にそれより短くなるようクランプする。
    const maxAllowed = Math.max(1, shorterAdjacentDuration - 1);

    return Math.min(requested, maxAllowed);
  });
};

/** 全シーン合計のフレーム数 (トランジションによる重複分を差し引いた実尺) */
export const getTotalDurationInFrames = (
  scenes: VideoScene[],
  fps: number,
): number => {
  const sceneTotal = getSceneDurationsInFrames(scenes, fps).reduce(
    (total, frames) => total + frames,
    0,
  );
  const transitionTotal = getTransitionDurationsInFrames(scenes, fps).reduce(
    (total, frames) => total + frames,
    0,
  );

  return Math.max(1, sceneTotal - transitionTotal);
};
