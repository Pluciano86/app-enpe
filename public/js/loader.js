(() => {
  const LOADER_ID = "enpr-loader-overlay";
  const STYLE_ID = "enpr-loader-style";
  const FADE_DURATION = 700;
  const MIN_VISIBLE_TIME = 400;
  const SAFETY_TIMEOUT = 10000;
  const loaderHtmlUrl = new URL("./loader.html", import.meta.url).href;

  const ensureDomReady = () =>
    document.readyState === "loading"
      ? new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve, { once: true });
        })
      : Promise.resolve();

  const injectGlobalStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${LOADER_ID} {
  transition: opacity 0.7s ease-out;
}
#${LOADER_ID} img {
  animation: enpr-loader-spin 3.5s linear infinite;
  transform-origin: center;
  will-change: transform;
}
@keyframes enpr-loader-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
#${LOADER_ID} img {
  animation-duration: 12s;
}
}
`;
    (document.head || document.documentElement).appendChild(style);
  };

  const fetchLoaderElement = async () => {
    const response = await fetch(loaderHtmlUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Error cargando loader.html: ${response.status}`);
    const markup = (await response.text()).trim();
    if (!markup) throw new Error("Loader HTML vacío");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = markup;
    const element = wrapper.firstElementChild;
    if (!element) throw new Error("Loader HTML sin elemento raíz");
    element.id = LOADER_ID;
    element.style.opacity = element.style.opacity || "0";
    return element;
  };

  const showLoader = async () => {
    await ensureDomReady();
    if (document.getElementById(LOADER_ID)) return null;

    injectGlobalStyles();
    const loader = await fetchLoaderElement();
    document.body.prepend(loader);

    const start = performance.now();
    requestAnimationFrame(() => {
      loader.setAttribute("data-state", "visible");
      requestAnimationFrame(() => {
        loader.style.opacity = "1";
      });
    });

    return { loader, start };
  };

  (async () => {
    try {
      const result = await showLoader();
      if (!result) return;

      const { loader, start } = result;
      let removed = false;
      let safetyTimer = null;

      const removeLoader = (reason) => {
        if (removed) return;
        removed = true;
        if (safetyTimer) clearTimeout(safetyTimer);

        const elapsed = performance.now() - start;
        const delay = elapsed < MIN_VISIBLE_TIME ? MIN_VISIBLE_TIME - elapsed : 0;

        setTimeout(() => {
          loader.setAttribute("data-state", `hiding-${reason}`);
          loader.style.opacity = "0";

          const finalize = () => {
            if (loader.isConnected) loader.remove();
          };

          loader.addEventListener("transitionend", finalize, { once: true });
          setTimeout(finalize, FADE_DURATION + 120);
        }, delay);
      };

      if (document.readyState === "complete") {
  // ✅ Si la página ya está completamente cargada, espera 2.5s antes de quitar el loader
  setTimeout(() => removeLoader("already-complete"), 2500);
} else {
  // ✅ Si aún no está cargada, espera al evento load y luego aplica el mismo retraso
  window.addEventListener(
    "load",
    () => setTimeout(() => removeLoader("window-load"), 2500),
    { once: true }
  );
}

// ⏱️ Timeout de seguridad (10 s por si algo falla)
safetyTimer = setTimeout(() => {
  console.warn("⚠️ Loader eliminado por timeout de seguridad (10s)");
  removeLoader("timeout");
}, SAFETY_TIMEOUT);
    } catch (error) {
      console.error("❌ No se pudo inicializar el loader universal:", error);
    }
  })();
})();
