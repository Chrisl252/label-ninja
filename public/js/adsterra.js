/* Adsterra units — auto-placed on every page (owner order 2026-10-23; Popunder added 2026-10-25).
 *
 * One file, keyed by hostname, so the same loader ships unchanged on every
 * Adsterra site (owner ruling 2026-10-23: all domains except thewowdb, wowgoldfarms,
 * mike-devaney, raylenethomas, chris-vibes, vegaswaterheaterhelp, keepitpassive).
 * Formats: Banner + Native Banner on every site, plus Popunder where cfg.pop is set
 * (owner ruling 2026-10-25 lifted the 2026-09-02 ban; Social Bar stays OFF).
 *
 * Display placement, no page markup needed:
 *   1. top    — leaderboard under the site header (728x90 / 468x60 / 320x50 by width)
 *   2. middle — 300x250 between top-level blocks of <main>, never inside a tool/form
 *   3. bottom — Native Banner just above the footer
 *   4. rail   — 160x600 sticky in the right gutter, only on screens >= 1500px
 *   5. pop    — Popunder script on the page itself, at most once per visitor per 24h
 *               (local guard here + frequency cap in the Adsterra placement)
 * Each display unit renders inside a sandboxed iframe with a fixed reserved size
 * (zero layout shift). Default = srcdoc iframe. Sites with a strict page CSP set
 * cfg.frame = "/adframe.html": the unit then loads that same-origin page (served with
 * its own permissive CSP) with the unit in the query string, so the page CSP never
 * has to allow third-party script. Class names avoid the "ad-" prefix (ad blockers hide it).
 */
