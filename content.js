(() => {
  const STYLE_ID = "fieldnote-glass-style";
  const KEYS = ["backgroundImage", "fit", "opacity", "blur", "glass"];
  const SKIP_TAGS = new Set(["IMG", "VIDEO", "CANVAS", "SVG", "PATH", "SCRIPT", "STYLE", "HTML", "BODY", "INPUT", "TEXTAREA", "SELECT", "OPTION", "G-IMG"]);
  let enabled = false;
  let timer = null;
  let observer = null;
  const pending = new Set();

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  function buildCss(s) {
    const safeImage = s.backgroundImage.replace(/["\\\n\r]/g, "");
    const fit = ["cover", "contain", "auto"].includes(s.fit) ? s.fit : "cover";
    const opacity = Math.min(100, Math.max(10, Number(s.opacity) || 100)) / 100;
    const blur = Math.min(24, Math.max(0, Number(s.blur) || 0));
    const glass = Math.min(100, Math.max(0, s.glass === undefined ? 60 : Number(s.glass)));
    const alpha = (0.88 - (glass / 100) * 0.62).toFixed(3);
    const glassBlur = Math.round(6 + glass * 0.22);
    return `
      :root { --fn-alpha: ${alpha}; --fn-tint-alpha: ${(alpha * 0.7).toFixed(3)}; --fn-blur: ${glassBlur}px; }
      html, body { background: transparent !important; background-color: transparent !important; }
      body::before {
        content: ""; position: fixed; inset: -${Math.max(24, blur * 2)}px; z-index: -1; pointer-events: none;
        background-image: url("${safeImage}"); background-position: center center; background-repeat: no-repeat;
        background-size: ${fit}; filter: blur(${blur}px); opacity: ${opacity}; transform: scale(1.025);
      }
      .fn-glass {
        background-color: rgba(var(--fn-rgb), var(--fn-alpha)) !important;
        background-image: none !important;
        -webkit-backdrop-filter: blur(var(--fn-blur)) saturate(150%) !important;
        backdrop-filter: blur(var(--fn-blur)) saturate(150%) !important;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.10), inset 0 1px 0 rgba(255,255,255,.14), 0 8px 28px rgba(0,0,0,.18) !important;
      }
      .fn-tint { background-color: rgba(var(--fn-rgb), var(--fn-tint-alpha)) !important; background-image: none !important; }
      .fn-clear { background-color: transparent !important; background-image: none !important; box-shadow: none !important; }
    `;
  }

  function parseColor(value) {
    const m = value && value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some((n, i) => i < 3 && Number.isNaN(n))) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && !Number.isNaN(p[3]) ? p[3] : 1 };
  }

  function classify(el) {
    if (el.dataset.fnDone || SKIP_TAGS.has(el.tagName.toUpperCase())) return;
    if (el.closest("#" + STYLE_ID)) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const color = parseColor(cs.backgroundColor);
    const hasGradient = cs.backgroundImage && cs.backgroundImage !== "none" && /gradient/.test(cs.backgroundImage);
    if (!color && !hasGradient) return;
    if (color && color.a < 0.55 && !hasGradient) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 24 || rect.height < 14) return;
    const vw = window.innerWidth;
    const fixedLike = cs.position === "fixed" || cs.position === "sticky";
    const huge = rect.width > vw * 0.6 && rect.height > 280;
    const fullBleedBar = fixedLike && rect.width > 300 && rect.height > 60 && rect.bottom >= window.innerHeight - 4;
    const insideGlass = el.parentElement && el.parentElement.closest(".fn-glass, .fn-tint");

    el.dataset.fnDone = "1";
    if (!color) { el.classList.add("fn-clear"); return; }
    el.style.setProperty("--fn-rgb", `${color.r}, ${color.g}, ${color.b}`);
    if (huge || fullBleedBar || (hasGradient && fixedLike)) {
      el.classList.add("fn-clear");
    } else if (insideGlass) {
      el.classList.add("fn-tint");
    } else if (rect.width >= 60 && rect.height >= 28) {
      el.classList.add("fn-glass");
    } else {
      el.classList.add("fn-tint");
    }
  }

  function scan(root) {
    if (!enabled || !root || root.nodeType !== 1) return;
    classify(root);
    for (const el of root.querySelectorAll("div, section, form, aside, header, footer, nav, ul, li, a, span, button, g-inner-card, g-section-with-header, g-scrolling-carousel")) classify(el);
  }

  function flush() {
    timer = null;
    const nodes = Array.from(pending);
    pending.clear();
    for (const n of nodes) if (n.isConnected) scan(n);
  }
  function queue(node) {
    pending.add(node);
    if (!timer) timer = setTimeout(flush, 120);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) if (n.nodeType === 1) queue(n);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const first = () => scan(document.body || document.documentElement);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", first, { once: true });
    else first();
    // Late-rendered result cards and scroll-loaded content
    window.addEventListener("scroll", () => queue(document.body), { passive: true });
    window.addEventListener("load", () => setTimeout(first, 600), { once: true });
  }

  function reset() {
    enabled = false;
    for (const el of document.querySelectorAll("[data-fn-done]")) {
      el.classList.remove("fn-glass", "fn-tint", "fn-clear");
      el.style.removeProperty("--fn-rgb");
      delete el.dataset.fnDone;
    }
  }

  function apply(settings) {
    const style = ensureStyle();
    if (!settings.backgroundImage) { style.textContent = ""; reset(); return; }
    style.textContent = buildCss(settings);
    if (!enabled) { enabled = true; startObserver(); scan(document.body || document.documentElement); }
  }

  try {
    chrome.storage.local.get(KEYS, apply);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local") chrome.storage.local.get(KEYS, apply);
    });
  } catch (_) { /* extension context invalidated after reload */ }
})();
