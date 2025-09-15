# Bootloader Sandbox

Minimal, editor-agnostic sandbox to preview **bootloader.art** projects locally.
Drop one script tag and point it at your generator file — works in any code editor.

![Demo](/assets/demo.PNG)

---

## Quick Start (fastest)

1. **Open the ready-made template in Codevre** (no setup):

   * Template: [https://codevre.com/editor?project=7kR8qQoxNCVu1AwDEoqetvzkVGC3\_20250915200704370\_39jf](https://codevre.com/editor?project=7kR8qQoxNCVu1AwDEoqetvzkVGC3_20250915200704370_39jf)

2. Or **open the full repo in Codevre**:

   * Full repo: [https://codevre.com/editor?project=7kR8qQoxNCVu1AwDEoqetvzkVGC3\_20250915193824038\_pnnk](https://codevre.com/editor?project=7kR8qQoxNCVu1AwDEoqetvzkVGC3_20250915193824038_pnnk)

3. Or use locally with the CDN:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <script>
      window.BootloaderSandboxConfig = {
        source: "/examples/sketch.js", // your generator file
        theme: "light",                // "light" | "dark"
        cache: true,                   // persist seed/iteration in localStorage
      };
    </script>

    <!-- CDN: latest from main branch -->
    <script src="https://cdn.jsdelivr.net/gh/Tezumie/bootloader-sandbox@main/src/bootloader-sandbox.min.js"></script>
  </body>
</html>
```

> Tip: add a version/hash during development to bust cache, e.g.
> `.../bootloader-sandbox.min.js?v=dev123`

---

## What it does

* Injects a minimal header UI (seed, iteration, refresh, randomize).
* Renders your generator code into a Bootloader-style SVG preview (iframe).
* Optional **dark/light** theme.
* Optional **localStorage** persistence for seed & iteration.

---

## Config

Set on `window.BootloaderSandboxConfig` **before** loading the script:

| Key    | Type                  | Default   | Description                             |
| ------ | --------------------- | --------- | --------------------------------------- |
| source | string                | see below | Path/URL to your generator JS file.     |
| theme  | `"light"` \| `"dark"` | `"light"` | UI theme.                               |
| cache  | boolean               | `true`    | Persist seed/iteration between reloads. |

**Source resolution order**:

1. `window.BootloaderSandboxConfig.source`
2. `"sketch.js"` (fallback)
3. `"script.js"` (fallback)

---

## File structure

```
/examples/index.html
/examples/sketch.js
/src/bootloader-sandbox.js
/src/bootloader-sandbox.min.js
/assets/demo.PNG
/README.md
```

---

## Links

* Bootloader site: [https://bootloader.art](https://bootloader.art)
* Docs: [https://bootloader.art/help](https://bootloader.art/help)
* Bootloader monorepo: [https://github.com/objkt-com/bootloader-monorepo](https://github.com/objkt-com/bootloader-monorepo)

---

## License

MIT — attribution appreciated.

