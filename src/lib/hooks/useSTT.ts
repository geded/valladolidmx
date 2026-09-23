/**
 * Hook useSTT · Graba audio del micrófono y lo transcribe a texto
 *
 * Usa MediaRecorder para capturar audio y lo envía a /api/public/stt
 * que llama a Gemini Transcribe en AI Gateway.
 */
import { useCallback, useRef, useState } from "react";
import { createParser } from "eventsource-parser";

type STTState = "idle" | "recording" | "transcribing" | "error";

export function useSTT() {
  const [state, setState] = useState<STTState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    return new Promise<string>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve("");
        return;
      }

      recorder.onstop = async () => {
        cleanup();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 2048) {
          setState("error");
          setError("Grabación demasiado corta");
          resolve("");
          return;
        }

        setState("transcribing");
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const form = new FormData();
          form.append("file", blob, "recording.webm");

          const response = await fetch("/api/public/stt", {
            method: "POST",
            body: form,
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data?.error || `STT falló: ${response.status}`);
          }

          let transcript = "";
          let done = false;

          const parser = createParser({
            onEvent(event) {
              const payload = JSON.parse(event.data) as {
                type: string;
                delta?: string;
                text?: string;
                error?: unknown;
              };

              if (payload.type === "error" || payload.error) {
                throw new Error(`Transcription error: ${event.data}`);
              }

              if (payload.type === "transcript.text.delta" && payload.delta) {
                transcript += payload.delta;
              } else if (payload.type === "transcript.text.done") {
                if (payload.text) transcript = payload.text;
                done = true;
              }
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

          if (!done && !transcript) {
            throw new Error("Transcripción vacía");
          }

          setState("idle");
          resolve(transcript.trim());
        } catch (err) {
          if (controller.signal.aborted) {
            setState("idle");
            resolve("");
            return;
          }
          console.error("STT error:", err);
          setError(err instanceof Error ? err.message : "Error de transcripción");
          setState("error");
          resolve("");
        }
      };

      try { recorder.stop(); } catch { /* noop */ }
    });
  }, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setState("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
    } catch (err) {
      console.error("STT start error:", err);
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Permiso de micrófono denegado"
          : "No se pudo acceder al micrófono",
      );
      setState("error");
      cleanup();
    }
  }, [cleanup]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    cleanup();
    setState("idle");
  }, [cleanup]);

  return { state, error, start, stop, cancel };
}
