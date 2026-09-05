/**
 * Experiencias · Constantes del contrato de atributos turísticos (cliente-seguro).
 *
 * Familia del catálogo administrable (`tourism_attribute_definitions`) que
 * gobierna las experiencias y claves de los ejes con tratamiento especial en
 * la ficha y el listado. Sin datos, sin fixtures: sólo nombres de contrato.
 */
export const EXPERIENCE_ATTRIBUTE_FAMILY = "experiencias" as const;

/** Eje "Tipo de experiencia" (Lote 3E, migración aditiva). */
export const EXPERIENCE_TYPE_ATTRIBUTE_KEY = "tipo_experiencia" as const;

/** Ejes que la ficha proyecta en secciones propias en lugar de "Datos clave". */
export const EXPERIENCE_LANGUAGE_ATTRIBUTE_KEY = "idioma" as const;
export const EXPERIENCE_ACCESSIBILITY_ATTRIBUTE_KEY = "accesibilidad" as const;
