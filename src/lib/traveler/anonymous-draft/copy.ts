/**
 * Copy oficial del Concierge Voice para superficies anónimas (AC1).
 * Fuente única. Cumple `mem://policies/founder-concierge-voice.md`:
 * NUNCA usa términos técnicos (borrador, draft, sesión, almacenamiento,
 * IndexedDB, TTL, migrar). Toda superficie visible al viajero consume este
 * módulo y jamás inventa copy propio. i18n-ready — ES base en AC1.1.
 */
export const ANON_COPY = {
  welcomeBack: {
    title: "¡Qué bueno verte de nuevo!",
    body: "Continuemos preparando tu viaje.",
    cta: "Continuar mi viaje",
    dismiss: "Empezar uno nuevo",
  },
  toast: {
    favoriteSaved: "Guardé esta experiencia para tu viaje.",
    itemAddedToTrip: "Ya empecé a preparar tu viaje.",
    keepPlanning: "Podemos seguir planeando cuando regreses.",
  },
  scopeNotice: "Este viaje permanecerá disponible en este dispositivo.",
  registration: {
    title: "Tu viaje ya está tomando forma.",
    body:
      "Si creas una cuenta, podrás continuar este viaje desde cualquier " +
      "dispositivo y dejar que Alux te acompañe antes, durante y después.",
    primary: "Guardar mi viaje",
    secondary: "Continuar sin registrarme",
  },
  limitReached: {
    title: "Tu viaje está creciendo bonito.",
    body:
      "Guarda tu viaje para seguir agregando experiencias sin límite y " +
      "recibirlas en cualquier dispositivo.",
    primary: "Guardar mi viaje",
    secondary: "Ahora no",
  },
  /**
   * AC1.2 · Founder Intent Recognition Principle.
   *
   * Microinteracciones conversacionales del Concierge para cada intención
   * detectada. Prohibido usar aquí lenguaje técnico ("guardado",
   * "agregado", "eliminado", "registro", "elemento"). Los mensajes
   * describen SOLO la acción del viajero y el acompañamiento de Alux, sin
   * inferir gustos, preferencias ni memoria paralela.
   */
  intent: {
    favoriteAcknowledged: {
      title: "Excelente elección.",
      body: "Lo tendré presente para tu viaje.",
    },
    favoriteReleased: {
      title: "Entendido.",
      body: "Este lugar ya no forma parte de tu viaje.",
    },
    planAcknowledged: {
      title: "Perfecto.",
      body: "Seguimos construyendo tu viaje juntos.",
    },
    planAlready: {
      title: "Ya quedó considerado.",
      body: "Esta experiencia ya forma parte de tu viaje.",
    },
    planReleased: {
      title: "Entiendo.",
      body: "Esto ya no forma parte de tus planes.",
    },
    limitFriendly: {
      title: "Tu viaje ya está tomando forma.",
      body:
        "Guárdalo para seguir sumando experiencias sin límite y " +
        "continuar en cualquier dispositivo.",
    },
  },
} as const;

export type AnonCopyKey = keyof typeof ANON_COPY;
