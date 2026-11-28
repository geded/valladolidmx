export interface LocationEditorValues {
  label: string;
  address: string;
  references: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  primary: boolean;
}

/** Editable fields only: the existing server update retains territorial linkage and ownership. */
export function locationEditorPatch(values: LocationEditorValues) {
  return {
    label: values.label.trim() || null,
    address_line1: values.address.trim() || null,
    address_line2: values.references.trim() || null,
    postal_code: values.postalCode.trim() || null,
    latitude: values.latitude.trim() ? Number(values.latitude) : null,
    longitude: values.longitude.trim() ? Number(values.longitude) : null,
    is_primary: values.primary,
  };
}
