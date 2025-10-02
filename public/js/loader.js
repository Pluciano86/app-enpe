(function () {
  const currentScript = document.currentScript;
  const loaderUrl = currentScript
    ? new URL('./loader.html', currentScript.src)
    : null;

  let loaderElement = null;
  let loaderPromise = null;

  const ensureLoader = () => {
    if (loaderElement) return Promise.resolve(loaderElement);
    if (loaderPromise) return loaderPromise;

    loaderPromise = (async () => {
      if (!loaderUrl) {
        console.error('No se pudo determinar la ruta del loader.');
        return null;
      }

      try {
        const response = await fetch(loaderUrl);
        if (!response.ok) {
          throw new Error(`Error cargando loader.html: ${response.status}`);
        }
        const html = await response.text();
        const temp = document.createElement('div');
        temp.innerHTML = html.trim();
        const element = temp.firstElementChild;
        if (!element) return null;

        const append = () => {
          if (!document.body) {
            document.addEventListener('DOMContentLoaded', () => {
              document.body.appendChild(element);
            }, { once: true });
          } else {
            document.body.appendChild(element);
          }
        };

        append();
        loaderElement = element;
        return loaderElement;
      } catch (error) {
        console.error('No se pudo inicializar el loader:', error);
        return null;
      }
    })();

    return loaderPromise;
  };

  window.mostrarLoader = async () => {
    const element = await ensureLoader();
    element?.classList.remove('hidden');
  };

  window.ocultarLoader = async () => {
    const element = await ensureLoader();
    element?.classList.add('hidden');
  };

  // Pre-carga inmediata
  ensureLoader();

  const showOnReady = () => {
    window.mostrarLoader();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showOnReady, { once: true });
  } else {
    showOnReady();
  }

  const hideOnLoad = () => {
    window.ocultarLoader();
  };

  if (document.readyState === 'complete') {
    hideOnLoad();
  } else {
    window.addEventListener('load', hideOnLoad, { once: true });
  }
})();
