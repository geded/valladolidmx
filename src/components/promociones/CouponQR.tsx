/**
 * CouponQR — renderiza un QR PNG data-url desde `qr_token`.
 * Cliente-side (qrcode). Se degrada a mostrar sólo el código si falla.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function CouponQR({
  value,
  size = 220,
}: {
  value: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#111111", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancel) setSrc(url);
      })
      .catch(() => {
        if (!cancel) setSrc(null);
      });
    return () => {
      cancel = true;
    };
  }, [value, size]);
  return src ? (
    <img
      src={src}
      alt="QR del cupón"
      width={size}
      height={size}
      className="rounded-lg border border-border bg-white"
    />
  ) : (
    <div
      className="grid place-items-center rounded-lg border border-border bg-muted text-xs text-muted-foreground"
      style={{ width: size, height: size }}
    >
      Generando QR…
    </div>
  );
}