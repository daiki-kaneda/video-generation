import React from "react";
import { Composition } from "remotion";
import {
  CreateVideoRequestSchema,
  VIDEO_COMPOSITION_ID,
  type CreateVideoRequest,
} from "@video-generation/shared";
import { VideoComposition } from "./compositions/VideoComposition";
import { getTotalDurationInFrames } from "./utils";

const commonSceneDefaults = {
  transitionType: "fade" as const,
  transitionDurationInSeconds: 0.5,
  imageAnimation: "none" as const,
  imageAnimationIntensity: 0.15,
};

/** `templateId: "simple"` (本番でも使われる既定テンプレート) のサンプル */
const simpleProps: CreateVideoRequest = {
  title: "サンプル動画",
  templateId: "simple",
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    {
      ...commonSceneDefaults,
      text: "こんにちは",
      subtext: "Remotion で生成された動画です",
      backgroundColor: "#1d4ed8",
      durationInSeconds: 3,
    },
    {
      ...commonSceneDefaults,
      text: "トランジション対応",
      subtext: "スライド・ワイプなど複数の演出を選択できます",
      backgroundColor: "#0f766e",
      durationInSeconds: 3,
      transitionType: "slide",
      transitionDirection: "from-right",
      transitionDurationInSeconds: 0.6,
    },
    {
      ...commonSceneDefaults,
      text: "Ken Burns 対応",
      subtext: "背景画像にゆっくりズーム/パンをかけられます",
      imageUrl: "https://picsum.photos/1920/1080",
      durationInSeconds: 4,
      imageAnimation: "zoomIn",
      imageAnimationIntensity: 0.2,
    },
  ],
};

/** `templateId: "productShowcase"` のサンプル (Remotion Studio でのプレビュー用) */
const productShowcaseProps: CreateVideoRequest = {
  title: "商品紹介サンプル",
  templateId: "productShowcase",
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    {
      ...commonSceneDefaults,
      text: "ワイヤレスイヤホン Pro",
      subtext: "圧倒的なノイズキャンセリングと、24時間駆動のバッテリー。",
      imageUrl: "https://picsum.photos/id/367/1200/1080",
      badgeText: "¥14,800",
      durationInSeconds: 4,
      imageAnimation: "zoomIn",
      imageAnimationIntensity: 0.15,
    },
    {
      ...commonSceneDefaults,
      text: "今なら送料無料",
      subtext: "公式ストア限定キャンペーン実施中",
      imageUrl: "https://picsum.photos/id/180/1200/1080",
      badgeText: "期間限定",
      backgroundColor: "#1e293b",
      durationInSeconds: 3,
      transitionType: "wipe",
      transitionDirection: "from-left",
    },
  ],
};

/** `templateId: "newsBulletin"` のサンプル (Remotion Studio でのプレビュー用) */
const newsBulletinProps: CreateVideoRequest = {
  title: "サンプルニュース",
  templateId: "newsBulletin",
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    {
      ...commonSceneDefaults,
      text: "都内で大規模イベント開催",
      subtext: "多くの来場者で賑わい、周辺は大変な混雑となりました。",
      imageUrl: "https://picsum.photos/id/1015/1920/1080",
      badgeText: "速報",
      durationInSeconds: 4,
      imageAnimation: "panLeftToRight",
      imageAnimationIntensity: 0.12,
    },
    {
      ...commonSceneDefaults,
      text: "週末の天気は晴れ時々曇り",
      subtext: "気温は平年並みで、過ごしやすい一日となりそうです。",
      imageUrl: "https://picsum.photos/id/1043/1920/1080",
      badgeText: "天気",
      durationInSeconds: 4,
      transitionType: "fade",
      imageAnimation: "zoomOut",
      imageAnimationIntensity: 0.12,
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/*
        本番の描画で実際に使われるコンポジション。
        `templateId` (inputProps) に応じてテンプレートを切り替えるため、IDはテンプレート非依存。
        ワーカー (apps/worker/src/render.ts) は常にこの `VIDEO_COMPOSITION_ID` を指定してレンダリングする。
      */}
      <Composition
        id={VIDEO_COMPOSITION_ID}
        component={VideoComposition}
        durationInFrames={getTotalDurationInFrames(
          simpleProps.scenes,
          simpleProps.fps,
        )}
        fps={simpleProps.fps}
        width={simpleProps.width}
        height={simpleProps.height}
        defaultProps={simpleProps}
        schema={CreateVideoRequestSchema}
        calculateMetadata={async ({ props }) => {
          return {
            durationInFrames: getTotalDurationInFrames(
              props.scenes,
              props.fps,
            ),
            fps: props.fps,
            width: props.width,
            height: props.height,
          };
        }}
      />

      {/*
        以下は Remotion Studio でテンプレートごとのプレビューを見やすくするための
        追加コンポジション(本番のレンダリングパスでは使用されない)。
      */}
      <Composition
        id={`${VIDEO_COMPOSITION_ID}-ProductShowcase`}
        component={VideoComposition}
        durationInFrames={getTotalDurationInFrames(
          productShowcaseProps.scenes,
          productShowcaseProps.fps,
        )}
        fps={productShowcaseProps.fps}
        width={productShowcaseProps.width}
        height={productShowcaseProps.height}
        defaultProps={productShowcaseProps}
        schema={CreateVideoRequestSchema}
        calculateMetadata={async ({ props }) => {
          return {
            durationInFrames: getTotalDurationInFrames(
              props.scenes,
              props.fps,
            ),
            fps: props.fps,
            width: props.width,
            height: props.height,
          };
        }}
      />

      <Composition
        id={`${VIDEO_COMPOSITION_ID}-NewsBulletin`}
        component={VideoComposition}
        durationInFrames={getTotalDurationInFrames(
          newsBulletinProps.scenes,
          newsBulletinProps.fps,
        )}
        fps={newsBulletinProps.fps}
        width={newsBulletinProps.width}
        height={newsBulletinProps.height}
        defaultProps={newsBulletinProps}
        schema={CreateVideoRequestSchema}
        calculateMetadata={async ({ props }) => {
          return {
            durationInFrames: getTotalDurationInFrames(
              props.scenes,
              props.fps,
            ),
            fps: props.fps,
            width: props.width,
            height: props.height,
          };
        }}
      />
    </>
  );
};
