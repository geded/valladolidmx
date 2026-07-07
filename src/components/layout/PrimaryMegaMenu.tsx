/**
 * PrimaryMegaMenu — Menú principal público de Valladolid.mx (Sprint 5).
 *
 * Reemplaza la navegación plana anterior por un menú tipo destino turístico
 * con dropdowns por sección (Oriente Maya, Hoteles, Restaurantes,
 * Experiencias, Casas de vacaciones, ¿Qué hacer?, Más). Reutiliza las
 * rutas ya construidas y consume los destinos publicados vía
 * `listPublishedDestinations`, sin backend nuevo.
 *
 * Modo `desktop` → barra horizontal con dropdowns hover/click accesibles.
 * Modo `mobile`  → acordeón vertical apto para el drawer existente.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { listPublishedDestinations } from "@/lib/cms/public-reads.functions";

type Variant = "desktop" | "mobile";

export interface PrimaryMegaMenuProps {
  variant: Variant;
  isOverlay?: boolean;
  onNavigate?: () => void;
}

interface MenuLink {
  label: string;
  href: string;
  hint?: string;
}

interface MenuSection {
  id: string;
  label: string;
  href: string;
  /** Cuando es una función, se resuelve al abrir con destinos publicados. */
  columns: MenuColumn[] | ((destinos: DestinoLite[]) => MenuColumn[]);
}

interface MenuColumn {
  title?: string;
  links: MenuLink[];
}

interface DestinoLite {
  slug: string;
  name: string;
}

/**
 * Destinos destacados que aparecen siempre arriba del dropdown de
 * Oriente Maya, incluso si la BD aún no está poblada. Los slugs deben
 * coincidir con los publicados en `destinations`.
 */
const FEATURED_DESTINOS: DestinoLite[] = [
  { slug: "valladolid", name: "Valladolid" },
  { slug: "chichen-itza", name: "Chichén Itzá" },
  { slug: "ek-balam", name: "Ek Balam" },
  { slug: "rio-lagartos", name: "Río Lagartos" },
  { slug: "tizimin", name: "Tizimín" },
  { slug: "coba", name: "Cobá" },
];

function mergeDestinos(published: DestinoLite[]): { featured: DestinoLite[]; rest: DestinoLite[] } {
  const bySlug = new Map<string, DestinoLite>();
  for (const d of published) bySlug.set(d.slug, d);
  const featured: DestinoLite[] = [];
  const seen = new Set<string>();
  for (const f of FEATURED_DESTINOS) {
    const match = bySlug.get(f.slug);
    featured.push(match ?? f);
    seen.add(f.slug);
  }
  const rest = published.filter((d) => !seen.has(d.slug));
  return { featured, rest };
}

