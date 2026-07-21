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
  dock: {
    button: "Tu viaje",
    title: "Tu viaje ya está tomando forma.",
    oneItem: "Tienes 1 lugar en tu viaje.",
    manyItems: "Tienes {count} lugares en tu viaje.",
    scope:
      "Puedes seguir planeando en este dispositivo o guardarlo en tu cuenta para continuar donde quieras.",
    open: "Ver mi viaje",
    save: "Guardar mi viaje",
    continue: "Seguir explorando",
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
  /**
   * AC1.3 · Founder Continuity Recognition + First Five Seconds.
   *
   * Bank oficial de continuidad. El Delight Moment consume EXCLUSIVAMENTE
   * este bloque — nunca se inventa copy en superficie. La rotación es
   * determinista por índice para preservar hidratación SSR-safe.
   */
  continuity: {
    greetings: [
      {
        title: "¡Qué gusto volver a verte!",
        body: "Sigamos preparando tu viaje.",
      },
      {
        title: "Tu viaje te estaba esperando.",
        body: "Continuemos donde lo dejamos.",
      },
      {
        title: "Continuemos desde donde lo dejamos.",
        body: "Alux sigue acompañándote en el Oriente Maya.",
      },
      {
        title: "Todavía tenemos un gran viaje por delante.",
        body: "Retomemos juntos lo que ya empezamos.",
      },
    ],
    where: {
      label: "Dónde nos quedamos",
      empty: "Ya empecé a preparar tu viaje.",
    },
    important: {
      label: "Lo más importante ahora",
    },
    nextStep: {
      label: "Tu siguiente paso",
    },
    primaryCta: "Continuemos mi viaje",
    secondaryCta: "Empezar un viaje nuevo",
    scopeNotice: "Este viaje permanecerá disponible en este dispositivo.",
  },
} as const;

export type AnonCopyKey = keyof typeof ANON_COPY;
