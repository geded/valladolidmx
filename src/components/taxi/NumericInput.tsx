import { useEffect, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

/**
 * Campo numérico que conserva lo que se escribe (sin «0» pegado adelante):
 * mientras se edita guarda el texto y sólo informa números válidos.
 */
export function NumericInput({ value, onValue, ...rest }: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & { value: number; onValue: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (Number(t.replace(",", ".")) === value && t !== "" ? t : String(value)));
  }, [value]);
  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.,]/g, "");
        setText(raw);
        const n = Number(raw.replace(",", "."));
        if (raw !== "" && Number.isFinite(n)) onValue(n);
      }}
      onBlur={() => { if (text === "") { setText("0"); onValue(0); } }}
    />
  );
}
