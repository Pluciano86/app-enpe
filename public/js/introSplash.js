const INTRO_KEY = 'findixi_intro_last_shown';
const INTRO_BG = '#fb8500';
const INTRO_LOGO = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/findixi/logoFindixiBlanco.png';
const INTRO_DURATION_MS = 3600;
const ROTATE_EVERY_MS = 700;

const SLOGANS = [
  '¡Explora lo local!',
  'Explore local',
  '探索本地',
  'Explorez local',
  'Explore o local',
  'Entdecke Lokales',
  'Esplora il locale',
  '로컬을 탐험하세요',
  'ローカルを探索',
];

function shouldSkipIntro() {
  try {
    if (window.location.pathname.includes('/menu/menuComercio.html')) return true;
    const today = new Date().toISOString().slice(0, 10);
    const lastShown = localStorage.getItem(INTRO_KEY);
    return lastShown === today;
  } catch (_) {
    return false;
  }
}

function markIntroShown() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(INTRO_KEY, today);
  } catch (_) {
    // noop
  }
}

function injectStyles() {
  if (document.getElementById('intro-splash-styles')) return;
  const style = document.createElement('style');
  style.id = 'intro-splash-styles';
  style.textContent = `
    #intro-splash {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: ${INTRO_BG};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      transition: opacity 300ms ease;
    }
    #intro-splash.fade-out {
      opacity: 0;
      pointer-events: none;
    }
    #intro-splash .intro-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
    }
    #intro-splash .intro-logo {
      width: 180px;
      max-width: 70vw;
      height: auto;
      display: block;
    }
    #intro-splash .intro-text {
      color: #ffffff;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.2px;
      transition: opacity 250ms ease;
    }
    #intro-splash .intro-text.fade {
      opacity: 0;
    }
  `;
  document.head.appendChild(style);
}

function showIntro() {
  injectStyles();
  markIntroShown();

  const overlay = document.createElement('div');
  overlay.id = 'intro-splash';
  overlay.innerHTML = `
    <div class="intro-content">
      <img class="intro-logo" src="${INTRO_LOGO}" alt="Findixi" />
      <div id="intro-splash-text" class="intro-text"></div>
    </div>
  `;

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);

  const textEl = document.getElementById('intro-splash-text');
  let index = 0;
  if (textEl) {
    textEl.textContent = SLOGANS[index];
  }

  const rotate = () => {
    if (!textEl) return;
    textEl.classList.add('fade');
    setTimeout(() => {
      index = (index + 1) % SLOGANS.length;
      textEl.textContent = SLOGANS[index];
      textEl.classList.remove('fade');
    }, 220);
  };

  const intervalId = setInterval(rotate, ROTATE_EVERY_MS);

  const dismiss = () => {
    clearInterval(intervalId);
    overlay.classList.add('fade-out');
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = previousOverflow;
    }, 320);
  };

  overlay.addEventListener('click', dismiss);
  setTimeout(dismiss, INTRO_DURATION_MS);
}

if (!shouldSkipIntro()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showIntro);
  } else {
    showIntro();
  }
}
