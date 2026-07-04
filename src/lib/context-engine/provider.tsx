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
  useState,
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
 * Hook interno SSR-safe. Captura `previous` UNA sola vez al montar,
 * después de la hidratación. Esto es crítico:
 *
 * · El primer render (SSR + primera hidratación cliente) usa
 *   `undefined` → sin herencia → HTML server = HTML cliente inicial
 *   (cero hydration mismatch por este dato).
 * · Un `useEffect` de montaje lee `sessionStorage` UNA vez y setea
 *   el snapshot. Trigger un re-render con `previous` real → resolver
 *   aplica herencia y el breadcrumb se enriquece.
 * · El `useEffect` que persiste el NUEVO `previous` (esta ruta) para
 *   la próxima navegación NO afecta el snapshot capturado, evitando
 *   la auto-sobrescritura que anulaba la herencia en I3–I5.
 * · Sin `useSyncExternalStore` no reaparece el warning
 *   "getSnapshot should be cached to avoid an infinite loop".
 */
function useClientPrevious(): PreviousContext | undefined {
  const [previous, setPrevious] = useState<PreviousContext | undefined>(undefined);
  useEffect(() => {
    setPrevious(readPreviousContext());
    // Snapshot único al montar la ruta; cambios posteriores en
    // sessionStorage no re-disparan este provider (se leen al montar
    // el provider de la próxima ruta).
  }, []);
  return previous;
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
  // La dependencia incluye un fingerprint de ancestors: la primera
  // hidratación calcula ancestors=[] (previous aún undefined) y
  // escribiría un previous "plano" que rompe la cadena
  // Destino → Categoría → Categoría (hallazgo I5). Al llegar el
  // previous heredado y re-computar ancestors, este effect vuelve a
  // dispararse y persiste el snapshot completo con territorio incluido.
  const ancestorsFingerprint = result.context.ancestors
    .map((n) => `${n.kind}:${n.slug ?? n.href ?? n.label}`)
    .join("|");
  useEffect(() => {
    if (!persistOnMount) return;
    writePreviousContext(result.context.current, result.context.ancestors);
    emitContextEngineEvent("context_engine.previous_saved", {
      kind: result.context.current.kind,
      currentHref: result.context.canonical,
    });
    // sólo al cambiar de canonical
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.context.canonical, ancestorsFingerprint, persistOnMount]);

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