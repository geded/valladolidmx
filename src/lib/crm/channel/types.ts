/**
 * CRM Prospectos · puerto de canal de WhatsApp (propuesta 19.48, Fase 2).
 *
 * El CRM no depende del proveedor: hoy el adaptador activo es Evolution API
 * (QR) en el servidor de Railway que también usa Zazil; el adaptador oficial
 * de Meta puede sustituirlo después sin rehacer el CRM.
 */
export interface ChannelQr {
  /** Imagen del QR (data URL base64) o null si el servidor sólo dio el código. */
  readonly imageDataUrl: string | null;
  readonly pairingCode: string | null;
}

export interface ChannelLineInfo {
  readonly state: "open" | "connecting" | "close" | "unknown";
  readonly ownerJid: string | null;
  readonly profileName: string | null;
}

export interface WhatsAppChannel {
  createLine(instanceName: string, webhookUrl: string): Promise<ChannelQr>;
  connect(instanceName: string): Promise<ChannelQr>;
  info(instanceName: string): Promise<ChannelLineInfo>;
  setWebhook(instanceName: string, webhookUrl: string): Promise<void>;
  logout(instanceName: string): Promise<void>;
  sendText(instanceName: string, to: string, text: string): Promise<{ id: string | null }>;
  deleteForEveryone(
    instanceName: string,
    message: { id: string; remoteJid: string; fromMe: boolean },
  ): Promise<void>;
}
