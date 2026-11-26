/*!
 * Alux · ventana para páginas de aliados (Valladolid.mx · CRM Fase 4).
 * Uso: <script src="https://www.quehacerenvalladolid.com/alux-embed.js" async></script>
 * Solo aparece si el sitio está autorizado en «Dónde atiende Alux».
 * Opcional: data-destino="valladolid" data-empresa="slug-de-la-empresa".
 * La consola manda; estos datos solo completan lo que ella dejó vacío.
 */
(function () {
  if (window.__vmxAluxEmbed) return;
  window.__vmxAluxEmbed = true;
  var script =
    document.currentScript || document.querySelector('script[src*="alux-embed.js"]');
  if (!script) return;
  var origin = new URL(script.src, location.href).origin;
  var host = location.hostname;
  function attr(name) {
    var v = (script.getAttribute(name) || "").trim().toLowerCase();
    return /^[a-z0-9][a-z0-9-]{0,119}$/.test(v) ? v : "";
  }
  var destino = attr("data-destino");
  var empresa = attr("data-empresa");

  function start(token) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Abrir Alux, concierge del Oriente Maya");
    btn.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:8px;" +
      "min-height:48px;padding:8px 16px 8px 8px;border-radius:999px;border:1px solid rgba(0,0,0,.12);" +
      "background:#fffdf8;color:#2b2119;font:600 14px/1.2 system-ui,sans-serif;cursor:pointer;" +
      "box-shadow:0 8px 24px rgba(43,33,25,.18)";
    var img = document.createElement("img");
    img.src = origin + "/brand/alux/png/alux-ia-avatar-64.png";
    img.alt = "";
    img.width = 32;
    img.height = 32;
    img.style.cssText = "width:32px;height:32px;border-radius:999px";
    btn.appendChild(img);
    btn.appendChild(document.createTextNode("Preg\u00fantale a Alux"));

    var panel = document.createElement("div");
    panel.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:2147483001;display:none;" +
      "width:min(400px,calc(100vw - 24px));height:min(640px,calc(100vh - 32px));" +
      "border-radius:16px;overflow:hidden;background:#fffdf8;box-shadow:0 16px 48px rgba(43,33,25,.28);" +
      "flex-direction:column";
    var bar = document.createElement("div");
    bar.style.cssText =
      "display:flex;align-items:center;justify-content:flex-end;height:40px;flex:none;padding:0 6px;" +
      "border-bottom:1px solid rgba(43,33,25,.1)";
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar Alux");
    close.textContent = "\u00d7";
    close.style.cssText =
      "width:32px;height:32px;border-radius:999px;" +
      "border:0;background:rgba(43,33,25,.08);color:#2b2119;font:400 22px/1 system-ui,sans-serif;cursor:pointer";
    var frame = null;

    btn.onclick = function () {
      if (!frame) {
        frame = document.createElement("iframe");
        frame.title = "Alux, concierge del Oriente Maya";
        frame.src = origin + "/insertar/alux?token=" + encodeURIComponent(token);
        frame.referrerPolicy = "no-referrer";
        frame.style.cssText = "width:100%;flex:1;border:0";
        panel.appendChild(frame);
      }
      panel.style.display = "flex";
      btn.style.display = "none";
    };
    close.onclick = function () {
      panel.style.display = "none";
      btn.style.display = "flex";
    };
    bar.appendChild(close);
    panel.appendChild(bar);
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }

  fetch(
    origin +
      "/api/public/alux/embed-status?host=" +
      encodeURIComponent(host) +
      (destino ? "&destino=" + encodeURIComponent(destino) : "") +
      (empresa ? "&empresa=" + encodeURIComponent(empresa) : ""),
  )
    .then(function (r) {
      return r.ok ? r.json() : { enabled: false };
    })
    .then(function (d) {
      if (!d || d.enabled !== true || typeof d.token !== "string" || !d.token) return;
      function open() {
        start(d.token);
      }
      if (document.body) open();
      else document.addEventListener("DOMContentLoaded", open);
    })
    .catch(function () {});
})();
