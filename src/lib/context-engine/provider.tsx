/**
 * Context Engine — Provider + hook (H-02 · I1).
 *
 * Montaje aditivo y opcional: si ninguna ruta lo monta, no ocurre nada
 * y el resto del sitio funciona idéntico. Diseñado para SSR: en
 * servidor, `previous` es siempre `undefined`.
 *
 * Contrato de uso (I1, sólo para playground):
 *   <ContextEngineProvider declaration={...}>
 *     ...consumidores que llaman useResolvedContext()...
 *   </ContextEngineProvider>
 *
 * En I2+ podrá montarse en `PublicShell` bajo un flag opcional; en I1
 * no lo hacemos para garantizar cero impacto observable.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { emitContextEngineEvent } from "./events";
import {
  readPreviousContext,
  writePreviousContext,
} from "./previous-store";
import { resolveContext } from "./resolver";
import type {
  InheritanceRule,
  PreviousContext,
  ResolvedContext,
  RouteContextDeclaration,
} from "./types";

const ResolvedContextCtx = createContext<ResolvedContext | null>(null);

interface ContextEngineProviderProps {
  readonly declaration: RouteContextDeclaration;
  readonly rules?: readonly InheritanceRule[];
  /**
   * Si es `true`, al montar guarda `current + ancestors` como
   * `previous` para el próximo render. Default `true` en cliente,
   * inerte en SSR.
   */
  readonly persistOnMount?: boolean;
  readonly children: ReactNode;
}

/**
 * Hook interno SSR-safe. Devuelve `undefined` en servidor y en el
 * primer render de cliente; el efecto rellena tras hidratación
 * para evitar hydration mismatch.
 *
 * IMPORTANTE: `useSyncExternalStore` exige que `getSnapshot` devuelva
 * una referencia estable mientras el estado subyacente no cambie.
 * `readPreviousContext()` parsea JSON en cada llamada y retorna un
 * objeto nuevo cada vez → sin caché, React lanza
 * "getSnapshot should be cached to avoid an infinite loop" y
 * "Maximum update depth exceeded" al hidratar cualquier ruta con
 * provider. Cacheamos por JSON serializado a nivel de módulo (single
 * store, sin fuga entre requests SSR porque el snapshot server es
 * siempre `undefined`).
 */
let __cachedRaw: string | null = null;
let __cachedValue: PreviousContext | undefined;
function cachedSnapshot(): PreviousContext | undefined {
  const next = readPreviousContext();
  const raw = next ? JSON.stringify(next) : null;
  if (raw === __cachedRaw) return __cachedValue;
  __cachedRaw = raw;
  __cachedValue = next;
  return __cachedValue;
}

function useClientPrevious(): PreviousContext | undefined {
  const subscribe = () => () => {}; // no re-suscripción; leemos on-demand
  const getSnapshot = () => cachedSnapshot();
  const getServerSnapshot = () => undefined;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ContextEngineProvider({
  declaration,
  rules,
  persistOnMount = true,
  children,
}: ContextEngineProviderProps) {
  const previous = useClientPrevious();

  const result = useMemo(
    () => resolveContext({ declaration, previous, rules }),
    [declaration, previous, rules],
  );

  // Emitir eventos sólo cuando cambia el href actual (evita spam en re-render).
  const lastEmittedHref = useRef<string | null>(null);
  useEffect(() => {
    const href = result.context.canonical;
    if (lastEmittedHref.current === href) return;
    lastEmittedHref.current = href;

    emitContextEngineEvent("context_engine.resolved", {
      kind: result.context.current.kind,
      currentHref: href,
      previousHref: previous?.from.href,
      source: result.context.source,
    });
    if (result.inheritedSlots.length > 0) {
      emitContextEngineEvent("context_engine.inherited", {
        kind: result.context.current.kind,
        currentHref: href,
        previousHref: previous?.from.href,
        inheritedSlots: result.inheritedSlots,
      });
    }
    if (result.usedFallback) {
      emitContextEngineEvent("context_engine.fallback_kind_default", {
        kind: result.context.current.kind,
        currentHref: href,
      });
    }
  }, [result, previous]);

  // Persistir current como próximo `previous` — sólo cliente.
  useEffect(() => {
    if (!persistOnMount) return;
    writePreviousContext(result.context.current, result.context.ancestors);
    emitContextEngineEvent("context_engine.previous_saved", {
      kind: result.context.current.kind,
      currentHref: result.context.canonical,
    });
    // sólo al cambiar de canonical
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.context.canonical, persistOnMount]);

  return (
    <ResolvedContextCtx.Provider value={result.context}>
      {children}
    </ResolvedContextCtx.Provider>
  );
}

/**
 * Hook público. Retorna `null` cuando no hay provider — todos los
 * consumidores DEBEN tratar `null` como "sin contexto disponible" y
 * caer a su comportamiento actual (retrocompatibilidad total).
 */
export function useResolvedContext(): ResolvedContext | null {
  return useContext(ResolvedContextCtx);
}

/**
 * Helper declarativo. Su único propósito es dar un punto de entrada
 * uniforme y auto-documentado en las rutas. En I1 no está montado en
 * ninguna ruta real; existe para el playground y para I3+.
 */
export function defineRouteContext(
  declaration: RouteContextDeclaration,
): RouteContextDeclaration {
  return declaration;
}