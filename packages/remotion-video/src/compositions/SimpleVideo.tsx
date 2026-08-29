import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CreateVideoRequest } from "@video-generation/shared";
import { getSceneDurationsInFrames } from "../utils";

export type SimpleVideoProps = CreateVideoRequest;

const FADE_FRAMES = 15;

const SceneView: React.FC<{
  scene: CreateVideoRequest["scenes"][number];
  durationInFrames: number;
}> = ({ scene, durationInFrames }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.backgroundColor ?? "#111827",
        justifyContent: "center",
        alignItems: "center",
        opacity,
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
};

export const SimpleVideo: React.FC<SimpleVideoProps> = ({
  scenes,
  audioUrl,
}) => {
  const { fps } = useVideoConfig();
  const durations = getSceneDurationsInFrames(scenes, fps);

  let startFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {audioUrl ? <Audio src={audioUrl} /> : null}
      {scenes.map((scene, index) => {
        const durationInFrames = durations[index];
        const from = startFrame;
        startFrame += durationInFrames;

        return (
          <Sequence
            key={index}
            from={from}
            durationInFrames={durationInFrames}
            name={`scene-${index}`}
          >
            <SceneView scene={scene} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
