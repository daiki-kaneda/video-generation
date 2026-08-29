import React from "react";
import { AbsoluteFill, Img, Audio, useVideoConfig } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { none } from "@remotion/transitions/none";
import type { CreateVideoRequest } from "@video-generation/shared";
import {
  getSceneDurationsInFrames,
  getTransitionDurationsInFrames,
} from "../utils";

export type SimpleVideoProps = CreateVideoRequest;

type Scene = CreateVideoRequest["scenes"][number];

/**
 * シーンの `transitionType` / `transitionDirection` から
 * `@remotion/transitions` の presentation を組み立てる。
 * 各 presentation は互いに異なる props 型を持つため、共通の呼び出し口として
 * `TransitionPresentation<Record<string, unknown>>` にキャストして返す
 * (`component` と `props` は常に対応するペアで生成されるため実行時は安全)。
 */
const getTransitionPresentation = (
  scene: Scene,
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

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => (
  <AbsoluteFill
    style={{
      backgroundColor: scene.backgroundColor ?? "#111827",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {scene.imageUrl ? (
      <Img
        src={scene.imageUrl}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    ) : null}
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "0 80px",
        textAlign: "center",
        textShadow: "0 4px 24px rgba(0,0,0,0.6)",
      }}
    >
      {scene.text ? (
        <div style={{ color: "white", fontSize: 72, fontWeight: 700 }}>
          {scene.text}
        </div>
      ) : null}
      {scene.subtext ? (
        <div style={{ color: "#e5e7eb", fontSize: 36 }}>{scene.subtext}</div>
      ) : null}
    </div>
  </AbsoluteFill>
);

export const SimpleVideo: React.FC<SimpleVideoProps> = ({
  scenes,
  audioUrl,
}) => {
  const { fps, width, height } = useVideoConfig();
  const sceneDurations = getSceneDurationsInFrames(scenes, fps);
  const transitionDurations = getTransitionDurationsInFrames(scenes, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <TransitionSeries>
        {scenes.map((scene, index) => (
          <React.Fragment key={index}>
            {index > 0 && transitionDurations[index] > 0 ? (
              <TransitionSeries.Transition
                presentation={getTransitionPresentation(scene, width, height)}
                timing={linearTiming({
                  durationInFrames: transitionDurations[index],
                })}
              />
            ) : null}
            <TransitionSeries.Sequence
              durationInFrames={sceneDurations[index]}
              name={`scene-${index}`}
            >
              <SceneView scene={scene} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
