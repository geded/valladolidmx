/**
 * resilientLazy — carga diferida que no tumba la app sin señal.
 *
 * Igual que `React.lazy` cuando la descarga funciona (mismo SSR, mismo
 * Suspense, cero cambio visual). Si el archivo de la pieza no se puede
 * descargar (sin señal y sin copia guardada), la pieza se omite en lugar de
 * lanzar un error que reemplace toda la página por «Sin conexión». El
 * navegador recuerda la descarga fallida, así que la pieza vuelve la próxima
 * vez que se abre la app con señal.
 */
import * as React from "react";

// Mismo tipo de componente que acepta React.lazy.
type LazyComponent = Awaited<ReturnType<Parameters<typeof React.lazy>[0]>>["default"];

// Pieza vacía (renderiza nada) para cuando la descarga falla.
const skippedOfflinePiece = (): null => null;

/** Nunca rechaza: si la descarga falla, entrega una pieza vacía. */
export function resilientFactory<T extends LazyComponent>(
  factory: () => Promise<{ default: T }>,
): Promise<{ default: T }> {
  return factory().catch(() => ({ default: skippedOfflinePiece as unknown as T }));
}

export function resilientLazy<T extends LazyComponent>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(() => resilientFactory(factory));
}
