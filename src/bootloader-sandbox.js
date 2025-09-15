/*!
 * bootloader-sandbox.js
 * Minimal runtime UI/CSS injector for Bootloader-style SVG preview (inline SVG version).
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
   const SVG_NS = "http://www.w3.org/2000/svg";

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
#stage{ width:100%; height:100%; display:block; background:transparent; overflow:hidden; }
#stage > svg{ width:100%; height:100%; display:block; }
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

   /* =========================
      Source Resolution (strict order)
   ========================= */
   function resolveSourceURL() {
      if (typeof CFG.source === "string" && CFG.source.trim()) return CFG.source.trim();
      return "sketch.js";
   }

   async function getSketchCode() {
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
      else root.removeAttribute("data-theme");
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
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <rect width="12" height="12" x="2" y="10" rx="2" ry="2"></rect>
            <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"></path>
            <path d="M6 18h.01"></path>
            <path d="M18 9h.01"></path>
            <path d="M10 14h.01"></path>
            <path d="M15 6h.01"></path>
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
        <div id="stage" role="img" aria-label="Preview Area"></div>
        <div id="stage-mask" aria-hidden="true"></div>
      </div>
    `);
   }

   /* =========================
      Build inline SVG with executable <script>
   ========================= */
   function buildInlineBootloaderSVG(code, seedStr, iterationNumber) {
      // Normalize seed to BigInt-like decimal string
      let seedBig = "0";
      try {
         const clean = String(seedStr).replace(/\D+/g, "");
         seedBig = String(BigInt(clean || "0"));
      } catch { /* keep "0" */ }

      const iter = Math.max(0, Number(iterationNumber || 0)) | 0;

      // Create <svg>
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("xmlns", SVG_NS);
      // Fill the container by CSS (#stage > svg { width/height:100% })
      // Optionally, set a default viewBox so artwork scales:
      // svg.setAttribute("viewBox", "0 0 1000 1000");

      // Create <script> inside SVG; this WILL execute when appended
      const script = document.createElementNS(SVG_NS, "script");
      script.setAttribute("type", "application/javascript");
      script.textContent = `
         (() => {
         // local scope: no globals leak between renders
         const SEED = ${seedBig}n;
         function splitmix64(n0){let n=n0;return function(){
            let z=n = (n + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
            z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n & 0xffffffffffffffffn;
            z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn & 0xffffffffffffffffn;
            return Number((z ^ (z >> 31n)) & 0xffffffffn) >>> 0;
         }}
         function sfc32(a,b,c,d){ return function(){
            d|=0; let t = (a|=0) + (b|=0) | 0; t = (t + (d|=0)) | 0;
            d = (d + 1) | 0; a = b ^ (b>>>9); b = (c + (c<<3)) | 0;
            c = ((c<<21) | (c>>>11)); c = (c + t) | 0;
            return ((t>>>0) / 4294967296);
         }; }

         const sm = splitmix64(SEED), a=sm(), b=sm(), c=sm(), d=sm();
         const n = ${iter};

         // ⬇️ key change: bind to the actual <svg>
         const svgEl =
            (document.currentScript && document.currentScript.ownerSVGElement) ||
            (typeof document !== 'undefined' && document.querySelector('#stage > svg')) ||
            null;

         const BTLDR = {
            rnd: sfc32(a,b,c,d),
            seed: SEED,
            iterationNumber: n,
            isPreview: (n===0 && SEED===0n),
            svg: svgEl,               // ⬅️ not document.documentElement
            v: 'svg-js:0.0.1'
         };

         (function(BTLDR){
            ${code}
         })(BTLDR);
         })();
         `.trim();

      svg.appendChild(script);
      return svg;
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
            // Clear previous SVG (if any)
            stage.replaceChildren();

            const code = await getSketchCode();
            const svg = buildInlineBootloaderSVG(code, seedInput.value, iterInput.value);
            stage.appendChild(svg);

            // let the script run; hide the veil next frame
            requestAnimationFrame(stopLoading);
         } catch (err) {
            stopLoading();
            // Show error in the stage
            const pre = document.createElement("pre");
            pre.style.cssText = "color:#333;background:#fafafa;padding:16px;margin:0;white-space:pre-wrap;overflow:auto;";
            pre.textContent = String(err);
            stage.replaceChildren(pre);
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
