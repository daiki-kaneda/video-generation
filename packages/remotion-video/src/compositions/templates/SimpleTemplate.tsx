import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedImage } from "../../components/AnimatedImage";
import type { SceneTemplateComponent } from "./types";

/**
 * シンプルなスライドショーテンプレート。
 * 全画面の画像(または背景色)の上に、中央寄せの見出し・サブテキストを重ねるだけの構成。
 */
export const SimpleTemplate: SceneTemplateComponent = ({
  scene,
  durationInFrames,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: scene.backgroundColor ?? "#111827",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    }}
  >
    <AnimatedImage scene={scene} durationInFrames={durationInFrames} />
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
