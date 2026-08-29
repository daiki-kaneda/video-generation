import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { AnimatedImage } from "../../components/AnimatedImage";
import type { SceneTemplateComponent } from "./types";

const IMAGE_PANEL_RATIO = 0.55;

/**
 * 商品紹介向けテンプレート。
 * 右側に商品画像(Ken Burns対応)、左側に見出し・説明・価格/CTAバッジのパネルを配置する。
 * `imageUrl` が無い場合、右パネルは背景色のみになる。
 */
export const ProductShowcaseTemplate: SceneTemplateComponent = ({
  scene,
  durationInFrames,
}) => {
  const { width, height } = useVideoConfig();
  const imagePanelWidth = Math.round(width * IMAGE_PANEL_RATIO);
  const panelColor = scene.backgroundColor ?? "#0f172a";

  return (
    <AbsoluteFill style={{ flexDirection: "row", backgroundColor: "#0f172a" }}>
      <div
        style={{
          width: width - imagePanelWidth,
          height: "100%",
          backgroundColor: panelColor,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 64px",
          gap: 24,
        }}
      >
        {scene.text ? (
          <div style={{ color: "white", fontSize: 64, fontWeight: 800, lineHeight: 1.2 }}>
            {scene.text}
          </div>
        ) : null}
        {scene.subtext ? (
          <div style={{ color: "#cbd5e1", fontSize: 30, lineHeight: 1.5 }}>
            {scene.subtext}
          </div>
        ) : null}
        {scene.badgeText ? (
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: 16,
              padding: "12px 28px",
              borderRadius: 999,
              backgroundColor: "#f59e0b",
              color: "#111827",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            {scene.badgeText}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "relative",
          width: imagePanelWidth,
          height: "100%",
          overflow: "hidden",
          backgroundColor: scene.imageUrl ? "#000000" : panelColor,
        }}
      >
        <AnimatedImage
          scene={scene}
          durationInFrames={durationInFrames}
          containerWidth={imagePanelWidth}
          containerHeight={height}
        />
      </div>
    </AbsoluteFill>
  );
};
