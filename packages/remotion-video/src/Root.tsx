import React from "react";
import { Composition } from "remotion";
import {
  CreateVideoRequestSchema,
  SIMPLE_VIDEO_COMPOSITION_ID,
} from "@video-generation/shared";
import { SimpleVideo } from "./compositions/SimpleVideo";
import { getTotalDurationInFrames } from "./utils";

const defaultProps: React.ComponentProps<typeof SimpleVideo> = {
  title: "サンプル動画",
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    {
      text: "こんにちは",
      subtext: "Remotion で生成された動画です",
      backgroundColor: "#1d4ed8",
      durationInSeconds: 3,
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={SIMPLE_VIDEO_COMPOSITION_ID}
      component={SimpleVideo}
      durationInFrames={getTotalDurationInFrames(
        defaultProps.scenes,
        defaultProps.fps,
      )}
      fps={defaultProps.fps}
      width={defaultProps.width}
      height={defaultProps.height}
      defaultProps={defaultProps}
      schema={CreateVideoRequestSchema}
      calculateMetadata={async ({ props }) => {
        return {
          durationInFrames: getTotalDurationInFrames(props.scenes, props.fps),
          fps: props.fps,
          width: props.width,
          height: props.height,
        };
      }}
    />
  );
};