(function () {
  "use strict";
  var SITES = {
    "idlemmotools.com": {
      site: 6145812,
      pop: "https://abscloud.org/1/df90250e3f8d5be18aa4b019fdef6e0a",
      native: "c9779b31b030e34fd9c2e0a827140c71",
      b728: "8e588ebded6300cee2c5ef76c5289323",
      b468: "336d3d1f522c8843f98f540f67b757c1",
      b320: "7b86e27c868a5370ea39d51afdf5869b",
      b300: "08e3dee715b6f2e44881659c55917e3f",
      b160: "3c3a0d6eff4fb71706e0579680fa7431"
    },
    "citybuildertools.com": {
      site: 6145811,
      pop: "https://abscloud.org/1/a195edfa2f9e3c878ab65a2647c06f3c",
      native: "9465b9c93b6b54268134e9435c7bd63f",
      b728: "5ed59e3b7cd70c6f7c1a5b3f80d2055d",
      b468: "2daa6302e5e17ceba484ce802be0b90d",
      b320: "b7f079e9069adb78ebf063555c0d5bb4",
      b300: "06438ebf64f366c0485856e18f50fd7d",
      b160: "8874f1691c59ba8fd723e1938f7aba52"
    },
    "label-ninja.com": {
      site: 6017188,
      pop: "https://abscloud.org/1/6e9751f7d5ed6a2e2ad4ebb76283a398",
      native: "7f03f3acbabb2b437db11567b1c807df",
      b728: "87ceb287cd55c02c4725e2c482ffd379",
      b468: "3b32f70f65ba28e0f94f7ae5e0336c73",
      b320: "e21c4427a4e2ee9c5930fd47337c38c4",
      b300: "b47773d97fcbb57140d6193f0271ce25",
      b160: "e5e76331b92e2b8babea592c775c1a89"
    },
    "discount-pantry.com": {
      site: 6145857,
      pop: "https://abscloud.org/1/8912591404d294330b1711e5b4732362",
      frame: "/assets/adframe",
      native: "df282c8b5bdf58e63a2fb3f3157f8d82",
      b728: "93dc435b7e3b39f79f5f5959080bc192",
      b468: "60b368b8d813b633c803b569ec8b6d43",
      b320: "4c18de72a523ec13cc96945f77c5fd67",
      b300: "20f1f2c9c2fed4d8c06e970b6a5818b9",
      b160: "aaad923e49a6371734a578aa73537e58"
    },
    "wowauctionhouse.com": {
      site: 6145848,
      pop: "https://abscloud.org/1/f668cd563ac41fc17cf37055a37f702e",
      native: "4d8f86c480d4d8af17a3af8e47804117",
      b728: "252a8901f0d189525352bc9e6fb928ce",
      b468: "5af6f9b1a863b1526e32c6311c982561",
      b320: "4ac6ab03b58e3373a478022f5462d77c",
      b300: "af7ea92c03c94e79e9a3415fb9f9c89f",
      b160: "4f0e0713e8aeb1c1be1c38a2c682b6a4"
    },
    "goldfarmvibes.com": {
      site: 6145851,
      pop: "https://abscloud.org/1/dae95d5d3d7f59ee0a6a2e2d4cbf70ac",
      native: "44b9d7102557fb6d45adb508e962e2cb",
      b728: "0f09ea5190dd72f2e64efb41dbbac104",
      b468: "94cf7cfaa1cac24c16389e3bca3d13a1",
      b320: "9696c2fc93fd073f04508e126a112d92",
      b300: "cece2a02effa991f47bdd22e52ec73d7",
      b160: "c2509283fbefae46082c3439f5686d71"
    },
    "emberdeck.app": {
      site: 6145852,
      pop: "https://abscloud.org/1/5b1231178dabe2a1a608e0563f2e881f",
      frame: "/adframe",
      native: "ab97dcc8fbf188ca9baadb26dc9ed9b4",
      b728: "2ebdead1b9e611c23528f207351c5d95",
      b468: "9cb7f84cdf5af71847c124a262d72abd",
      b320: "76e845de489d729f35027c27f76a4d45",
      b300: "f7f772c71cb03b18bc7ee59570378e32",
      b160: "1edc2b265de40ce2170a82ef779f72de"
    },
    "flagcoachplays.com": {
      site: 6145853,
      pop: "https://abscloud.org/1/f95c5e6e12b8ed675b1e726c03ea909c",
      native: "531b122b64f6bf444630d390b08ea443",
      b728: "fc38c8192b1e518ae6798095d9acfd01",
      b468: "f549e88037354af83a9ea831becf8a6b",
      b320: "b77318aca876430af83a7cf71c3ed930",
      b300: "f9bb12fdd4409fe09fb1a6b28d74b6b1",
      b160: "c7d22ebe0112714151abc94055c6c982"
    },
    "seniorsassassins.com": {
      site: 6145854,
      pop: "https://abscloud.org/1/23ab5bf61f823543f5ce212ed46a72fa",
      native: "7963aa40a533d6810f7d9a78a83b43ef",
      b728: "623ab3a11b77615c00c78f2860b23040",
      b468: "ebaba9a602f89475fdf6c5e629b74a65",
      b320: "283c694f6ba4ac73d6a7f8f05bfc6e5d",
      b300: "4f9ddaae788e4f30cfb06921946b9644",
      b160: "9a13eb0ba507849c0e64d21dadff2c4d"
    },
    "chainmailjack.com": {
      site: 6145855,
      pop: "https://abscloud.org/1/2337decdfcaca4a8e54f106435238e96",
      native: "9c79a8ba50563c5678c97b36cb6d8ed9",
      b728: "aaaef5b62fd42e6a8740b224301128a1",
      b468: "48506e7298c47f2fa1dadd8d6e0d195f",
      b320: "6719669ad5ef0e8da303b9c512910e1d",
      b300: "dd5f04896ed4b38f89e011b25d5567a7",
      b160: "2c8e96c7c6e9bb755a5686060a6e5084"
    },
    "just-bargains.com": {
      site: 6145856,
      pop: "https://abscloud.org/1/bf839c959b4fa96d8a267843366646b1",
      frame: "/assets/adframe",
      native: "be3980b02e5d1a32ec2c8e2082f84128",
      b728: "571f8ff6a45f4b184c6a0f299a9c45e5",
      b468: "40d94b3fbda432877e45eb1edaf152da",
      b320: "c21a48fd541402d674e59c151cf78052",
      b300: "9081cdc4f921645875beb435d0dcd26f",
      b160: "9f9a8e4940e21c05077346d6d0277419"
    },
    "playinphone.com": {
      site: 6015200,
      pop: "https://abscloud.org/1/36bbd172b304573479fb8a16de6ac7ee",
      native: "78c8d60be7c4e464862866bafcdef955",
      b728: "059e868fe4264484bda91a8f632f98c0",
      b468: "26014c9c827df1be5c1b435ea045710c",
      b320: "e1c8261fb57e7186a9591f3725ff3e8a",
      b300: "d0900bc317b5ee01cccdd95e0b8e23e7",
      b160: "54d5889970da291f1d919cad59267893"
    },
    "label-ninja.com": {
      site: 6017188,
      pop: "https://abscloud.org/1/6e9751f7d5ed6a2e2ad4ebb76283a398",
      native: "7f03f3acbabb2b437db11567b1c807df",
      b728: "87ceb287cd55c02c4725e2c482ffd379",
      b468: "3b32f70f65ba28e0f94f7ae5e0336c73",
      b320: "e21c4427a4e2ee9c5930fd47337c38c4",
      b300: "b47773d97fcbb57140d6193f0271ce25",
      b160: "e5e76331b92e2b8babea592c775c1a89"
    },
    "fbaessentials.com": {
      site: 5975180,
      pop: "https://abscloud.org/1/5b0b6f1b32ed413e5869461827de47fd",
      native: "9b77b16f5a670eed1d735f7574af014f",
      b728: "ef026a2863374909737a4e9ac0ae7726",
      b468: "792ce82a8c2e0bc6ad36ce3f96a1bccf",
      b320: "9056f0052281b47f0671de7f9f9c6613",
      b300: "f5c065cc50137cbaaf7346bae478fac6",
      b160: "60cf874205340e3f72cb0136445b3217"
    },
    "diablomarketplace.com": {
      site: 6077398,
      pop: "https://abscloud.org/1/3d8ba0166d4511e1e249d306029908e7",
      native: "0d7eac71d13ed1678e26bf2fbd1f803b",
      b728: "68b383b174a33308938b66bbc467899f",
      b320: "e2301b71819d5faf0102e80ce06678a3",
      b300: "a2ea16dd25f8ad258908c37f1b8c36ee"
    }
  };
  var HOST = "https://bauval.org";
  var SANDBOX = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";

  var host = location.hostname.replace(/^www\./, "");
  var cfg = SITES[host];
  if (!cfg || window.__spUnits) return;
  window.__spUnits = true;

  function vw() {
    return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  }

  function frame(w, h, body, unit) {
    var f = document.createElement("iframe");
    f.title = "Advertisement";
    f.scrolling = "no";
    f.setAttribute("sandbox", SANDBOX);
    f.style.cssText = "display:block;border:0;margin:0 auto;max-width:100%;" +
      (w ? "width:" + w + "px;" : "width:100%;") + "height:" + h + "px;";
    if (cfg.frame) {
      // Strict-CSP site: same-origin frame page builds the unit from the query string.
      f.src = cfg.frame + "?u=" + encodeURIComponent(unit.key) + "&w=" + w + "&h=" + h +
        (unit.native ? "&n=1" : "");
    } else {
      f.srcdoc = "<!doctype html><html><head><meta charset='utf-8'><style>" +
        "html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>" +
        body + "</body></html>";
    }
    return f;
  }

  function banner(key, w, h) {
    return frame(w, h, "" +
      "<script>atOptions={'key':'" + key + "','format':'iframe','height':" + h +
      ",'width':" + w + ",'params':{}};<\/script>" +
      "<script src='" + HOST + "/22/" + key + "'><\/script>", { key: key });
  }

  function nativeUnit(key) {
    return frame(0, 260,
      "<script async data-cfasync='false' src='" + HOST + "/21/" + key + "'><\/script>" +
      "<div id='container-" + key + "'></div>", { key: key, native: true });
  }

  function box(name, child, minH) {
    var d = document.createElement("div");
    d.className = "sp-unit sp-unit-" + name;
    d.setAttribute("aria-label", "Advertisement");
    d.style.cssText = "clear:both;text-align:center;margin:16px auto;max-width:100%;overflow:hidden;min-height:" + minH + "px;";
    d.appendChild(child);
    return d;
  }

  function leaderboard() {
    var w = vw();
    if (w >= 760) return box("top", banner(cfg.b728, 728, 90), 90);
    if (w >= 480 && cfg.b468) return box("top", banner(cfg.b468, 468, 60), 60);
    return box("top", banner(cfg.b320, 320, 50), 50);
  }

  function mainEl() {
    return document.querySelector("main") || document.querySelector("article") ||
      document.querySelector("[role=main]");
  }

  // Top-level blocks of <main> that are safe neighbours: not a form/tool.
  function isTool(el) {
    return el.matches("form,table,canvas,iframe,[data-tool],.tool,.calc,.planner") ||
      !!el.querySelector("form,input,select,textarea,canvas");
  }

  function place() {
    var header = document.querySelector("body > header, header.site-header, .site-header, body > nav, header");
    var footer = document.querySelector("body > footer, footer.site-footer, .site-footer, footer");
    var main = mainEl();

    // 1. top leaderboard
    var top = leaderboard();
    if (header && header.parentNode) header.parentNode.insertBefore(top, header.nextSibling);
    else if (main) main.insertBefore(top, main.firstChild);
    else document.body.insertBefore(top, document.body.firstChild);

    // 2. mid-content rectangle
    var mid = box("mid", banner(cfg.b300, 300, 250), 250);
    var placed = false;
    if (main) {
      var kids = Array.prototype.filter.call(main.children, function (c) {
        return !c.classList.contains("sp-unit") && c.offsetHeight > 0;
      });
      for (var i = Math.floor(kids.length / 2); i < kids.length - 1 && !placed; i++) {
        if (!isTool(kids[i]) && !isTool(kids[i + 1])) {
          main.insertBefore(mid, kids[i + 1]);
          placed = true;
        }
      }
      if (!placed) { main.appendChild(mid); placed = true; }
    }

    // 3. native banner above the footer
    var nat = box("native", nativeUnit(cfg.native), 260);
    if (footer && footer.parentNode) footer.parentNode.insertBefore(nat, footer);
    else document.body.appendChild(nat);
    if (!placed) document.body.insertBefore(mid, nat);

    // 4. wide-screen sticky rail
    if (vw() >= 1500 && cfg.b160) {
      var rail = box("rail", banner(cfg.b160, 160, 600), 600);
      rail.style.cssText += "position:fixed;right:12px;top:120px;width:160px;margin:0;z-index:5;";
      document.body.appendChild(rail);
    }
  }

  // 5. Popunder — page-level script (Adsterra needs the real document for its click trigger).
  // Local 24h guard so a visitor sees at most one pop per day even if the placement cap slips.
  function pop() {
    if (!cfg.pop) return;
    var k = "sp-pop-at", now = Date.now();
    try {
      var last = +localStorage.getItem(k) || 0;
      if (now - last < 86400000) return;
      localStorage.setItem(k, String(now));
    } catch (e) { /* storage blocked: fall through, placement cap still applies */ }
    var s = document.createElement("script");
    s.async = true;
    s.setAttribute("data-cfasync", "false");
    s.src = cfg.pop;
    (document.body || document.head).appendChild(s);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { place(); pop(); });
  else { place(); pop(); }
})();
