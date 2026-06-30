/**
 * Experience Builder · Variable Picker (Etapa 15.10.4b · Fase 2)
 */

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listVariables } from "@/lib/experience-builder/dynamic-variables";

export function VariablePicker({ onPick }: { onPick: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const catalog = listVariables();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Insertar variable dinámica"
          className="rounded-md border border-border bg-muted px-1.5 py-1 text-[10px] font-mono hover:bg-accent"
        >
          {"{ }"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[320px] w-72 overflow-y-auto p-2 text-xs">
        <p className="px-1 pb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Variables Dinámicas
        </p>
        <div className="space-y-2">
          {Object.entries(catalog).map(([scope, fields]) => (
            <div key={scope}>
              <p className="px-1 text-[10px] font-semibold text-muted-foreground">{scope}</p>
              <ul className="grid gap-0.5">
                {fields.map((f) => {
                  const token = `\${${scope}.${f.field}}`;
                  return (
                    <li key={f.field}>
                      <button
                        type="button"
                        onClick={() => { onPick(token); setOpen(false); }}
                        className="w-full rounded px-1 py-1 text-left hover:bg-accent"
                      >
                        <span className="font-mono text-[10px]">{token}</span>
                        <span className="block text-[9px] text-muted-foreground">{f.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}