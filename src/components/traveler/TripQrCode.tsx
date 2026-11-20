/**
 * TripQrCode — código QR del folio del viaje.
 *
 * Se genera en el propio dispositivo (sin red) a partir del folio, para que
 * el viajero pueda identificarse en cada experiencia aunque no tenga señal.
 * No contiene datos personales: sólo la referencia del folio.
 */
import { useEffect, useState } from "react";
import { tripQrPayload } from "@/lib/traveler/offline-documents";

interface Props {
  folio: string;
  size?: number;
  className?: string;
}

export function TripQrCode({ folio, size = 148, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(tripQrPayload(folio), {
          width: size * 2,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#1f1a17", light: "#ffffff" },
        });
        if (alive) setSrc(url);
      } catch {
        if (alive) setSrc(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [folio, size]);

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden
        data-testid="trip-qr-placeholder"
      />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`Código QR del folio ${folio}`}
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
