import { parsePlanLimitError } from "@/lib/visibility/plan-limit-errors";
import { TABLE_BOOKING_ERRORS } from "@/lib/commerce/table-booking";
import { stayErrorMessage } from "@/lib/commerce/stay-calendar";

export function portalStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    published: "Publicado",
    draft: "Borrador",
    approved: "Aprobado",
    in_review: "En revisión",
    rejected: "Rechazado",
    archived: "Archivado",
    pending: "Pendiente",
    accepted: "Aceptado",
    cancelled: "Cancelado",
    revoked: "Cancelado",
    expired: "Vencido",
    submitted: "Enviado",
    open: "Abierto",
    closed: "Cerrado",
    paid: "Pagado",
    confirmed: "Confirmado",
  };
  return labels[status] ?? "Por revisar";
}

const MESSAGES: Record<string, string> = {
  invalid_name:
    "Revisa el nombre. Escríbelo completo, sin dejarlo vacío, y usa hasta 200 caracteres.",
  invalid_title: "Escribe el título de la promoción y usa hasta 200 caracteres.",
  invalid_price: "Revisa el precio. Escribe un importe válido, sin valores negativos.",
  invalid_discount: "Revisa el descuento de la promoción antes de guardarla.",
  invalid_date_range:
    "La fecha final debe ser posterior a la fecha inicial. Revisa las fechas de la promoción.",
  missing_cover: "Falta la foto de portada. Sube una portada antes de publicar.",
  missing_price: "Falta el precio del producto. Captúralo y guarda antes de publicar.",
  description_too_short: "Amplía la descripción a por lo menos 40 caracteres antes de publicar.",
  business_not_published:
    "La empresa todavía no está publicada. Solicita su revisión a Administración.",
  not_authorized_to_self_publish:
    "Solicita a Administración la autorización para publicar productos de esta empresa.",
  "Tu empresa ya tiene un WhatsApp; usa «Mostrar QR».":
    "Tu empresa ya tiene un WhatsApp. Usa «Mostrar QR» para conectarlo.",
  "Tu empresa todavía no tiene WhatsApp.":
    "Primero crea el WhatsApp de tu empresa desde esta sección.",
  "Primero conecta el WhatsApp de tu empresa.":
    "Primero conecta el WhatsApp de tu empresa escaneando su QR.",
  "El servidor de mensajes no está configurado.":
    "WhatsApp todavía no está listo para esta empresa. Pide a Administración que revise su conexión.",
  "No se pudo guardar el WhatsApp.":
    "No pudimos guardar el WhatsApp de la empresa. Intenta nuevamente.",
  "No se pudo completar la operación con WhatsApp.":
    "No pudimos conectar con WhatsApp. Intenta nuevamente o pide a Administración que revise la conexión.",
  "Alux no pudo contestar la prueba en este momento.":
    "Alux no pudo contestar la prueba. Inténtalo nuevamente en unos momentos.",
  invalid_label_length:
    "El nombre de la ubicación o contacto es demasiado largo. Usa hasta 120 caracteres y escribe la dirección en su propio campo.",
  invalid_address_line1_length:
    "La dirección es demasiado larga. Usa hasta 240 caracteres y coloca las referencias en el segundo campo.",
  invalid_address_line2_length:
    "Las referencias de la dirección son demasiado largas. Usa hasta 240 caracteres.",
  invalid_postal_code_length:
    "El código postal es demasiado largo. Revisa que no hayas pegado la dirección en este campo.",
  invalid_latitude: "La latitud no es válida. Escribe un número entre −90 y 90.",
  invalid_longitude: "La longitud no es válida. Escribe un número entre −180 y 180.",
  hours_open_close_required: "Completa la hora de apertura y cierre, o marca el día como cerrado.",
  invalid_opens_at: "Revisa la hora de apertura y selecciona una hora válida.",
  invalid_closes_at: "Revisa la hora de cierre y selecciona una hora válida.",
  invalid_day_of_week: "Selecciona el día de la semana que deseas configurar.",
  invalid_url: "El enlace no es válido. Copia la dirección completa, comenzando con https://.",
  invalid_email:
    "El correo no es válido. Revisa que incluya el nombre y el dominio, por ejemplo nombre@empresa.com.",
  invalid_contact_type: "Selecciona si este contacto es teléfono, WhatsApp, correo o sitio web.",
  invalid_platform: "Selecciona la red social a la que pertenece el enlace.",
  required_value: "Escribe el teléfono, correo o enlace del contacto antes de guardarlo.",
  invalid_value_length:
    "El dato de contacto es demasiado largo. Revisa que hayas escrito solamente el teléfono, correo o enlace.",
  invalid_notes_length: "La nota es demasiado larga. Acórtala antes de guardar.",
  forbidden_only_current_owner:
    "Solo el propietario actual puede transferir la empresa. Pídele que inicie la transferencia.",
  transfer_already_pending:
    "Esta empresa ya tiene una transferencia pendiente. Revísala antes de iniciar otra.",
  recipient_not_found:
    "No encontramos la cuenta de esa persona. Revisa su correo o pídele que se registre primero.",
  invalid_recipient: "Revisa el correo de la persona que recibirá la empresa.",
  direct_sale_price_required: "Captura y guarda el precio antes de solicitar la venta en línea.",
  forbidden_direct_sale_authorization_required:
    "Solo Administración puede activar la venta en línea o cambiar la comisión. Envía una solicitud de autorización.",
  direct_sale_request_pending:
    "Ya tienes una solicitud en revisión para esta experiencia. Espera la respuesta de Administración.",
  direct_sale_already_enabled:
    "Esta experiencia ya tiene la venta en línea autorizada. Revisa su configuración.",
  business_not_found:
    "No encontramos esta empresa. Vuelve al listado y selecciona la empresa que deseas administrar.",
  product_not_found:
    "No encontramos este producto. Vuelve al catálogo y selecciona uno disponible.",
  invalid_business: "Selecciona una empresa antes de continuar.",
  invalid_product: "Selecciona un producto del catálogo antes de continuar.",
  invalid_slug: "Revisa el enlace de la ficha. Usa solo letras, números y guiones, sin espacios.",
  required_attribute:
    "Falta completar una característica obligatoria. Revisa los campos del producto antes de guardar.",
  attributes_not_supported_for_product_type:
    "Este tipo de producto no utiliza estas características. Revisa el tipo seleccionado.",
  invitation_expired: "La invitación venció. Pide al propietario que te envíe una nueva.",
  invitation_revoked: "Esta invitación fue cancelada. Pide al propietario una nueva invitación.",
  invalid_invitation:
    "No encontramos una invitación válida. Pide al propietario que te envíe nuevamente el enlace.",
  empty_patch: "No hay cambios para guardar. Modifica el dato que deseas actualizar.",
};

