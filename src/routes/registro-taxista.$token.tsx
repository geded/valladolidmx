import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CarFront, CheckCircle2, Languages, ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildPublicHead } from "@/lib/discovery/seo";
import { getTaxiDriverInvitation, submitTaxiDriverInvitation } from "@/lib/taxi/taxi.functions";
import { taxiErrorMessage } from "@/lib/taxi/rules";
import { toast } from "@/lib/toast";

function invitationQuery(token: string) {
  return queryOptions({
    queryKey: ["taxi", "driver-invitation", token],
    queryFn: () => getTaxiDriverInvitation({ data: { token } }),
    staleTime: 60_000,
  });
}

export const Route = createFileRoute("/registro-taxista/$token")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(invitationQuery(params.token)),
  head: () =>
    buildPublicHead({
      title: "Registro de taxista turístico · Taxi Alux",
      description: "Formulario privado para solicitar tu acceso como conductor de Taxi Alux.",
      path: "/registro-taxista",
      noindex: true,
    }),
  component: DriverApplicationPage,
});

function DriverApplicationPage() {
  const { token } = Route.useParams();
  const { data: invitation } = useSuspenseQuery(invitationQuery(token));
  const submitFn = useServerFn(submitTaxiDriverInvitation);
  const [fullName, setFullName] = useState(invitation?.invited_name ?? "");
  const [email, setEmail] = useState(invitation?.invited_email ?? "");
  const [phone, setPhone] = useState("");
  const [english, setEnglish] = useState(false);
  const [otherLanguages, setOtherLanguages] = useState("");
  const [unionName, setUnionName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [insuranceReference, setInsuranceReference] = useState("");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleClass, setVehicleClass] = useState<"compacto" | "camioneta" | "van">("compacto");
  const [plates, setPlates] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const languages = [
        "es",
        ...(english ? ["en"] : []),
        ...otherLanguages.split(",").map((item) => item.trim()).filter(Boolean),
      ];
      await submitFn({
        data: {
          token,
          fullName,
          email,
          phone,
          english,
          languages,
          unionName,
          licenseNumber,
          insuranceReference,
          vehicleDescription,
          vehicleYear: vehicleYear ? Number(vehicleYear) : null,
          vehicleColor: vehicleColor || undefined,
          vehicleNumber: vehicleNumber || undefined,
          vehicleClass,
          plates,
          applicantNotes: notes || undefined,
        },
      });
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(false);
    }
  }

  if (!invitation) {
    return (
      <PublicShell title="Invitación no encontrada" eyebrow="Taxi Alux">
        <p className="max-w-xl text-sm text-muted-foreground">
          Revisa que el enlace esté completo o pide uno nuevo al administrador de Valladolid.mx.
        </p>
      </PublicShell>
    );
  }

  if (sent || !invitation.can_submit) {
    return (
      <PublicShell title="Solicitud de taxista" eyebrow="Taxi Alux" className="pb-16">
        <section className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-soft">
          <CheckCircle2 className="size-9 text-success" />
          <h2 className="mt-4 text-xl font-semibold">
            {sent ? "Recibimos tus datos" : "Esta invitación ya fue utilizada"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            El administrador revisará tu información. Si cumple los requisitos, recibirás un correo
            para crear tu contraseña y entrar al panel de taxista. Después instala la aplicación en
            tu celular para activar avisos y ver tus rutas.
          </p>
        </section>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      crumbs={[{ label: "Inicio", to: "/" }, { label: "Registro de taxista" }]}
      compactCrumbsOnMobile
      className="pb-16 pt-5 sm:pt-8"
    >
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Taxi Alux</p>
          <h1 className="mt-2 text-3xl font-semibold">Solicitud de taxista turístico</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Llena tus datos y los de tu vehículo. La cuenta se crea después de que el administrador
            revise y apruebe tu solicitud.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Languages className="size-4 text-primary" /> Inglés requerido para aprobación
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <ShieldCheck className="size-4 text-primary" /> Revisión administrativa
            </span>
          </div>
        </header>

        <form onSubmit={submit} className="mt-7 space-y-5">
          <FormSection title="Tus datos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="driver-name" label="Nombre completo" required>
                <Input id="driver-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
              </Field>
              <Field id="driver-phone" label="Celular / WhatsApp" required>
                <Input id="driver-phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </Field>
              <Field id="driver-email" label="Correo para tu cuenta" required>
                <Input id="driver-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
              <Field id="driver-union" label="Sindicato o sitio de taxis" required>
                <Input id="driver-union" required value={unionName} onChange={(e) => setUnionName(e.target.value)} placeholder="Nombre de la organización" />
              </Field>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
              <span>
                <span className="font-medium">Puedo atender viajeros en inglés</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Es un requisito del servicio turístico de Taxi Alux.</span>
              </span>
            </label>
            <Field id="driver-languages" label="Otros idiomas (separados por coma)">
              <Input id="driver-languages" value={otherLanguages} onChange={(e) => setOtherLanguages(e.target.value)} placeholder="Francés, italiano…" />
            </Field>
          </FormSection>

          <FormSection title="Datos que te acreditan">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="driver-license" label="Número de licencia de conducir" required>
                <Input id="driver-license" required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
              </Field>
              <Field id="driver-insurance" label="Póliza o referencia del seguro" required>
                <Input id="driver-insurance" required value={insuranceReference} onChange={(e) => setInsuranceReference(e.target.value)} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Tu vehículo">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="driver-class" label="Tipo de vehículo" required>
                <select id="driver-class" value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value as typeof vehicleClass)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="compacto">Compacto · hasta 4 pasajeros</option>
                  <option value="camioneta">Camioneta · hasta 6 pasajeros</option>
                  <option value="van">Van · 7 pasajeros o más</option>
                </select>
              </Field>
              <Field id="driver-vehicle" label="Marca y modelo" required>
                <Input id="driver-vehicle" required value={vehicleDescription} onChange={(e) => setVehicleDescription(e.target.value)} placeholder="Nissan Versa" />
              </Field>
              <Field id="driver-year" label="Año">
                <Input id="driver-year" type="number" min={1990} max={2035} value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} />
              </Field>
              <Field id="driver-color" label="Color">
                <Input id="driver-color" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
              </Field>
              <Field id="driver-number" label="Número económico del taxi">
                <Input id="driver-number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
              </Field>
              <Field id="driver-plates" label="Placas" required>
                <Input id="driver-plates" required value={plates} onChange={(e) => setPlates(e.target.value)} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Información adicional">
            <label htmlFor="driver-notes" className="mb-1 block text-xs font-medium">Experiencia o aclaraciones (opcional)</label>
            <Textarea id="driver-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Experiencia atendiendo turistas, horarios o alguna aclaración" />
          </FormSection>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <CarFront className="size-6 text-primary" />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Al enviar, autorizas a Valladolid.mx a revisar estos datos para evaluar tu acceso. No
              quedas disponible ni recibes viajes hasta que el administrador te apruebe.
            </p>
            <Button type="submit" className="mt-4 w-full" disabled={busy}>
              {busy ? "Enviando solicitud…" : "Enviar para revisión"}
            </Button>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
