// Simple client-side i18n helper (ES/EN/ZH) for vistas públicas
const DICTS = {
  es: {
    'area.title': 'Descubre por Área',
    'area.subtitle': 'Municipios del Área',
    'area.selectMunicipio': 'Selecciona un municipio...',
    'area.municipios': 'Municipios:',
    'area.categorias': 'Categorías:',
    'area.buscar': 'Buscar por nombre',
    'area.abierto': 'Abierto ahora',
    'area.favoritos': 'Mis Favoritos',
    'area.gratis': 'Gratis',
    'area.lugares': "LUGARES PA' VISITAR",
    'area.eventos': 'PRÓXIMOS EVENTOS',
    'area.comida': '¿HAMBRE? CHEQUEA ESTOS PLATOS 🤤',
    'area.verMasLugares': 'Ver más lugares',
    'area.cargandoLugares': 'Cargando lugares...',
    'area.sinLugares': 'No hay lugares disponibles.',
  },
  en: {
    'area.title': 'Explore by Area',
    'area.subtitle': 'Municipalities in this Area',
    'area.selectMunicipio': 'Choose a municipality...',
    'area.municipios': 'Municipalities:',
    'area.categorias': 'Categories:',
    'area.buscar': 'Search by name',
    'area.abierto': 'Open now',
    'area.favoritos': 'My Favorites',
    'area.gratis': 'Free',
    'area.lugares': 'Places to Visit',
    'area.eventos': 'Upcoming Events',
    'area.comida': 'Hungry? Check these plates 🤤',
    'area.jangueo': 'Nightlife & Bars 🔥',
    'area.modalComida': 'All places to eat',
    'area.verMasLugares': 'See more places',
    'area.cargandoLugares': 'Loading places...',
    'area.sinLugares': 'No places available.',
  },
  zh: {
    'area.title': '按地区探索',
    'area.subtitle': '此地区的市镇',
    'area.selectMunicipio': '选择一个市镇...',
    'area.municipios': '市镇：',
    'area.categorias': '类别：',
    'area.buscar': '按名称搜索',
    'area.abierto': '现在营业',
    'area.favoritos': '我的收藏',
    'area.gratis': '免费',
    'area.lugares': '推荐景点',
    'area.eventos': '即将举行的活动',
    'area.comida': '饿了吗？看看这些美食 🤤',
    'area.jangueo': '夜生活与酒吧 🔥',
    'area.modalComida': '所有可用餐地点',
    'area.verMasLugares': '查看更多景点',
    'area.cargandoLugares': '加载景点中...',
    'area.sinLugares': '暂无景点。',
  },
};

export let currentLang = localStorage.getItem('lang') || 'es';

export function t(key) {
  const dict = DICTS[currentLang] || DICTS.es;
  return dict[key] || DICTS.es[key] || key;
}

export function setLang(lang) {
  currentLang = DICTS[lang] ? lang : 'es';
  localStorage.setItem('lang', currentLang);
  translateDom();
}

export function translateDom(root = document) {
  const els = root.querySelectorAll('[data-i18n]');
  els.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  const placeholders = root.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key));
  });
}

export function initI18n() {
  // Sincronizar selector si existe
  const sel = document.getElementById('langSelect');
  if (sel) {
    sel.value = currentLang;
    sel.onchange = (e) => setLang(e.target.value);
  }
  translateDom();
}

// Exponer global por compatibilidad
window.t = t;
window.setLang = setLang;
window.initI18n = initI18n;
