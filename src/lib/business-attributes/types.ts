export type TourismAttributeInputType = "single" | "multi";
export type TourismAttributeValue = string | string[];
export type TourismFilterAttributes = Record<string, TourismAttributeValue>;

export interface TourismAttributeOption {
  value: string;
  label: string;
  sort_order: number;
}

export interface TourismAttributeDefinition {
  key: string;
  label: string;
  helpText: string | null;
  inputType: TourismAttributeInputType;
  filterGroup: "zone" | "primary" | "secondary" | "profile" | "policy" | "commercial";
  filterable: boolean;
  required: boolean;
  sortOrder: number;
  options: TourismAttributeOption[];
}

export interface BusinessAttributeEditorDTO {
  businessId: string;
  family: string | null;
  editable: boolean;
  values: TourismFilterAttributes;
  definitions: TourismAttributeDefinition[];
}

export function normalizeFilterAttributes(value: unknown): TourismFilterAttributes {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: TourismFilterAttributes = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
    if (Array.isArray(raw)) {
      const values = Array.from(
        new Set(
          raw
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );
      if (values.length) out[key] = values;
    }
  }
  return out;
}

export function attributeValues(value: TourismAttributeValue | undefined): string[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function humanizeAttributeValue(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
