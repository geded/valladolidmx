/**
 * mocks/resenas.ts — Reseñas placeholder Fase 0.
 */
import type { Review } from "@/types/entities";

export const RESENAS_MOCK: readonly Review[] = [
  {
    id: "44444444-aaaa-4aaa-8aaa-000000000001",
    author_name: "Lucía M.",
    author_origin: "Ciudad de México",
    rating: 5,
    body: "Llegué por Valladolid y me fui hasta Ek Balam. La diferencia entre 'visitar' y 'sentir' un lugar.",
    locale: "es",
    created_at: "2025-09-12",
  },
  {
    id: "44444444-aaaa-4aaa-8aaa-000000000002",
    author_name: "Marco R.",
    author_origin: "Milano",
    rating: 5,
    body: "Il concierge mi ha aiutato a costruire un itinerario perfetto. Cenote Suytun all'alba, indimenticabile.",
    locale: "it",
    created_at: "2025-08-30",
  },
  {
    id: "44444444-aaaa-4aaa-8aaa-000000000003",
    author_name: "Anaïs P.",
    author_origin: "Lyon",
    rating: 5,
    body: "Un territoire qui se découvre lentement. Les Coloradas au coucher du soleil, c'est une autre planète.",
    locale: "fr",
    created_at: "2025-07-21",
  },
];
