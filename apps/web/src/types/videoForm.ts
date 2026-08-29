import type { z } from "zod";
import type { CreateVideoRequestSchema } from "@video-generation/shared";

/**
 * `CreateVideoRequestSchema` は `durationInSeconds`/`fps`/`width`/`height` に
 * `.default()` を持つため、react-hook-form の生の入力値の型(パース前, Input)と
 * バリデーション後にAPIへ送信する型(パース後, Output)が異なる。
 * zodResolver は `Resolver<Input, Context, Output>` を返すため、
 * `useForm<Input, Context, Output>` の形でこの2つを区別して指定する必要がある。
 */
export type VideoFormInput = z.input<typeof CreateVideoRequestSchema>;
export type VideoFormOutput = z.output<typeof CreateVideoRequestSchema>;
