/**
 * QuickCreateAttributeOptionDialog — Alta rápida de una opción del catálogo
 * de características (p. ej. un nuevo tipo de cocina) sin salir de la ficha
 * que se está editando. Guarda en `tourism_attribute_options` y devuelve la
 * opción creada para dejarla seleccionada.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAttributeOptionQuick,
  type AttributeOptionQuickResult,
} from "@/lib/portal/business-attributes.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definitionId: string;
  attributeLabel: string;
  onCreated: (option: AttributeOptionQuickResult) => void;
}

export function QuickCreateAttributeOptionDialog({
  open,
  onOpenChange,
  definitionId,
  attributeLabel,
  onCreated,
}: Props) {
  const createFn = useServerFn(createAttributeOptionQuick);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createFn({ data: { definitionId, label } }),
    onSuccess: (option) => {
      setLabel("");
      setError(null);
      onCreated(option);
      onOpenChange(false);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo crear la opción."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva opción en {attributeLabel}</DialogTitle>
          <DialogDescription>
            Quedará disponible en el catálogo para todas las fichas de esta categoría.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="quick-option-label">Nombre *</Label>
            <Input
              id="quick-option-label"
              autoFocus
              value={label}
              placeholder="Yucateca contemporánea"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending || label.trim().length < 2}>
              {create.isPending ? "Guardando…" : "Guardar y seleccionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
