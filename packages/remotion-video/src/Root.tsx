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
  videoStartFromSeconds: 0,
  videoVolume: 0,
  narrationSkip: false,
};

const narrationDisabled = {
  enabled: false as const,
  engine: "standard" as const,
  voiceId: "Takumi" as const,
};

/** `templateId: "simple"` (本番でも使われる既定テンプレート) のサンプル */
const simpleProps: CreateVideoRequest = {
  title: "サンプル動画",
  templateId: "simple",
  fps: 30,
  width: 1920,
  height: 1080,
  narration: narrationDisabled,
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
  narration: narrationDisabled,
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

/** `videoUrl` (実写クリップ合成) のサンプル (Remotion Studio でのプレビュー用) */
const videoClipProps: CreateVideoRequest = {
  title: "動画クリップ合成サンプル",
  templateId: "simple",
  fps: 30,
  width: 1920,
  height: 1080,
  narration: narrationDisabled,
  scenes: [
    {
      ...commonSceneDefaults,
      text: "実写クリップを合成",
      subtext: "<Video> の代わりに <OffthreadVideo> で正確にレンダリング",
      videoUrl:
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      videoStartFromSeconds: 0,
      videoVolume: 0,
      durationInSeconds: 4,
    },
    {
      ...commonSceneDefaults,
      text: "画像とも自由に組み合わせ可能",
      subtext: "シーンごとに画像/動画を切り替えられます",
      imageUrl: "https://picsum.photos/1920/1080",
      imageAnimation: "zoomOut",
      durationInSeconds: 3,
      transitionType: "fade",
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
  narration: narrationDisabled,
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

/**
 * ナレーション合成のプレビュー用サンプル (Remotion Studio でのプレビュー・本番レンダリングパスの検証用)。
 * `narrationAudioUrl` は本来ワーカーがPollyで合成して設定する計算済みフィールドだが、
 * ここではプレビュー目的でダミーの音声URLを直接指定している
 * (Remotionコンポジション自体はAWS SDKを呼ばず、確定済みの音声URLを再生するだけであることの確認)。
 * また `audioUrl` (BGM) を設定し、ナレーション有りシーンでBGM音量が自動的に下がる
 * (簡易ダッキング, `BGM_VOLUME_WITH_NARRATION`)ことも確認できる。
 * BGMとナレーションには意図的に異なる音声ファイルを使用している
 * (Remotionは同一URLの `<Audio>` を複数配置すると同一アセットとして扱い、
 * 片方の音量設定が失われることがあるため)。
 */
const narrationDemoProps: CreateVideoRequest = {
  title: "ナレーション合成サンプル",
  templateId: "newsBulletin",
  fps: 30,
  width: 1920,
  height: 1080,
  narration: { enabled: true, engine: "standard", voiceId: "Takumi" },
  audioUrl:
    "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
  scenes: [
    {
      ...commonSceneDefaults,
      text: "都内で大規模イベント開催",
      subtext: "多くの来場者で賑わい、周辺は大変な混雑となりました。",
      imageUrl: "https://picsum.photos/id/1015/1920/1080",
      badgeText: "速報",
      durationInSeconds: 4,
      imageAnimation: "panLeftToRight",
      // 本来はワーカーがPollyで合成する。ここではプレビュー用のダミー音声URL(BGMとは別ファイル)。
      narrationAudioUrl: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
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
        id={`${VIDEO_COMPOSITION_ID}-VideoClip`}
        component={VideoComposition}
        durationInFrames={getTotalDurationInFrames(
          videoClipProps.scenes,
          videoClipProps.fps,
        )}
        fps={videoClipProps.fps}
        width={videoClipProps.width}
        height={videoClipProps.height}
        defaultProps={videoClipProps}
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
        id={`${VIDEO_COMPOSITION_ID}-NarrationDemo`}
        component={VideoComposition}
        durationInFrames={getTotalDurationInFrames(
          narrationDemoProps.scenes,
          narrationDemoProps.fps,
        )}
        fps={narrationDemoProps.fps}
        width={narrationDemoProps.width}
        height={narrationDemoProps.height}
        defaultProps={narrationDemoProps}
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
