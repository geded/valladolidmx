/**
 * SiteTopBar — Barra utilitaria superior del Header v1.1 (corrección puntual,
 * NO forma parte de la Iniciativa 15.10.8 · Header & Navigation Builder).
 *
 * Sólo se renderiza en anchos `lg+` sobre superficies con Header sólido.
 * Aloja idioma y enlaces institucionales suaves para descongestionar la fila
 * principal (logo + mega menú + CTA + cuenta). Componente puramente
 * presentacional: no lee estado global ni contratos nuevos.
 */
import { Container } from "./Container";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface Props {
  hidden?: boolean;
}

export function SiteTopBar({ hidden }: Props) {
  if (hidden) return null;
  return (
    <div className="hidden border-b border-border/50 bg-muted/40 text-muted-foreground lg:block">
      <Container className="flex h-8 items-center justify-between text-[12px]">
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
        <nav aria-label="Enlaces institucionales" className="flex items-center gap-5">
          <a href="/empresas" className="transition-colors hover:text-foreground">
            Empresas
          </a>
          <a href="/contacto" className="transition-colors hover:text-foreground">
            Contacto
          </a>
          <a href="/blog" className="transition-colors hover:text-foreground">
            Blog
          </a>
        </nav>
      </Container>
    </div>
  );
}