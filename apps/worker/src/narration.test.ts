import assert from "node:assert/strict";
import { test } from "node:test";
import { getNarrationCacheKey, resolveNarrationText } from "./narration";

test("resolveNarrationText: narrationSkip=trueなら読み上げない", () => {
  const result = resolveNarrationText({
    narrationSkip: true,
    text: "こんにちは",
    subtext: "元気ですか",
  });
  assert.equal(result, undefined);
});

test("resolveNarrationText: narrationTextがあれば優先される", () => {
  const result = resolveNarrationText({
    narrationSkip: false,
    narrationText: "カスタムの読み上げテキスト",
    text: "画面のテキスト",
    subtext: "画面のサブテキスト",
  });
  assert.equal(result, "カスタムの読み上げテキスト");
});

test("resolveNarrationText: narrationText未指定ならtext+subtextを結合する", () => {
  const result = resolveNarrationText({
    narrationSkip: false,
    text: "本日のニュースです",
    subtext: "詳しく見ていきましょう",
  });
  assert.equal(result, "本日のニュースです。詳しく見ていきましょう");
});

test("resolveNarrationText: subtextのみでも結合される", () => {
  const result = resolveNarrationText({
    narrationSkip: false,
    subtext: "詳しく見ていきましょう",
  });
  assert.equal(result, "詳しく見ていきましょう");
});

test("resolveNarrationText: text/subtextが両方無ければundefined", () => {
  const result = resolveNarrationText({ narrationSkip: false });
  assert.equal(result, undefined);
});

test("resolveNarrationText: 空白のみのテキストは無視される", () => {
  const result = resolveNarrationText({
    narrationSkip: false,
    text: "   ",
    subtext: "",
  });
  assert.equal(result, undefined);
});

test("getNarrationCacheKey: 同一の入力は同一のキーになる(キャッシュ再利用の前提)", () => {
  const keyA = getNarrationCacheKey("こんにちは", "standard", "Takumi");
  const keyB = getNarrationCacheKey("こんにちは", "standard", "Takumi");
  assert.equal(keyA, keyB);
});

test("getNarrationCacheKey: テキストが異なれば別のキーになる", () => {
  const keyA = getNarrationCacheKey("こんにちは", "standard", "Takumi");
  const keyB = getNarrationCacheKey("さようなら", "standard", "Takumi");
  assert.notEqual(keyA, keyB);
});

test("getNarrationCacheKey: engineが異なれば別のキーになる(コスト差を明確に分離するため)", () => {
  const keyA = getNarrationCacheKey("こんにちは", "standard", "Takumi");
  const keyB = getNarrationCacheKey("こんにちは", "neural", "Takumi");
  assert.notEqual(keyA, keyB);
});

test("getNarrationCacheKey: voiceIdが異なれば別のキーになる", () => {
  const keyA = getNarrationCacheKey("こんにちは", "standard", "Takumi");
  const keyB = getNarrationCacheKey("こんにちは", "standard", "Mizuki");
  assert.notEqual(keyA, keyB);
});

test("getNarrationCacheKey: engine/voiceIdごとにプレフィックスが分かれる", () => {
  const key = getNarrationCacheKey("こんにちは", "standard", "Takumi");
  assert.match(key, /^tts-cache\/standard\/Takumi\/[0-9a-f]{64}\.mp3$/);
});
