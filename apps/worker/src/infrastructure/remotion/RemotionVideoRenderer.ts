import path from "node:path";
import os from "node:os";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { VIDEO_COMPOSITION_ID, type CreateVideoRequest } from "@video-generation/shared";
import type { VideoRenderer } from "../../application/ports/VideoRenderer";

/** `VideoRenderer` ポートのRemotion実装。 */
export class RemotionVideoRenderer implements VideoRenderer {
  private bundleLocationPromise: Promise<string> | undefined;

  /**
   * Remotion のコンポジションを webpack バンドルする。
   * プロセス内でキャッシュし、ジョブ毎の再バンドルを避ける。
   *
   * `@video-generation/remotion-video` は JSX を含みブラウザ向けにバンドルされる
   * パッケージのため、Node.js プロセスから直接 `import`/`require` はせず、
   * `require.resolve` でソースファイルの物理パスだけを取得して
   * Remotion の webpack バンドラーに渡す(コード自体はここでは実行しない)。
   */
  private getBundleLocation(): Promise<string> {
    if (!this.bundleLocationPromise) {
      const entryPackageJson = require.resolve("@video-generation/remotion-video/package.json");
      const entryPoint = path.join(path.dirname(entryPackageJson), "src", "index.ts");
      this.bundleLocationPromise = bundle({
        entryPoint,
        onProgress: () => undefined,
      });
    }
    return this.bundleLocationPromise;
  }

  async render(videoId: string, input: CreateVideoRequest): Promise<string> {
    await ensureBrowser();
    const serveUrl = await this.getBundleLocation();

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
  }
}
