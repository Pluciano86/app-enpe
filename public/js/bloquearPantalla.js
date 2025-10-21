(function () {
  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;

  if (!isTouchDevice) {
    return;
  }

  const noop = () => {};

  // Bloquear zoom por gestos (pinch) y gestos de Safari
  const preventDefault = (event) => {
    if (event.cancelable !== false) {
      event.preventDefault();
    }
  };

  const touchListenerOptions = { passive: false };

  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        preventDefault(event);
      }
    },
    touchListenerOptions
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        preventDefault(event);
      }
    },
    touchListenerOptions
  );

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 400) {
        preventDefault(event);
      }
      lastTouchEnd = now;
    },
    touchListenerOptions
  );

  ["gesturestart", "gesturechange", "gestureend"].forEach((name) => {
    document.addEventListener(name, preventDefault);
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) {
        preventDefault(event);
      }
    },
    { passive: false }
  );

  // Fallback para Safari: impedir doble tap en elementos interactivos
  document.addEventListener(
    "dblclick",
    (event) => {
      preventDefault(event);
    },
    { passive: false }
  );

  // Manejo de orientación
  const portrait = "portrait-primary";

  const legacyLock =
    screen.lockOrientation ||
    screen.mozLockOrientation ||
    screen.msLockOrientation ||
    noop;

  const unlock =
    screen.unlockOrientation ||
    screen.mozUnlockOrientation ||
    screen.msUnlockOrientation ||
    noop;

  const applyFallbackPortrait = () => {
    document.documentElement.style.transform = "";
    document.documentElement.style.width = "";
    document.documentElement.style.height = "";
    document.body.style.transform = "";
    document.body.style.width = "";
    document.body.style.height = "";
  };

  const clearFallbackPortrait = applyFallbackPortrait;

  const lockOrientation = () => {
    const orientation = screen.orientation || screen.mozOrientation || screen.msOrientation;
    if (orientation && typeof orientation.lock === "function") {
      orientation.lock("portrait").catch(noop);
      return;
    }

    if (typeof legacyLock === "function") {
      try {
        legacyLock.call(screen, portrait);
      } catch (_) {
        noop();
      }
      return;
    }

    applyFallbackPortrait();
  };

  const requestLockWithRetry = () => {
    lockOrientation();
    setTimeout(lockOrientation, 500);
  };

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        requestLockWithRetry();
      }
    },
    false
  );

  window.addEventListener("orientationchange", requestLockWithRetry);

  const userActivationLock = () => {
    requestLockWithRetry();
  };

  ["click", "touchstart"].forEach((name) => {
    document.addEventListener(name, userActivationLock, {
      once: true,
      passive: true,
    });
  });

  requestLockWithRetry();

  window.addEventListener(
    "beforeunload",
    () => {
      clearFallbackPortrait();
      if (typeof unlock === "function") {
        try {
          unlock.call(screen);
        } catch (_) {
          noop();
        }
      }
    },
    { once: true }
  );
})();

