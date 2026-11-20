/**
 * Hook useTTS · Reproduce texto en voz alta vía streaming SSE
 *
 * Usa el endpoint /api/public/tts que llama a Gemini TTS en AI Gateway.
 * Decodifica PCM 24kHz mono y lo reproduce con AudioContext.
 */
import { useCallback, useRef, useState } from "react";
import { createParser } from "eventsource-parser";

type TTSState = "idle" | "loading" | "playing" | "error";

function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }
  return { samples, pending: bytes.slice(usable) };
}

export function useTTS() {
  const [state, setState] = useState<TTSState>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stop = useCallback(() => {
    abortRef.current?.abort();
    for (const src of sourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    sourcesRef.current.clear();
    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
    setState("idle");
  }, []);

  const speak = useCallback(async (text: string) => {
    // Si ya está reproduciendo, detener primero
    if (abortRef.current) {
      abortRef.current.abort();
      for (const src of sourcesRef.current) {
        try { src.stop(); } catch { /* noop */ }
      }
      sourcesRef.current.clear();
    }

    if (!text.trim()) return;
    setError(null);
    setState("loading");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const context = new AudioContext({ sampleRate: 24000 });
      contextRef.current = context;
      if (context.state === "suspended") {
        await context.resume();
      }

      const response = await fetch("/api/public/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || `TTS falló: ${response.status}`);
      }

      setState("playing");

      let pending = new Uint8Array(0);
      let playhead = 0;
      let completed = false;
      let samplesPlayed = 0;
      let playback: Promise<void> = Promise.resolve();

      const parser = createParser({
        onEvent(event) {
          const payload = JSON.parse(event.data) as {
            type: string;
            audio?: string;
            error?: unknown;
          };

          if (payload.type === "error" || payload.error) {
            throw new Error(`Speech error: ${event.data}`);
          }

          if (payload.type === "speech.audio.done") {
            completed = true;
            return;
          }

          if (payload.type !== "speech.audio.delta") return;
          if (completed || !payload.audio) return;

          // Decode base64 → PCM
          const binary = atob(payload.audio);
          const incoming = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            incoming[i] = binary.charCodeAt(i);
          }

          const decoded = decodePCM(pending, incoming);
          pending = new Uint8Array(decoded.pending);

          if (!decoded.samples.length) return;

          samplesPlayed += decoded.samples.length;
          const buffer = context.createBuffer(1, decoded.samples.length, 24000);
          buffer.copyToChannel(decoded.samples, 0);
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          sourcesRef.current.add(source);

          playback = new Promise<void>((resolve) => {
            source.onended = () => {
              sourcesRef.current.delete(source);
              resolve();
            };
          });

          // Schedule slightly ahead to avoid device startup clipping
          playhead = Math.max(playhead, context.currentTime + 0.05);
          source.start(playhead);
          playhead += buffer.duration;
        },
      });

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          parser.feed(next.value);
        }
        parser.reset({ consume: true });
      } finally {
        reader.releaseLock();
      }

      if (!completed || !samplesPlayed) {
        throw new Error("Stream de audio incompleto");
      }

      // Esperar a que termine la reproducción
      await playback;

      if (!controller.signal.aborted) {
        setState("idle");
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setState("idle");
        return;
      }
      console.error("TTS error:", err);
      setError(err instanceof Error ? err.message : "Error de voz");
      setState("error");
    } finally {
      if (contextRef.current && !controller.signal.aborted) {
        contextRef.current.close().catch(() => {});
        contextRef.current = null;
      }
    }
  }, []);

  return { state, error, speak, stop };
}
