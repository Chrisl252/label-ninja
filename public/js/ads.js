import { ADS } from "./ads-config.js";

const KEY_RX = /^[a-f0-9]{32}$/i;

function viewportWidth() {
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) || 0;
}

function isHidden(el) {
  return Boolean(el.closest(".hidden"));
}

function unit(kind) {
  const list = Array.isArray(ADS[kind]) ? ADS[kind] : null;
  if (!list || !list.length) return null;
  const w = viewportWidth();
  let best = null;
  for (const v of list) {
    const min = Number(v.minWidth || 0);
    if (w >= min && (!best || min >= Number(best.minWidth || 0))) best = v;
  }
  return best;
}

function fillIframe(well, u) {
  const key = String(u.key || "");
  if (!KEY_RX.test(key) || !u.width || !u.height) return false;
  const host = String(ADS.invokeHost || "").replace(/\/+$/, "");
  if (!/^https:\/\//.test(host)) return false;
  const invokeSrc = host + "/" + key + "/invoke.js";
  const atOptions =
    "atOptions = {'key':'" + key + "','format':'iframe','height':" +
    Number(u.height) + ",'width':" + Number(u.width) + ",'params':{}};";
  const doc =
    "<!doctype html><html><head><meta charset='utf-8'>" +
    "<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>" +
    "</head><body>" +
    "<script type='text/javascript'>" + atOptions + "<\/script>" +
    "<script type='text/javascript' src='" + invokeSrc + "'><\/script>" +
    "</body></html>";
  well.innerHTML = "";
  const f = document.createElement("iframe");
  f.title = "Advertisement";
  f.scrolling = "no";
  f.loading = "lazy";
  f.setAttribute("sandbox", ADS.sandbox);
  f.width = String(u.width);
  f.height = String(u.height);
  f.style.cssText = "display:block;border:0;margin:0 auto;max-width:100%;width:" +
    Number(u.width) + "px;height:" + Number(u.height) + "px;";
  f.srcdoc = doc;
  well.appendChild(f);
  return true;
}

export function paintWells(root) {
  const host = root || document;
  host.querySelectorAll("[data-ad-slot]").forEach((el) => {
    if (isHidden(el)) return;
    if (el.getAttribute("data-ad-state") === "mounted") return;
    if (!ADS.enabled) {
      el.setAttribute("data-ad-state", "empty");
      return;
    }
    const u = unit(el.getAttribute("data-ad-slot"));
    const ok = u && fillIframe(el, u);
    el.setAttribute("data-ad-state", ok ? "mounted" : "empty");
  });
}

window.labelNinjaAds = { paintWells };

paintWells();
window.addEventListener("load", () => paintWells());
