/**
 * Monitor de visitantes · Filtro de visitas medibles.
 *
 * El monitor sólo cuenta visitas reales del sitio publicado. No se publica
 * ninguna señal cuando la visita viene de:
 *  · la vista previa del editor, el servidor local u otro dominio no oficial;
 *  · un navegador automatizado (pruebas, capturas, robots que ejecutan código);
 *  · un robot que se declara como tal en su identificación de navegador.
 *
 * Es puro y no guarda nada: decide en el propio navegador antes de enviar,
 * sin datos personales ni huellas digitales.
 */
import { DEFAULT_PUBLIC_DOMAIN } from "@/config/site";

/** Dominios donde vive el sitio publicado de Valladolid.mx. */
export const MEASURED_HOSTS: readonly string[] = [
  DEFAULT_PUBLIC_DOMAIN,
  `www.${DEFAULT_PUBLIC_DOMAIN}`,
  "valladolidmx.lovable.app",
  "valladolid.com.mx",
  "www.valladolid.com.mx",
];

// Sólo señales inequívocas de robot. Los navegadores internos de WhatsApp,
// Instagram, Facebook o Telegram son personas reales y sí se cuentan.
const BOT_USER_AGENT =
  /(?<!cu)bot\b|crawl|spider|slurp|scrap|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|curl\/|wget\/|python-|java\/|go-http|okhttp|axios\/|node-fetch|bytespider|petalbot|yandex|baiduspider|sogou|semrush|ahrefs|mj12/i;

export type MeasurementVerdict =
  | "measured"
  | "non_production_host"
  | "automated_browser"
  | "declared_bot";

export interface MeasurementInput {
  readonly hostname: string;
  readonly userAgent: string;
  readonly webdriver: boolean;
}

/** Núcleo puro: ¿esta visita cuenta para el monitor? */
export function classifyMeasurement(input: MeasurementInput): MeasurementVerdict {
  const host = input.hostname.trim().toLowerCase();
  if (!MEASURED_HOSTS.includes(host)) return "non_production_host";
  if (input.webdriver) return "automated_browser";
  if (!input.userAgent.trim() || BOT_USER_AGENT.test(input.userAgent)) return "declared_bot";
  return "measured";
}

/** Lectura del navegador actual. SSR-safe: en servidor nunca mide. */
export function isMeasurableVisit(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  try {
    return (
      classifyMeasurement({
        hostname: window.location.hostname,
        userAgent: navigator.userAgent ?? "",
        webdriver: navigator.webdriver === true,
      }) === "measured"
    );
  } catch {
    return false;
  }
}
