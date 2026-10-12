/**
 * QuickCreateZoneDialog — Alta rápida de una zona del destino sin salir de
 * la ficha que se está editando (empresas, lugares). Guarda en el catálogo
 * oficial de zonas y devuelve la zona creada para dejarla seleccionada.
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createZoneQuick, type BusinessZoneOption } from "@/lib/cms/business-locations.functions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationId: string;
  destinationName: string | null;
  onCreated: (zone: BusinessZoneOption) => void;
}

export function QuickCreateZoneDialog({
  open,
  onOpenChange,
  destinationId,
  destinationName,
  onCreated,
}: Props) {
  const createFn = useServerFn(createZoneQuick);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createFn({ data: { destinationId, name, description } }),
    onSuccess: (zone) => {
      setName("");
      setDescription("");
      setError(null);
      onCreated(zone);
      onOpenChange(false);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo crear la zona."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva zona{destinationName ? ` en ${destinationName}` : ""}</DialogTitle>
          <DialogDescription>
            Barrio o sub-área del destino. Quedará disponible para todas las fichas.
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
            <Label htmlFor="quick-zone-name">Nombre *</Label>
            <Input
              id="quick-zone-name"
              autoFocus
              value={name}
              placeholder="Barrio de la Candelaria"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-zone-desc">Descripción (opcional)</Label>
            <Textarea
              id="quick-zone-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            <Button type="submit" disabled={create.isPending || name.trim().length < 2}>
              {create.isPending ? "Guardando…" : "Guardar y seleccionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
