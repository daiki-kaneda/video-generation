export interface RuntimeConfig {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
}

let cachedConfig: RuntimeConfig | undefined;
let loadingPromise: Promise<RuntimeConfig> | undefined;

/**
 * デプロイ時にCDK(FrontendConstruct)がS3へ書き込む `/config.json` を読み込む。
 * ビルド成果物を環境(dev/stg/prod)非依存にするため、
 * API URLやCognitoの設定値はビルド時埋め込みではなく実行時に取得する。
 */
export const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  if (cachedConfig) {
    return cachedConfig;
  }
  if (!loadingPromise) {
    loadingPromise = fetch("/config.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load /config.json: ${res.status}`);
        }
        return res.json() as Promise<RuntimeConfig>;
      })
      .then((config) => {
        cachedConfig = config;
        return config;
      });
  }
  return loadingPromise;
};

/** 読み込み済みの設定を同期的に取得する(未ロード時は例外)。 */
export const getRuntimeConfig = (): RuntimeConfig => {
  if (!cachedConfig) {
    throw new Error(
      "Runtime config is not loaded yet. Call loadRuntimeConfig() first.",
    );
  }
  return cachedConfig;
};
