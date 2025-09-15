/*!
 * bootloader-sandbox.js
 * Minimal runtime UI/CSS injector for Bootloader-style SVG preview.
 *
 * Source resolution (in order):
 *   1) window.BootloaderSandboxConfig.source
 *   2) fallback "sketch.js"
 *   3) fallback "script.js"
 *
 * Theme via config:
 *   window.BootloaderSandboxConfig = { source: "/sketch.js", theme: "light" | "dark", cache: true|false }
 *   - cache (default: true) controls localStorage persistence of seed/iteration.
 */

(() => {
   if (window.__BootloaderSandboxInit) return; // guard against double-init
   window.__BootloaderSandboxInit = true;

   /* =========================
      Config / Constants / Helpers
   ========================= */
   const CFG = window.BootloaderSandboxConfig || {};
   const CACHE = CFG.cache !== false; // default ON; set to false to disable persistence
   const LS_KEYS = { seed: "bldr_seed", iter: "bldr_iter" };

   const CSS = `
:root{
  /* Light theme (default) */
  --fg:#111; --bg:#fff; --muted:#666; --border:#111;
  --btn-bg:#fff; --btn-bg-hover:#f3f3f3; --btn-bg-active:#e9e9e9;
  --input-bg:#fff;
  --veil:rgba(255,255,255,0.6);
  --focus:#111;
}
:root[data-theme="dark"]{
  --fg:#eee; --bg:#111; --muted:#aaa; --border:#333;
  --btn-bg:#1b1b1b; --btn-bg-hover:#222; --btn-bg-active:#262626;
  --input-bg:#0f0f0f;
  --veil:rgba(255,255,255,0.3);
  --focus:#eee;
}

*{box-sizing:border-box} html,body{height:100%}
body{
  margin:0; background:var(--bg); display:flex; flex-direction:column;
  font-family:"IBM Plex Mono", monospace; font-size:14px;
}

/* Header */
.head{
  background:var(--bg); color:var(--fg); border-bottom:1px solid var(--border);
  margin:0; padding:8px 10px; display:flex; align-items:center; gap:12px; user-select:none;
}
.head .title{ font-weight:500; letter-spacing:.02em; margin-right:auto; }
.head .label{ color:var(--muted); margin-left:6px; margin-right:4px; }

/* Inputs */
.head .input{
  height:24px; padding:2px 6px; font:inherit; color:var(--fg);
  background:var(--input-bg); border:1px solid var(--border); width:90px; padding-right:22px;
}
.head #iter{ width:64px; }
.head .input:focus{ outline:1px solid var(--focus); outline-offset:-1px; }

.input-wrap{ position:relative; display:inline-flex; align-items:center; }
.clearbtn{
  position:absolute; right:6px; top:calc(50% - 6px); transform:translateY(-50%);
  width:16px; height:16px; line-height:16px; border:0; background:transparent; color:var(--muted);
  cursor:pointer; padding:0; font:22px/1 "IBM Plex Mono", monospace; opacity:0; pointer-events:none;
}
.input-wrap:focus-within.has-value .clearbtn{ opacity:1; pointer-events:auto; }
.clearbtn:hover{ color:var(--fg); }

/* Header buttons */
.head .iconbtn{
  width:28px; height:28px; padding:0; display:inline-grid; place-items:center;
  background:var(--btn-bg); color:var(--fg); border:1px solid var(--border); cursor:pointer;
}
.head .iconbtn:hover{ background:var(--btn-bg-hover); }
.head .iconbtn:active{ background:var(--btn-bg-active); }
.head .icon{
  width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2; vector-effect:non-scaling-stroke;
}

/* Stage */
#stage-wrap{ position:relative; flex:1; min-height:0; margin:0; background:var(--bg); }
#stage-mask{
  position:absolute; inset:0; background:var(--veil);
  opacity:0; pointer-events:none;
}
#stage-wrap.is-loading #stage-mask{ opacity:1; }
#stage{ width:100%; height:100%; display:block; border:0; background:transparent; }
  `.trim();

   function loadPersisted() {
      if (!CACHE) return { seed: null, iter: null };
      return {
         seed: localStorage.getItem(LS_KEYS.seed),
         iter: localStorage.getItem(LS_KEYS.iter),
      };
   }
   function savePersisted(seed, iter) {
      if (!CACHE) return;
      if (seed != null) localStorage.setItem(LS_KEYS.seed, String(seed));
      if (iter != null) localStorage.setItem(LS_KEYS.iter, String(iter));
   }
   function removePersisted(which) {
      if (!CACHE) return;
      if (which === "seed") localStorage.removeItem(LS_KEYS.seed);
      if (which === "iter") localStorage.removeItem(LS_KEYS.iter);
   }
   function setHasValueFlag(el) {
      const wrap = el.closest(".input-wrap");
      if (!wrap) return;
      if (el.value && String(el.value).length) wrap.classList.add("has-value");
      else wrap.classList.remove("has-value");
   }
   function debounce(fn, ms = 250) {
      let t;
      return (...args) => {
         clearTimeout(t);
         t = setTimeout(() => fn(...args), ms);
      };
   }

   // Bootloader fragments (exact)
   const FRAG_1 = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cscript%3E%3C!%5BCDATA%5Bconst%20SEED%3D";
   const FRAG_2 = "n%3Bfunction%20splitmix64(f)%7Blet%20n%3Df%3Breturn%20function()%7Blet%20f%3Dn%3Dn%2B0x9e3779b97f4a7c15n%260xffffffffffffffffn%3Breturn%20f%3D((f%3D(f%5Ef%3E%3E30n)*0xbf58476d1ce4e5b9n%260xffffffffffffffffn)%5Ef%3E%3E27n)*0x94d049bb133111ebn%260xffffffffffffffffn%2CNumber(4294967295n%26(f%5E%3Df%3E%3E31n))%3E%3E%3E0%7D%7Dfunction%20sfc32(f%2Cn%2C%24%2Ct)%7Breturn%20function()%7B%24%7C%3D0%3Blet%20e%3D((f%7C%3D0)%2B(n%7C%3D0)%7C0)%2B(t%7C%3D0)%7C0%3Breturn%20t%3Dt%2B1%7C0%2Cf%3Dn%5En%3E%3E%3E9%2Cn%3D%24%2B(%24%3C%3C3)%7C0%2C%24%3D(%24%3D%24%3C%3C21%7C%24%3E%3E%3E11)%2Be%7C0%2C(e%3E%3E%3E0)%2F4294967296%7D%7Dconst%20sm%3Dsplitmix64(SEED)%2Ca%3Dsm()%2Cb%3Dsm()%2Cc%3Dsm()%2Cd%3Dsm()%2Cn%3D";
   const FRAG_3 = "%2CBTLDR%3D%7Brnd%3Asfc32(a%2Cb%2Cc%2Cd)%2Cseed%3ASEED%2CiterationNumber%3An%2CisPreview%3An%3D%3D%3D0%26%26SEED%3D%3D%3D0n%2Csvg%3Adocument.documentElement%2Cv%3A%27svg-js%3A0.0.1%27%7D%3B((BTLDR)%3D%3E%7B";
   const FRAG_4 = "%7D)(BTLDR)%3B%5D%5D%3E%3C%2Fscript%3E%3C%2Fsvg%3E";

   function buildSVGDataURL(code, seedStr, iterationNumber) {
      let seedBig = 0n;
      try {
         const clean = String(seedStr).replace(/\D+/g, "");
         seedBig = BigInt(clean || "0");
      } catch { }
      const encodedCode = encodeURIComponent(code);
      return FRAG_1 + seedBig + FRAG_2 + Math.max(0, Number(iterationNumber || 0)) + FRAG_3 + encodedCode + FRAG_4;
   }

   /* =========================
      Source Resolution (strict order)
   ========================= */
   function resolveSourceURL() {
      // 1) config.source
      if (typeof CFG.source === "string" && CFG.source.trim()) return CFG.source.trim();
      // 2) fallback "sketch.js"
      // 3) fallback "script.js"
      return "sketch.js"; // we’ll try this; if it 404s, we'll try script.js next in code fetch
   }

   async function getSketchCode() {
      // try config or sketch.js first; if that fails, try script.js
      const primary = resolveSourceURL();
      try {
         const res = await fetch(primary, { cache: "no-store" });
         if (!res.ok) throw new Error(String(res.status));
         return await res.text();
      } catch {
         const alt = "script.js";
         const res2 = await fetch(alt, { cache: "no-store" });
         if (!res2.ok) throw new Error(`Failed to fetch source: ${primary} AND ${alt}`);
         return await res2.text();
      }
   }

   /* =========================
      DOM Injection
   ========================= */
   function injectFonts() {
      if (!document.querySelector('link[href*="IBM+Plex+Mono"]')) {
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap";
         document.head.appendChild(link);
      }
   }

   function injectCSS() {
      const style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);
   }

   function applyThemeFromConfig() {
      const theme = (CFG && CFG.theme) || "light";
      const root = document.documentElement;
      if (theme === "dark") root.setAttribute("data-theme", "dark");
      else root.removeAttribute("data-theme"); // light default
   }

   function el(html) {
      const t = document.createElement("template");
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
   }

   function buildHeader() {
      return el(`
      <div class="head" role="toolbar" aria-label="Live Preview controls">
        <div class="title">Live Preview</div>

        <div class="label">iteration:</div>
        <span class="input-wrap">
          <input id="iter" class="input" type="text" value="0" min="0" />
          <button type="button" class="clearbtn" data-target="iter" aria-label="Clear iteration">×</button>
        </span>

        <div class="label">seed:</div>
        <span class="input-wrap">
          <input id="seed" class="input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" value="0" title="6-digit numeric seed (e.g. 894188)" />
          <button type="button" class="clearbtn" data-target="seed" aria-label="Clear seed">×</button>
        </span>

         <button id="randomSeed" class="iconbtn" title="Randomize seed">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dices" aria-hidden="true"><rect width="12" height="12" x="2" y="10" rx="2" ry="2"></rect><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"></path><path d="M6 18h.01"></path><path d="M18 9h.01">>
            </path><path d="M10 14h.01"></path><path d="M15 6h.01"></path>
            </svg>
       </button>

        <button id="reload" class="iconbtn" title="Refresh preview">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M8 16H3v5"></path>
          </svg>
        </button>
      </div>
    `);
   }

   function buildStage() {
      return el(`
      <div id="stage-wrap">
        <iframe id="stage" sandbox="allow-scripts"
          allow="accelerometer; camera; gyroscope; microphone; xr-spatial-tracking; midi;"></iframe>
        <div id="stage-mask" aria-hidden="true"></div>
      </div>
    `);
   }

   /* =========================
      Main Init
   ========================= */
   function init() {
      applyThemeFromConfig();
      injectFonts();
      injectCSS();

      // Where to mount? Use <main>, else body.
      const mount = document.querySelector("main") || document.body;

      const header = buildHeader();
      const stageWrap = buildStage();
      mount.prepend(stageWrap);
      mount.prepend(header);

      const seedInput = header.querySelector("#seed");
      const iterInput = header.querySelector("#iter");
      const reloadBtn = header.querySelector("#reload");
      const randomSeedBtn = header.querySelector("#randomSeed");
      const stage = stageWrap.querySelector("#stage");

      const params = new URLSearchParams(location.search);

      // helpers tied to stage
      const startLoading = () => stageWrap.classList.add("is-loading");
      const stopLoading = () => stageWrap.classList.remove("is-loading");
      stage.addEventListener("load", stopLoading);

      // initialize values (URL > storage > defaults)
      if (params.has("seed")) {
         seedInput.value = params.get("seed");
      } else {
         const { seed } = loadPersisted();
         if (seed) seedInput.value = seed;
      }
      if (params.has("iter")) {
         iterInput.value = params.get("iter");
      } else {
         const { iter } = loadPersisted();
         if (iter) iterInput.value = iter;
      }

      // flags
      setHasValueFlag(seedInput);
      setHasValueFlag(iterInput);

      async function render() {
         try {
            startLoading();
            const code = await getSketchCode();
            const url = buildSVGDataURL(code, seedInput.value, iterInput.value);
            stage.src = url;
         } catch (err) {
            stopLoading();
            const doc = stage.contentDocument || stage.contentWindow?.document;
            if (doc) {
               doc.open();
               doc.write(
                  `<pre style="color:#333;background:#fafafa;padding:16px;margin:0;">${String(err).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
                  }</pre>`
               );
               doc.close();
            }
            console.error(err);
         }
      }

      const debouncedRender = debounce(render, 250);

      // events
      reloadBtn.addEventListener("click", () => {
         savePersisted(seedInput.value, iterInput.value);
         render();
      });

      randomSeedBtn.addEventListener("click", () => {
         const six = (Math.floor(100000 + Math.random() * 900000)).toString();
         seedInput.value = six;
         savePersisted(seedInput.value, iterInput.value);
         render();
      });

      iterInput.addEventListener("input", () => {
         if (iterInput.value !== "") {
            iterInput.value = String(Math.max(0, Math.floor(Number(iterInput.value))));
         }
         savePersisted(seedInput.value, iterInput.value);
         setHasValueFlag(iterInput);
         debouncedRender();
      });

      seedInput.addEventListener("input", () => {
         seedInput.value = seedInput.value.replace(/\D+/g, "").slice(0, 6);
         savePersisted(seedInput.value, iterInput.value);
         setHasValueFlag(seedInput);
         debouncedRender();
      });

      header.querySelectorAll(".clearbtn").forEach(btn => {
         btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target"); // 'seed' or 'iter'
            const input = header.querySelector("#" + targetId);
            if (!input) return;

            input.value = "0";
            removePersisted(targetId === "seed" ? "seed" : "iter");
            setHasValueFlag(input);

            // keep the other value as-is
            savePersisted(seedInput.value, iterInput.value);

            debouncedRender();
            input.focus();
         });
      });

      // expose a tiny API if needed
      window.BootloaderSandbox = {
         render,
         get seed() { return seedInput.value; },
         set seed(v) {
            seedInput.value = String(v || 0);
            savePersisted(seedInput.value, iterInput.value);
            debouncedRender();
         },
         get iter() { return iterInput.value; },
         set iter(v) {
            iterInput.value = String(Math.max(0, Math.floor(Number(v || 0))));
            savePersisted(seedInput.value, iterInput.value);
            debouncedRender();
         }
      };

      // initial render
      render();
   }

   // Wait until DOM is ready enough to inject
   if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
   } else {
      init();
   }
})();
