import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { validateUploadRights, type MediaRightsInput } from "@/lib/experience-builder/media-rights";

/** Shared declaration for upload panels; the caller retains its upload pipeline. */
export function MediaUploadRightsDialog({ files, source, onConfirm, onCancel }: {
  files: File[];
  source?: { author?: string; license?: string; sourceUrl?: string; provider?: string };
  onConfirm: (rights: MediaRightsInput) => void;
  onCancel: () => void;
}) {
  const knownGenerated = source?.provider === "Alux IA";
  const [rights, setRights] = useState<MediaRightsInput>({
    alt: files.length === 1 ? files[0]?.name.replace(/\.[^.]+$/, "") || "" : "Galería del destino",
    author: source?.author || "", credit: "", source: source?.sourceUrl || "",
    license: source?.license || "", nature: knownGenerated ? "ai_generated" : "documentary",
    rightsConfirmed: false,
  });
  const generated = rights.nature !== "documentary";
  const update = (patch: Partial<MediaRightsInput>) => setRights((r) => ({ ...r, ...patch }));
  const valid = validateUploadRights(rights) === null;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Derechos de las imágenes</DialogTitle>
          <DialogDescription>{files.length === 1 ? files[0]?.name : `${files.length} imágenes · misma autoría y permiso`}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) onConfirm(rights); }}>
          <div className="space-y-2"><Label htmlFor="upload-nature">Naturaleza de la imagen</Label>
            <Select disabled={knownGenerated} value={rights.nature} onValueChange={(value) => {
              if (value === "documentary" || value === "conceptual" || value === "ai_generated") update({ nature: value });
            }}><SelectTrigger id="upload-nature"><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="documentary">Fotografía real</SelectItem><SelectItem value="ai_generated">Generada por IA</SelectItem><SelectItem value="conceptual">Ilustración conceptual</SelectItem>
            </SelectContent></Select>
          </div>
          {!generated && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">¿Las fotografías son tuyas o tienes permiso?</legend>
              <RadioGroup value={rights.ownership ?? ""} onValueChange={(value) => {
                if (value === "own" || value === "permission") update({ ownership: value });
              }}>
                <div className="flex items-center gap-2"><RadioGroupItem id="rights-own" value="own" /><Label htmlFor="rights-own">Son fotografías propias</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem id="rights-permission" value="permission" /><Label htmlFor="rights-permission">Tengo permiso para publicarlas</Label></div>
              </RadioGroup>
            </fieldset>
          )}
          <div className="space-y-2"><Label htmlFor="upload-alt">Descripción de la imagen</Label><Input id="upload-alt" value={rights.alt} maxLength={1000} onChange={(e) => update({ alt: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="upload-author">Autor de las fotografías</Label><Input id="upload-author" value={rights.author ?? ""} maxLength={300} onChange={(e) => update({ author: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="upload-credit">Crédito público (opcional)</Label><Input id="upload-credit" value={rights.credit ?? ""} maxLength={300} onChange={(e) => update({ credit: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="upload-source">Procedencia o quién otorgó el permiso</Label><Input id="upload-source" value={rights.source ?? ""} maxLength={1000} onChange={(e) => update({ source: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="upload-license">Licencia o condiciones de uso</Label><Input id="upload-license" value={rights.license ?? ""} maxLength={1000} onChange={(e) => update({ license: e.target.value })} /></div>
          <div className="flex items-start gap-2"><Checkbox id="upload-confirm" checked={rights.rightsConfirmed} onCheckedChange={(checked) => update({ rightsConfirmed: checked === true })} /><Label htmlFor="upload-confirm" className="leading-relaxed">Confirmo que puedo publicar estas imágenes y que su autoría y permiso son correctos.</Label></div>
          {generated && <p className="text-sm text-muted-foreground">Imagen IA o conceptual: se guarda sin acreditación documental y no se publica como fotografía real.</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={!valid}>{generated ? "Guardar como borrador" : "Confirmar y subir"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}