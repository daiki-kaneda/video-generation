import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  define: {
    // amazon-cognito-identity-js が Node.js の `global` を参照するためのポリフィル
    global: "globalThis",
  },
  optimizeDeps: {
    // npm workspaces のローカルパッケージはシンボリックリンク経由で解決されるため、
    // Viteの依存事前バンドル(esbuildによるCJS→ESM変換)の自動検出対象から外れ、
    // named export が解決できないことがある。明示的に含めて確実にプリバンドルさせる。
    include: ["@video-generation/shared"],
  },
});
