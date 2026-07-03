/**
 * portal/portal-product-media.functions.ts — Sub-ola 2.4a · Fase A.
 *
 * Media de productos accesible desde el Portal Empresarial. Reutiliza las
 * server fns editoriales de `cms/products-media.functions` (que ya validan
 * `has_business_access('editor')` para dueños) exponiéndolas bajo el
 * namespace `portal/*` para mantener contratos limpios y evitar que la UI
 * del Portal dependa del namespace Founder.
 *
 * Cero duplicación de lógica: sólo re-exportamos los server fns existentes
 * con nombres orientados al Portal. Si en el futuro Portal necesita
 * comportamiento distinto (p.ej. cuotas por plan) se especializa aquí.
 */
export {
  signProductImageUpload as signPortalProductImageUpload,
  registerProductMedia as registerPortalProductMedia,
  listProductMedia as listPortalProductMedia,
  reorderProductGallery as reorderPortalProductGallery,
  removeProductMedia as removePortalProductMedia,
} from "@/lib/cms/products-media.functions";