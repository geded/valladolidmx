/**
 * `vmx.experience.menu` — Carta de restaurantes y cafeterías.
 *
 * Capa 2 (Contenido). Secciones con platillos y bebidas, precio de
 * referencia y etiquetas. Fuente única: `business_menu_items` publicada
 * (empresa publicada + platillo disponible). Sin la venta activada, precio de
 * referencia; con «Pedidos para recoger» activado (1.1.0) la carta se puede
 * pedir y pagar en línea (`capabilities.ordering`).
 * Evolución sólo por `variant` / `capabilities`.
 */
import { z } from "zod";

export const EXPERIENCE_MENU_CONTRACT_VERSION = "1.1.0";

export const experienceMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  /** Precio ya formateado ("$55"); `null` = la carta no lo publica. */
  priceLabel: z.string().nullable(),
  tags: z.array(z.string()),
  /** 1.1.0 · identidad del platillo, sólo para pedir en línea. */
  id: z.string().optional(),
  /** 1.1.0 · precio en pesos, sólo para pedir en línea. */
  price: z.number().nullable().optional(),
});
export type ExperienceMenuItem = z.infer<typeof experienceMenuItemSchema>;

export const experienceMenuSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  items: z.array(experienceMenuItemSchema).min(1),
});
export type ExperienceMenuSection = z.infer<typeof experienceMenuSectionSchema>;

export const experienceMenuDtoSchema = z.object({
  contractVersion: z.literal(EXPERIENCE_MENU_CONTRACT_VERSION),
  variant: z.enum(["sections"]),
  heading: z.string().min(1),
  ariaLabel: z.string().min(1),
  sections: z.array(experienceMenuSectionSchema).min(1),
  /** Aviso al pie: precios de referencia, sin cobro en línea. */
  footnote: z.string().min(1),
  capabilities: z.object({
    /** Platillos visibles por sección antes de «Ver toda la carta». */
    previewPerSection: z.number().int().min(1).max(50),
    /** 1.1.0 · la empresa tiene «Pedidos para recoger» activado en su página. */
    ordering: z.object({ businessId: z.string().min(1) }).optional(),
  }),
});
export type ExperienceMenuDTO = z.infer<typeof experienceMenuDtoSchema>;
