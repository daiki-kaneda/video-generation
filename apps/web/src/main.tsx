import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { loadRuntimeConfig } from "./lib/runtimeConfig";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

loadRuntimeConfig()
  .then(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err) => {
    rootElement.innerHTML =
      '<p style="padding: 2rem; font-family: sans-serif; color: #b91c1c;">アプリの初期化に失敗しました。時間をおいて再度お試しください。</p>';
    console.error("Failed to load runtime config", err);
  });