function buildSections(destinos: DestinoLite[]): MenuSection[] {
  const { featured, rest } = mergeDestinos(destinos);
  const destinosLinks: MenuLink[] = [
    { label: `Ver los ${Math.max(destinos.length, 23)} destinos`, href: "/oriente-maya" },
    ...featured.map((d) => ({ label: d.name, href: `/oriente-maya/${d.slug}` })),
  ];
  const otrosDestinos: MenuLink[] = rest.slice(0, 12).map((d) => ({
    label: d.name,
    href: `/oriente-maya/${d.slug}`,
  }));

  const destFilterLinks = (base: string): MenuLink[] => {
    const list = featured.slice(0, 6);
    return list.map((d) => ({ label: d.name, href: `${base}?destino=${d.slug}` }));
  };

  return [
    {
      id: "oriente-maya",
      label: "Oriente Maya",
      href: "/oriente-maya",
      columns: [
        { title: "Explora", links: destinosLinks },
        ...(otrosDestinos.length ? [{ title: "Más destinos", links: otrosDestinos }] : []),
      ],
    },
    {
      id: "hoteles",
      label: "Hoteles",
      href: "/hoteles",
      columns: [
        {
          title: "Hospedaje",
          links: [{ label: "Todos los hoteles", href: "/hoteles" }],
        },
        { title: "Por destino", links: destFilterLinks("/hoteles") },
      ],
    },
    {
      id: "restaurantes",
      label: "Restaurantes",
      href: "/restaurantes",
      columns: [
        {
          title: "Gastronomía",
          links: [{ label: "Todos los restaurantes", href: "/restaurantes" }],
        },
        { title: "Por destino", links: destFilterLinks("/restaurantes") },
      ],
    },
    {
      id: "experiencias",
      label: "Experiencias",
      href: "/experiencias",
      columns: [
        {
          title: "Reservables",
          links: [
            { label: "Todas las experiencias", href: "/experiencias" },
            { label: "Cenotes", href: "/experiencias?tema=cenotes" },
            { label: "Cultura y tradiciones", href: "/experiencias?tema=cultura" },
            { label: "Aventura", href: "/experiencias?tema=aventura" },
            { label: "Gastronomía", href: "/experiencias?tema=gastronomia" },
            { label: "Bienestar", href: "/experiencias?tema=bienestar" },
            { label: "Tours", href: "/experiencias?tema=tours" },
          ],
        },
        { title: "Por destino", links: destFilterLinks("/experiencias") },
      ],
    },
    {
      id: "casas",
      label: "Casas de vacaciones",
      href: "/casas-de-vacaciones",
      columns: [
        {
          title: "Hospedaje independiente",
          links: [{ label: "Todas las casas", href: "/casas-de-vacaciones" }],
        },
        { title: "Por destino", links: destFilterLinks("/casas-de-vacaciones") },
      ],
    },
    {
      id: "que-hacer",
      label: "¿Qué hacer?",
      href: "/que-hacer",
      columns: [
        {
          title: "Editorial",
          links: [
            { label: "Ver todas las actividades", href: "/que-hacer" },
            { label: "Cultura", href: "/que-hacer?tema=cultura" },
            { label: "Naturaleza", href: "/que-hacer?tema=naturaleza" },
            { label: "Aventura", href: "/que-hacer?tema=aventura" },
            { label: "Gastronomía", href: "/que-hacer?tema=gastronomia" },
          ],
        },
        {
          title: "Vida local",
          links: [
            { label: "Eventos", href: "/eventos" },
            { label: "Mercados", href: "/que-hacer?tema=mercados" },
          ],
        },
      ],
    },
    {
      id: "mas",
      label: "Más",
      href: "/promociones",
      columns: [
        {
          links: [
            { label: "Promociones", href: "/promociones" },
            { label: "Mapa", href: "/mapa" },
            { label: "Blog", href: "/blog" },
            { label: "Contacto", href: "/contacto" },
          ],
        },
      ],
    },
  ];
}

function useSections(): MenuSection[] {
  const { data } = useQuery({
    queryKey: ["primary-menu", "destinations"],
    queryFn: async () => {
      const list = await listPublishedDestinations();
      return list.map((d) => ({ slug: d.slug, name: d.name }));
    },
    staleTime: 5 * 60_000,
  });
  return buildSections(data ?? []);
}

function activeDestinationFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/oriente-maya\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function hrefWithActiveDestination(href: string, activeDestination: string | null): string {
  if (!activeDestination) return href;
  const territorialCategoryHrefs = new Set([
    "/hoteles",
    "/restaurantes",
    "/experiencias",
    "/casas-de-vacaciones",
    "/oriente-maya",
  ]);
  if (!territorialCategoryHrefs.has(href)) return href;
  return `${href}?destino=${encodeURIComponent(activeDestination)}`;
}

export function PrimaryMegaMenu(props: PrimaryMegaMenuProps) {
  const sections = useSections();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [browserPathname, setBrowserPathname] = useState<string | null>(null);
  useEffect(() => {
    setBrowserPathname(window.location.pathname);
  }, [pathname]);
  const activeDestination = activeDestinationFromPath(browserPathname ?? pathname);
  if (props.variant === "desktop") {
    return (
      <DesktopMenu
        sections={sections}
        isOverlay={Boolean(props.isOverlay)}
        activeDestination={activeDestination}
      />
    );
  }
  return (
    <MobileMenu
      sections={sections}
      activeDestination={activeDestination}
      onNavigate={props.onNavigate}
    />
  );
}

