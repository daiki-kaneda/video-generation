import path from "node:path";
import os from "node:os";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import {
  VIDEO_COMPOSITION_ID,
  type CreateVideoRequest,
} from "@video-generation/shared";

let bundleLocationPromise: Promise<string> | undefined;

/**
 * Remotion のコンポジションを webpack バンドルする。
 * プロセス内でキャッシュし、ジョブ毎の再バンドルを避ける。
 *
 * `@video-generation/remotion-video` は JSX を含みブラウザ向けにバンドルされる
 * パッケージのため、Node.js プロセスから直接 `import`/`require` はせず、
 * `require.resolve` でソースファイルの物理パスだけを取得して
 * Remotion の webpack バンドラーに渡す(コード自体はここでは実行しない)。
 */
const getBundleLocation = (): Promise<string> => {
  if (!bundleLocationPromise) {
    const entryPackageJson = require.resolve(
      "@video-generation/remotion-video/package.json",
    );
    const entryPoint = path.join(
      path.dirname(entryPackageJson),
      "src",
      "index.ts",
    );
    bundleLocationPromise = bundle({
      entryPoint,
      onProgress: () => undefined,
    });
  }
  return bundleLocationPromise;
};

/**
 * 入力JSONを元にRemotionでレンダリングし、ローカルの一時ファイルパスを返す。
 */
export const renderVideo = async (
  videoId: string,
  input: CreateVideoRequest,
): Promise<string> => {
  await ensureBrowser();
  const serveUrl = await getBundleLocation();

  const composition = await selectComposition({
    serveUrl,
    id: VIDEO_COMPOSITION_ID,
    inputProps: input,
  });

  const outputLocation = path.join(os.tmpdir(), `${videoId}.mp4`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: input,
  });

  return outputLocation;
};
