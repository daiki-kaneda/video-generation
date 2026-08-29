import type { CreateVideoRequest } from "@video-generation/shared";

export type Scene = CreateVideoRequest["scenes"][number];

/** 各テンプレートの「1シーン分の見た目」を担当するコンポーネントの共通props */
export interface SceneTemplateProps {
  scene: Scene;
  durationInFrames: number;
  /** 動画全体のタイトル (newsBulletinの番組名透かしなどで使用) */
  videoTitle: string;
}

export type SceneTemplateComponent = React.FC<SceneTemplateProps>;
