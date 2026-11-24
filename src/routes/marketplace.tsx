/**
 * /marketplace — 301 hacia el hub territorial `/oriente-maya`.
 *
 * US-E3.3 · Retiro de código legacy. La carpeta `src/routes/marketplace/`
 * fue eliminada; conservamos únicamente dos rutas planas para preservar
 * backlinks históricos vía redirect permanente.
 *
 * Esta ruta es padre de `/marketplace/$`: sólo redirige cuando la dirección
 * es exactamente `/marketplace`; en otro caso deja pasar al splat, que
 * envía cada empresa a su ficha territorial.
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/marketplace")({
  beforeLoad: ({ location }) => {
    if (location.pathname.replace(/\/+$/, "") === "/marketplace") {
      throw redirect({ href: "/oriente-maya", code: 301 });
    }
  },
  component: () => <Outlet />,
});
