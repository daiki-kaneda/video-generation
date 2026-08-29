import React from "react";
import { AbsoluteFill, Audio, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { CreateVideoRequest } from "@video-generation/shared";
import {
  getSceneDurationsInFrames,
  getTransitionDurationsInFrames,
} from "../utils";
import { getTransitionPresentation } from "../transitions";
import { SimpleTemplate } from "./templates/SimpleTemplate";
import { ProductShowcaseTemplate } from "./templates/ProductShowcaseTemplate";
import { NewsBulletinTemplate } from "./templates/NewsBulletinTemplate";
import type { SceneTemplateComponent } from "./templates/types";

export type VideoCompositionProps = CreateVideoRequest;

/** `templateId` -> シーンの見た目を担当するコンポーネントのマッピング */
const SCENE_TEMPLATES: Record<
  CreateVideoRequest["templateId"],
  SceneTemplateComponent
> = {
  simple: SimpleTemplate,
  productShowcase: ProductShowcaseTemplate,
  newsBulletin: NewsBulletinTemplate,
};

/**
 * 動画全体のコンポジション。
 * シーンの尺・切り替えトランジションの配線(共通基盤)を担い、
 * 各シーンの実際の見た目は `templateId` に応じて選択したテンプレートコンポーネントに委譲する。
 */
export const VideoComposition: React.FC<VideoCompositionProps> = ({
  title,
  templateId,
  scenes,
  audioUrl,
}) => {
  const { fps, width, height } = useVideoConfig();
  const sceneDurations = getSceneDurationsInFrames(scenes, fps);
  const transitionDurations = getTransitionDurationsInFrames(scenes, fps);
  const SceneTemplate = SCENE_TEMPLATES[templateId] ?? SimpleTemplate;

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
              <SceneTemplate
                scene={scene}
                durationInFrames={sceneDurations[index]}
                videoTitle={title}
              />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
