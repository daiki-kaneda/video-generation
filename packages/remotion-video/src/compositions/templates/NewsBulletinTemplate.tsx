import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedImage } from "../../components/AnimatedImage";
import type { SceneTemplateComponent } from "./types";

/**
 * ニュース速報風テンプレート。
 * 全画面背景の上に、左上のカテゴリ/速報バッジ・下部ロワーサード(見出し+説明)・
 * 右下の番組名(動画タイトル)の透かしを重ねる。
 */
export const NewsBulletinTemplate: SceneTemplateComponent = ({
  scene,
  durationInFrames,
  videoTitle,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: scene.backgroundColor ?? "#111827",
      overflow: "hidden",
    }}
  >
    <AnimatedImage scene={scene} durationInFrames={durationInFrames} />

    <div
      style={{
        position: "absolute",
        top: 48,
        left: 48,
        display: "flex",
        alignItems: "center",
        backgroundColor: "#dc2626",
        color: "white",
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: 2,
        padding: "10px 24px",
        borderRadius: 4,
      }}
    >
      {scene.badgeText ?? "NEWS"}
    </div>

    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "stretch",
        backgroundColor: "rgba(15, 23, 42, 0.82)",
      }}
    >
      <div style={{ width: 12, backgroundColor: "#dc2626" }} />
      <div
        style={{
          flex: 1,
          padding: "28px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {scene.text ? (
          <div style={{ color: "white", fontSize: 52, fontWeight: 800 }}>
            {scene.text}
          </div>
        ) : null}
        {scene.subtext ? (
          <div style={{ color: "#e2e8f0", fontSize: 28 }}>{scene.subtext}</div>
        ) : null}
      </div>
    </div>

    <div
      style={{
        position: "absolute",
        top: 48,
        right: 48,
        color: "rgba(255,255,255,0.85)",
        fontSize: 22,
        fontWeight: 700,
        padding: "8px 16px",
        borderRadius: 4,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
      }}
    >
      {videoTitle}
    </div>
  </AbsoluteFill>
);
