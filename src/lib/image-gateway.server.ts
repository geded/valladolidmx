/**
 * Image Gateway server module — AI image generation via Lovable AI Gateway.
 *
 * Server-only. Never import from client code.
 */
export type ImageConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
  format: "openai" | "gemini-chat" | "generate-content";
};

export const imageSettings: Omit<ImageConfig, "apiKey"> = {
  baseURL: "https://ai.gateway.lovable.dev",
  model: "google/gemini-3.1-flash-image",
  format: "gemini-chat" as const,
};

export function generateImage(config: ImageConfig, prompt: string, stream = true, signal?: AbortSignal) {
  const input =
    config.format === "openai"
      ? { prompt, ...(stream ? { partial_images: 1 } : {}) }
      : config.format === "generate-content"
        ? {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }
        : {
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          };
  return fetch(`${config.baseURL}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, ...input, ...(stream ? { stream: true } : {}) }),
    signal: signal ?? null,
  });
}