/** Only approved explanations reach the Portal; never echo an unknown provider error. */
export function portalErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "";
  const plan = parsePlanLimitError(raw);
  if (plan) return plan.message;
  for (const [code, explanation] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) return explanation;
  }
  const stayExplanation = stayErrorMessage(raw);
  if (stayExplanation !== "No se pudo completar. Intenta de nuevo." && !raw.includes("forbidden"))
    return stayExplanation;
  // Server functions sometimes already return this exact approved explanation.
  const stayCodes = [
    "stay_confirmation_expired",
    "stay_already_decided",
    "stay_pending_host_confirmation",
    "stay_rooms_invalid",
    "stay_price_invalid",
    "stay_night_out_of_range",
    "stay_nights_empty",
    "stay_night_unavailable",
    "stay_dates_past",
    "stay_dates_invalid",
    "stay_guests_invalid",
    "stay_too_long",
    "online_sales_not_enabled_for_business",
  ];
  for (const code of stayCodes) {
    const explanation = stayErrorMessage(code);
    if (raw === explanation) return explanation;
  }
  for (const [code, explanation] of Object.entries(TABLE_BOOKING_ERRORS)) {
    if (code !== "forbidden" && (raw.includes(code) || raw === explanation)) return explanation;
  }
  if (
    /unauthorized|unauthenticated|jwt expired|session.*expired|not authenticated|missing.*token/i.test(
      raw,
    )
  )
    return "Tu sesión venció. Vuelve a iniciar sesión y después intenta guardar nuevamente.";
  if (/forbidden|permission denied|row.level security|not authorized/i.test(raw))
    return "Tu cuenta no tiene permiso para hacer este cambio en la empresa. Pide al propietario o a Administración que revise tu acceso.";
  if (/failed to fetch|network|offline|timeout|timed out/i.test(raw))
    return "No pudimos conectar. Revisa tu conexión a internet e intenta nuevamente.";
  if (/duplicate|already_exists|unique constraint/i.test(raw))
    return "Este dato ya está registrado. Revisa los registros existentes antes de agregarlo otra vez.";
  if (/list_\w+_failed|read_failed|get_\w+_failed/i.test(raw))
    return "No pudimos cargar esta información. Intenta abrir esta sección nuevamente.";
  if (/delete_\w+_failed/i.test(raw))
    return "No pudimos eliminar este dato. Revisa si sigue en la lista e intenta nuevamente.";
  return "No pudimos completar la acción. Revisa los datos e intenta nuevamente; si continúa, avisa a Administración qué estabas intentando hacer.";
}
