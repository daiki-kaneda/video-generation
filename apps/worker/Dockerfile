# Fargate 上で動作する動画生成ワーカー。
# ビルドコンテキストはリポジトリルート (npm workspaces monorepo) を想定。
# 例: docker build -f apps/worker/Dockerfile -t video-generation-worker .
FROM node:20-bookworm-slim

# Remotion (Chrome Headless Shell) の実行に必要な共有ライブラリ
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker

RUN npm install

RUN npm run build --workspace=@video-generation/shared \
    && npm run build --workspace=@video-generation/worker

# Remotion (@remotion/renderer の ensureBrowser()) が使用する Headless Chrome を
# 事前にダウンロードしてイメージに含めておく(初回起動時のダウンロード待ちを避ける)。
RUN cd apps/worker && node -e "require('@remotion/renderer').ensureBrowser().then(() => process.exit(0))"

ENV NODE_ENV=production

WORKDIR /app/apps/worker

CMD ["node", "dist/index.js"]
