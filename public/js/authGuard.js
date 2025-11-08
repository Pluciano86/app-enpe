import { supabase } from '../shared/supabaseClient.js';

const LOGIN_URL = '/public/usuarios/login.html';

const ACTION_MESSAGES = {
  favoriteCommerce: 'Debes iniciar sesión para agregar este comercio a tus favoritos.',
  favoritePlace: 'Debes iniciar sesión para agregar este lugar a tus favoritos.',
  favoriteBeach: 'Debes iniciar sesión para agregar esta playa a tus favoritos.',
  saveCoupon: 'Debes tener una cuenta Plus para guardar este cupón.',
  default: 'Debes iniciar sesión para continuar.'
};

let modalOverlay = null;
let modalMessageEl = null;

function ensureModal() {
  if (modalOverlay) return;

  modalOverlay = document.createElement('div');
  modalOverlay.id = 'auth-guard-modal';
  modalOverlay.className =
    'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4 hidden';

  modalOverlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-5 relative">
      <button type="button" class="auth-guard-close absolute top-3 right-3 text-gray-400 hover:text-gray-600" aria-label="Cerrar modal">
        <i class="fas fa-times text-lg"></i>
      </button>
      <div class="flex flex-col items-center gap-3">
        <div class="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
          <i class="fas fa-user-lock"></i>
        </div>
        <p id="auth-guard-message" class="text-sm text-gray-700 leading-relaxed"></p>
      </div>
      <div class="space-y-3">
        <button type="button" class="auth-guard-login w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
          Iniciar sesión
        </button>
        <button type="button" class="auth-guard-close w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  modalMessageEl = modalOverlay.querySelector('#auth-guard-message');
  modalOverlay.querySelectorAll('.auth-guard-close').forEach((btn) => {
    btn.addEventListener('click', hideAuthModal);
  });
  modalOverlay.querySelector('.auth-guard-login')?.addEventListener('click', () => {
    hideAuthModal();
    window.location.href = LOGIN_URL;
  });

  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
      hideAuthModal();
    }
  });
}

function showAuthModal(message) {
  ensureModal();
  if (modalMessageEl) {
    modalMessageEl.textContent = message || ACTION_MESSAGES.default;
  }
  modalOverlay?.classList.remove('hidden');
}

function hideAuthModal() {
  modalOverlay?.classList.add('hidden');
}

/**
 * Verifica si hay un usuario autenticado. Si no lo hay, muestra el modal y lanza un error.
 * @param {'favoriteCommerce'|'favoritePlace'|'favoriteBeach'|'saveCoupon'} actionKey
 */
export async function requireAuth(actionKey) {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      return data.user;
    }
  } catch (err) {
    console.warn('⚠️ No se pudo obtener el usuario actual:', err);
  }

  const message = ACTION_MESSAGES[actionKey] || ACTION_MESSAGES.default;
  showAuthModal(message);
  throw new Error('AUTH_REQUIRED');
}