/* ─────────────────────────── Desktop ─────────────────────────── */

function DesktopMenu({
  sections,
  isOverlay,
  activeDestination,
}: {
  sections: MenuSection[];
  isOverlay: boolean;
  activeDestination: string | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };
  const openNow = (id: string) => {
    cancelClose();
    setOpen(id);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => () => cancelClose(), []);

  return (
    <nav
      ref={rootRef}
      aria-label="Principal"
      className="hidden xl:block"
    >
      <ul className="flex items-center gap-1 xl:gap-2">
        {sections.map((section) => {
          const isOpen = open === section.id;
          const cols = Array.isArray(section.columns) ? section.columns : [];
          return (
            <li
              key={section.id}
              className="relative"
              onMouseEnter={() => openNow(section.id)}
              onMouseLeave={scheduleClose}
            >
              <a
                href={hrefWithActiveDestination(section.href, activeDestination)}
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={(e) => {
                  // Click sobre el trigger sólo abre/cierra el dropdown.
                  // Para navegar a la sección se usa el primer link "Ver todo".
                  e.preventDefault();
                  setOpen(isOpen ? null : section.id);
                }}
                className={cn(
                  "relative inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] font-medium tracking-tight transition-colors duration-150 active:scale-[0.98] xl:px-3 xl:text-[13.5px]",
                  "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-0.5 after:h-[2px] after:origin-center after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-200",
                  isOverlay
                    ? "text-white/90 hover:text-white"
                    : "text-foreground/75 hover:text-foreground",
                  isOpen && (isOverlay ? "text-white after:scale-x-100" : "text-foreground after:scale-x-100"),
                )}
              >
                {section.label}
                <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} aria-hidden />
              </a>
              {isOpen ? (
                <div
                  className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2"
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  <div
                    role="menu"
                    className={cn(
                      "rounded-2xl border border-border/70 bg-background p-5 shadow-elevated",
                      cols.length > 1 ? "w-[40rem]" : "w-72",
                    )}
                  >
                    <div
                      className={cn(
                        "grid gap-6",
                        cols.length > 1 ? "grid-cols-2" : "grid-cols-1",
                      )}
                    >
                      {cols.map((col, idx) => (
                        <div key={idx}>
                          {col.title ? (
                            <p className="mb-2 px-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                              {col.title}
                            </p>
                          ) : null}
                          <ul className="flex flex-col gap-0.5">
                            {col.links.map((link) => (
                              <li key={link.href + link.label}>
                                <Link
                                  to={hrefWithActiveDestination(link.href, activeDestination)}
                                  role="menuitem"
                                  onClick={() => setOpen(null)}
                                  className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ─────────────────────────── Mobile ─────────────────────────── */

function MobileMenu({
  sections,
  activeDestination,
  onNavigate,
}: {
  sections: MenuSection[];
  activeDestination: string | null;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-0.5">
      {sections.map((section) => {
        const isOpen = open === section.id;
        const cols = Array.isArray(section.columns) ? section.columns : [];
        return (
          <li key={section.id} className="border-b border-border/40 last:border-b-0">
            <div className="flex items-stretch">
              <a
                href={hrefWithActiveDestination(section.href, activeDestination)}
                onClick={() => onNavigate?.()}
                className="flex-1 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium leading-tight text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {section.label}
              </a>
              <button
                type="button"
                aria-label={isOpen ? `Cerrar ${section.label}` : `Abrir ${section.label}`}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : section.id)}
                className="inline-flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
              </button>
            </div>
            {isOpen ? (
              <div className="pb-3 pl-3">
                {cols.map((col, idx) => (
                  <div key={idx} className="mt-2">
                    {col.title ? (
                      <p className="text-caption mb-1 px-2 text-muted-foreground">
                        {col.title}
                      </p>
                    ) : null}
                    <ul className="flex flex-col gap-0.5">
                      {col.links.map((link) => (
                        <li key={link.href + link.label}>
                          <a
                            href={hrefWithActiveDestination(link.href, activeDestination)}
                            onClick={() => onNavigate?.()}
                            className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}