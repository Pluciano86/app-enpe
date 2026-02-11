// menu/menuComercio.js
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../shared/supabaseClient.js';
import { getMenuI18n } from '../shared/menuI18n.js';
import { mountLangSelector } from '../shared/langSelector.js';
import { getLang } from '../js/i18n.js';

const params = new URLSearchParams(window.location.search);
const idComercio = params.get('idComercio') || params.get('id');
const modeParam = (params.get('modo') || params.get('mode') || 'view').toLowerCase();
const mesaParam = (params.get('mesa') || params.get('table') || '').trim();
const sourceParam = (params.get('source') || '').toLowerCase();
const orderMode = modeParam === 'mesa' ? 'mesa' : modeParam === 'pickup' ? 'pickup' : 'view';
const allowPickup = orderMode === 'pickup' && sourceParam === 'app';
const allowMesa = orderMode === 'mesa';
const allowOrdering = allowPickup || allowMesa;
const orderSource = allowPickup ? 'app' : allowMesa ? 'qr' : 'qr';
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
const seccionesEl = document.getElementById('seccionesMenu');
const btnVolver = document.getElementById('btnVolver');
const btnMenuPdf = document.getElementById('btnMenuPdf');
const heroPortada = document.getElementById('heroPortada');
const heroOverlay = document.getElementById('heroOverlay');
const heroImg = document.getElementById('heroImg');
const heroNombre = document.getElementById('heroNombre');
const heroMenuWord = document.getElementById('heroMenuWord');
let seccionActivaWrapper = null;
const footerLogoComercio = document.getElementById('footerLogoComercio');
const footerNombreComercio = document.getElementById('footerNombreComercio');
const footerTelefono = document.getElementById('footerTelefono');
const footerFacebook = document.getElementById('footerFacebook');
const footerInstagram = document.getElementById('footerInstagram');
const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const DEFAULT_TEMA = {
  colortexto: '#1f2937',
  colortitulo: '#111827',
  colorprecio: '#2563eb',
  colorboton: '#2563eb',
  colorbotontexto: '#ffffff',
  fontbody_size: 16,
  fonttitle_size: 18,
  nombre_font_size: 28,
  menu_font_size: 20,
  seccion_desc_font_family: null,
  seccion_desc_font_url: null,
  seccion_desc_font_size: 14,
  seccion_desc_color: null,
  colorComercio: '#111827',
  colorMenu: '#111827',
  overlayoscuro: 40,
  pdfurl: '',
  colorBotonPDF: 'rgba(37, 99, 235, 0.8)',
  portadaimagen: '',
  backgroundimagen: '',
  backgroundcolor: '#ffffff',
  textomenu: 'Menú',
  ocultar_nombre: false,
  ocultar_menu: false,
  fontbodyfamily: null,
  fontbodyurl: null,
  fonttitlefamily: null,
  fonttitleurl: null,
  fontnombrefamily: null,
  fontnombreurl: null,
  fontmenuwordfamily: null,
  fontmenuwordurl: null,
  nombre_shadow: '',
  nombre_stroke_width: 0,
  nombre_stroke_color: '#000000',
  menu_shadow: '',
  menu_stroke_width: 0,
  menu_stroke_color: '#000000',
  titulos_shadow: '',
  titulos_stroke_width: 0,
  titulos_stroke_color: '#000000',
  boton_shadow: '',
  boton_stroke_width: 0,
  boton_stroke_color: '#000000',
  item_bg_color: '#ffffff',
  item_overlay: 0,
  productoAlign: 'left',
};

let temaActual = { ...DEFAULT_TEMA };
let linkFuente = null;
let coverUrl = '';
let backgroundUrl = '';
const fontLinks = new Set();
let menusBase = [];
let productosBase = [];
let productosView = [];
const productosById = new Map();
let renderToken = 0;
let seccionActivaId = null;
const menuButtons = new Map(); // idMenu -> { btn, titleEl, descEl }

let cartState = { items: {} };
let cartFab = null;
let cartDrawer = null;
let orderBanner = null;
let cartKey = null;

const getCurrentLang = () => {
  const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || '';
  const docLang = (typeof document !== 'undefined' && document.documentElement?.lang) || '';
  const fallback = getLang ? getLang() : 'es';
  return (stored || docLang || fallback || 'es').toLowerCase().split('-')[0];
};

const showGlobalLoader = () => {
  const loader = document.getElementById('globalLoader');
  if (!loader) return;
  loader.classList.remove('hidden', 'opacity-0');
  loader.classList.add('flex', 'opacity-100');
};

const hideGlobalLoader = () => {
  const loader = document.getElementById('globalLoader');
  if (!loader) return;
  loader.classList.remove('opacity-100');
  loader.classList.add('opacity-0');
  setTimeout(() => {
    loader.classList.remove('flex');
    loader.classList.add('hidden');
  }, 200);
};

function cacheBust(url) {
  if (!url) return '';
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}cb=${Date.now()}`;
}

function parseColorToHexAlpha(color, defaultHex = '#2563eb', defaultAlpha = 0.8) {
  if (!color) return { hex: defaultHex, alpha: defaultAlpha };
  if (color.startsWith('rgb')) {
    const parts = color.replace(/rgba?\(|\)/g, '').split(',').map((v) => v.trim());
    const [r = 0, g = 0, b = 0, a = defaultAlpha] = parts;
    const hex = `#${[r, g, b]
      .map((n) => {
        const num = parseInt(n, 10);
        const clamped = Number.isFinite(num) ? Math.min(Math.max(num, 0), 255) : 0;
        return clamped.toString(16).padStart(2, '0');
      })
      .join('')}`;
    const alpha = Number.parseFloat(a) || defaultAlpha;
    return { hex, alpha: Math.min(Math.max(alpha, 0), 1) };
  }
  const hex = color.startsWith('#') ? color : `#${color}`;
  return { hex, alpha: defaultAlpha };
}

function ensureFontLink(url) {
  if (!url) return;
  // Si ya se cargó
  if (fontLinks.has(url)) return;
  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(
    (l) => l.href === url
  );
  if (existing) {
    fontLinks.add(url);
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
  fontLinks.add(url);
}

function aplicarFuentePublica(fuente) {
  if (!fuente?.url || !fuente.name) return;
  ensureFontLink(fuente.url);
}

function setCssVars() {
  const t = temaActual;
  document.body.style.setProperty('--menu-color-texto', t.colortexto);
  document.body.style.setProperty('--menu-color-titulo', t.colortitulo);
  document.body.style.setProperty('--menu-color-precio', t.colorprecio);
  document.body.style.setProperty('--menu-color-boton', t.colorboton);
  document.body.style.setProperty('--menu-color-boton-texto', t.colorbotontexto);
  document.body.style.color = t.colortexto || '#1f2937';

  if (backgroundUrl) {
    const alpha = Math.min(Math.max(Number(t.overlayoscuro) || 0, 0), 80) / 100;
    const bgColor = t.backgroundcolor || '#ffffff';
    document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,${alpha}), rgba(0,0,0,${alpha})), url(${backgroundUrl})`;
    document.body.style.backgroundColor = bgColor;
    document.body.style.backgroundSize = '100% auto';
    document.body.style.backgroundRepeat = 'repeat-y';
    document.body.style.backgroundAttachment = 'scroll';
    document.body.style.backgroundPosition = 'center top';
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundColor = t.backgroundcolor || '#ffffff';
  }
}

async function cargarTema() {
  try {
  const { data, error } = await supabase
    .from('menu_tema')
    .select('colortexto,colortitulo,colorprecio,colorboton,colorbotontexto,"colorComercio","colorMenu","productoAlign",ocultar_nombre,ocultar_menu,overlayoscuro,pdfurl,"colorBotonPDF",portadaimagen,backgroundimagen,backgroundcolor,textomenu,fontbodyfamily,fontbodyurl,fontbody_size,fonttitlefamily,fonttitleurl,fonttitle_size,fontnombrefamily,fontnombreurl,nombre_font_size,fontmenuwordfamily,fontmenuwordurl,menu_font_size,nombre_shadow,nombre_stroke_width,nombre_stroke_color,menu_shadow,menu_stroke_width,menu_stroke_color,titulos_shadow,titulos_stroke_width,titulos_stroke_color,boton_shadow,boton_stroke_width,boton_stroke_color,item_bg_color,item_overlay,seccion_desc_font_family,seccion_desc_font_url,seccion_desc_font_size,seccion_desc_color')
      .eq('idcomercio', idComercio)
      .maybeSingle();

    if (error) {
      console.warn('No se pudo cargar tema de menú:', error?.message || error);
    }

    temaActual = { ...DEFAULT_TEMA, ...(data || {}) };
  } catch (err) {
    console.warn('Error inesperado cargando tema, usando defaults:', err);
    temaActual = { ...DEFAULT_TEMA };
  }

  // background/portada
  if (temaActual.portadaimagen) {
    if (temaActual.portadaimagen.startsWith('http')) {
      coverUrl = cacheBust(temaActual.portadaimagen);
    } else {
      const pub = supabase.storage.from('galeriacomercios').getPublicUrl(temaActual.portadaimagen).data?.publicUrl || '';
      coverUrl = cacheBust(pub);
    }
  } else {
    coverUrl = '';
  }

  if (temaActual.backgroundimagen) {
    if (temaActual.backgroundimagen.startsWith('http')) {
      backgroundUrl = cacheBust(temaActual.backgroundimagen);
    } else {
      const pub = supabase.storage.from('galeriacomercios').getPublicUrl(temaActual.backgroundimagen).data?.publicUrl || '';
      backgroundUrl = cacheBust(pub);
    }
  } else {
    backgroundUrl = '';
  }

  // fuentes
  if (temaActual.fontbodyfamily && temaActual.fontbodyurl) {
    aplicarFuentePublica({ name: temaActual.fontbodyfamily, url: temaActual.fontbodyurl });
  }
  if (temaActual.fonttitlefamily && temaActual.fonttitleurl) {
    ensureFontLink(temaActual.fonttitleurl);
  }
  if (temaActual.fontnombrefamily && temaActual.fontnombreurl) {
    ensureFontLink(temaActual.fontnombreurl);
  }
  if (temaActual.fontmenuwordfamily && temaActual.fontmenuwordurl) {
    ensureFontLink(temaActual.fontmenuwordurl);
  }
  if (temaActual.seccion_desc_font_url) {
    ensureFontLink(temaActual.seccion_desc_font_url);
  }

  if (btnMenuPdf) {
    if (temaActual.pdfurl) {
      btnMenuPdf.href = temaActual.pdfurl;
      btnMenuPdf.classList.remove('hidden');
      const { hex, alpha } = parseColorToHexAlpha(temaActual.colorBotonPDF, '#2563eb', 0.8);
      btnMenuPdf.style.backgroundColor = hex;
      btnMenuPdf.style.opacity = alpha || 0.8;
    } else {
      btnMenuPdf.classList.add('hidden');
    }
  }

  setCssVars();
  if (isDev) console.log('[menu publico] Tema cargado', { idComercio, tema: temaActual, pdf: !!temaActual.pdfurl, coverUrl, backgroundUrl });
}

async function cargarDatos() {
  await cargarTema();

  const { data: comercio, error: errorComercio } = await supabase
    .from('Comercios')
    .select('id, nombre, colorPrimario, colorSecundario, logo, telefono, facebook, instagram')
    .eq('id', idComercio)
    .single();

  if (errorComercio || !comercio) return alert('Error cargando comercio');

  if (heroNombre) {
    const colorComercioVal = temaActual.colorComercio || temaActual.colortitulo;
    const oculto = !!temaActual.ocultar_nombre;
    heroNombre.textContent = comercio.nombre || heroNombre.textContent || '';
    heroNombre.style.display = oculto ? 'none' : 'block';
    if (!oculto) {
      heroNombre.style.color = colorComercioVal;
      if (temaActual.nombre_font_size) heroNombre.style.fontSize = `${temaActual.nombre_font_size}px`;
      const strokeW = Number(temaActual.nombre_stroke_width) || 0;
      heroNombre.style.webkitTextStroke = strokeW > 0 ? `${strokeW}px ${temaActual.nombre_stroke_color || '#000'}` : '';
      heroNombre.style.paintOrder = 'stroke fill';
      heroNombre.style.textShadow = temaActual.nombre_shadow || '';
      heroNombre.style.fontFamily = temaActual.fontnombrefamily
        ? `'${temaActual.fontnombrefamily}', 'Kanit', sans-serif`
        : '';
    }
  }
  if (heroMenuWord) {
    const colorMenuVal = temaActual.colorMenu || temaActual.colortitulo;
    const ocultoMenu = !!temaActual.ocultar_menu;
    heroMenuWord.textContent = temaActual.textomenu || heroMenuWord.textContent || 'Menú';
    heroMenuWord.style.display = ocultoMenu ? 'none' : 'block';
    if (!ocultoMenu) {
      heroMenuWord.style.color = colorMenuVal;
      if (temaActual.menu_font_size) heroMenuWord.style.fontSize = `${temaActual.menu_font_size}px`;
      const strokeW = Number(temaActual.menu_stroke_width) || 0;
      heroMenuWord.style.webkitTextStroke = strokeW > 0 ? `${strokeW}px ${temaActual.menu_stroke_color || '#000'}` : '';
      heroMenuWord.style.paintOrder = 'stroke fill';
      heroMenuWord.style.textShadow = temaActual.menu_shadow || '';
      heroMenuWord.style.fontFamily = temaActual.fontmenuwordfamily
        ? `'${temaActual.fontmenuwordfamily}', 'Kanit', sans-serif`
        : '';
    }
  }
  document.body.style.setProperty('--colorPrimario', comercio.colorPrimario || '#3ea6c4');
  document.body.style.setProperty('--colorSecundario', comercio.colorSecundario || '#f5f5f5');

  if (heroPortada) {
    // Elimina overlay para evitar sombra detrás de PNG
    if (heroOverlay) heroOverlay.style.backgroundColor = 'transparent';
    if (heroImg) {
      const heroSrc = coverUrl || backgroundUrl || '';
      heroImg.src = heroSrc;
      const isEmpty = !heroSrc;
      heroImg.classList.toggle('hidden', isEmpty);
      if (isEmpty) {
        heroPortada.style.backgroundColor = temaActual.backgroundcolor || '#ffffff';
      }
    }
    if (!coverUrl && !backgroundUrl) {
      heroPortada.style.backgroundColor = temaActual.backgroundcolor || '#ffffff';
    }
    if (isDev) console.log('[menu publico] Hero', { portadaimagen: temaActual.portadaimagen, coverUrl, heroSrc: heroImg?.src || '' });
  }

  const { data: menus, error: errorMenus } = await supabase
    .from('menus')
    .select('id, titulo, descripcion, subtitulo, orden, no_traducir')
    .eq('idComercio', idComercio)
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (errorMenus) return alert('Error cargando menú');
  menusBase = menus || [];
  menuButtons.clear();

  if (!seccionesEl) {
    console.warn('[menu] Contenedor de secciones no encontrado');
    return;
  }
  // Asegura color de texto base para legibilidad sobre fondos
  seccionesEl.style.color = temaActual.colortexto || '#1f2937';

  // 1) cargar todos los productos una sola vez
  const menuIds = (menus || []).map((m) => m.id).filter(Boolean);

  if (menuIds.length) {
    const { data: productosAll, error: errorProductosAll } = await supabase
      .from('productos')
      .select('*')
      .in('idMenu', menuIds)
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (errorProductosAll) {
      console.warn('Error cargando productos base:', errorProductosAll);
      productosBase = [];
    } else {
      productosBase = productosAll || [];
    }
  } else {
    productosBase = [];
  }

  productosById.clear();
  productosBase.forEach((p) => {
    if (p?.id) productosById.set(p.id, p);
  });
  if (allowOrdering) updateCartUi();

  seccionesEl.innerHTML = '';
  let seccionActiva = null;
  seccionActivaWrapper = null;

  for (const menu of menus) {
    const wrapper = document.createElement('div');
    wrapper.className = 'w-[90%] mx-auto';

    const btn = document.createElement('button');
    btn.className = 'menuHeaderBtn w-full text-xl rounded mb-2 shadow font-medium hover:opacity-90 transition text-center space-y-1';
    btn.dataset.menuId = menu.id;

    const tituloTxt = (menu.titulo ?? 'Sin título').trim();
    btn.innerHTML = `
      <div class="w-full text-center">
        <div class="menuHeaderTitle font-bold">${tituloTxt}</div>
        <div class="menuHeaderDesc"></div>
      </div>
    `;
    btn.style.backgroundColor = temaActual.colorboton || '#2563eb';
    btn.style.color = temaActual.colorbotontexto || '#ffffff';
    const strokeBtn = Number(temaActual.boton_stroke_width) || 0;
    btn.style.webkitTextStroke = strokeBtn > 0 ? `${strokeBtn}px ${temaActual.boton_stroke_color || '#000'}` : '';
    btn.style.textShadow = temaActual.boton_shadow || '';
    const titleEl = btn.querySelector('.menuHeaderTitle');
    const descElHeader = btn.querySelector('.menuHeaderDesc');
    const titleSize =
      temaActual.seccion_font_size ??
      temaActual.boton_seccion_font_size ??
      temaActual.fonttitle_size ??
      18;
    const descSize = temaActual.seccion_desc_font_size ?? Math.round(titleSize * 0.8);
    if (titleEl) titleEl.style.fontSize = `${titleSize}px`;
    if (descElHeader) {
      descElHeader.style.fontSize = `${descSize}px`;
      const descColor = temaActual.seccion_desc_color || temaActual.colorbotontexto || '#ffffff';
      descElHeader.style.color = descColor;
      const descFont = temaActual.seccion_desc_font_family || temaActual.fonttitlefamily;
      if (descFont) descElHeader.style.fontFamily = `'${descFont}', 'Kanit', sans-serif`;
    }
    if (temaActual.fonttitlefamily && titleEl) {
      titleEl.style.fontFamily = `'${temaActual.fonttitlefamily}', 'Kanit', sans-serif`;
    }

    const productosContenedor = document.createElement('div');
    productosContenedor.className = 'hidden mt-2 space-y-2';
    const listaDiv = document.createElement('div');
    listaDiv.className = 'space-y-2';
    productosContenedor.appendChild(listaDiv);
    menuButtons.set(menu.id, {
      btn,
      titleEl: btn.querySelector('.menuHeaderTitle'),
      descEl: btn.querySelector('.menuHeaderDesc'),
      listaDiv,
      productosContenedor,
      wrapper,
    });

    btn.onclick = async () => {
      if (seccionActiva === productosContenedor) {
        productosContenedor.classList.add('hidden');
        seccionActiva = null;
        seccionActivaId = null;
        if (seccionActivaWrapper) seccionActivaWrapper.classList.remove('menu-open');
        const descElLocal = btn.querySelector('.menuHeaderDesc');
        if (descElLocal) descElLocal.textContent = '';
        return;
      }
      if (seccionActiva) {
        seccionActiva.classList.add('hidden');
        if (seccionActivaWrapper) seccionActivaWrapper.classList.remove('menu-open');
        if (seccionActivaWrapper) {
          const prevDesc = seccionActivaWrapper.querySelector('.menuHeaderDesc');
          if (prevDesc) prevDesc.textContent = '';
        }
      }
      seccionActiva = productosContenedor;
      seccionActivaWrapper = wrapper;
      seccionActivaId = menu.id;
      productosContenedor.classList.remove('hidden');
      wrapper.classList.add('menu-open');

      const lang = getLang();
      const descElLocal = btn.querySelector('.menuHeaderDesc');
      const titleEl = btn.querySelector('.menuHeaderTitle');

      try {
        const myToken = ++renderToken;
        listaDiv.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';
        const menuTrad = await getMenuI18n(menu.id, lang, { includeProductos: true });
        if (titleEl && menuTrad?.menu?.titulo) titleEl.textContent = menuTrad.menu.titulo;
        const descTxt = (menuTrad?.menu?.descripcion || menu.descripcion || '').trim();
        if (descElLocal) descElLocal.textContent = descTxt;

        const productosTrad = (menuTrad?.productos || []).map((p) => ({ ...p }));
        const baseProductos = (productosBase || [])
          .filter((p) => p.idMenu === menu.id)
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

        const tradById = new Map(productosTrad.map((t) => [Number(t.id ?? t.idproducto), t]));
        const productos = baseProductos.map((p) => {
          const t = tradById.get(Number(p.id));
          if (!t) return p;
          return {
            ...p, // conserva precio/imagen/etc.
            nombre: t.nombre ?? p.nombre,
            descripcion: t.descripcion ?? p.descripcion,
          };
        });

        if (myToken !== renderToken) return;
        listaDiv.innerHTML = '';

        const fontBody = temaActual.fontbodyfamily ? `'${temaActual.fontbodyfamily}', 'Kanit', sans-serif` : '';
        const alphaItem = 1 - Math.min(Math.max(Number(temaActual.item_overlay) || 0, 0), 80) / 100;
        const itemBgColor = temaActual.item_bg_color || '#ffffff';
        const toRgba = (color, a) => {
          const alpha = Math.min(Math.max(a, 0), 1);
          if (!color) return `rgba(0,0,0,${alpha})`;
          if (color.startsWith('rgb')) {
            const parts = color.replace(/rgba?\(|\)/g, '').split(',').map((v) => v.trim());
            const [r = 0, g = 0, b = 0] = parts;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
          const hex = color.replace('#', '');
          const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
          const num = parseInt(full, 16);
          const r = (num >> 16) & 255;
          const g = (num >> 8) & 255;
          const b = num & 255;
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        const itemBg = toRgba(itemBgColor, alphaItem);
        const alignVal = (temaActual.productoAlign || 'left').toLowerCase();
        const alignItems = alignVal === 'center' ? 'center' : 'flex-start';
        const textAlign = alignVal === 'center' ? 'center' : 'left';

        for (const p of productos) {
          const priceTxt = Number.isFinite(Number(p.precio)) ? Number(p.precio).toFixed(2) : (p.precio ?? '');
          productosById.set(p.id, p);
          const div = document.createElement('div');
          div.className = 'rounded-lg shadow p-4 mb-2 flex gap-4';
          div.style.backgroundColor = itemBg;

          const imagenHTML = p.imagen
            ? `
              <div class="w-24 h-24 flex-shrink-0">
                 <img src="https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${p.imagen}" 
                       alt="${p.nombre}" class="w-full h-full object-cover rounded cursor-pointer"
                       onclick="ampliarImagen('${p.imagen}')">
                </div>
              `
            : '';

          div.innerHTML = `
            ${imagenHTML}
            <div class="flex flex-col justify-between" style="text-align:${textAlign};align-items:${alignItems};width:100%;flex:1;">
              <div class="w-full">
                <h3 class="text-xl font-semibold" style="color:${temaActual.colortitulo};${fontBody ? `font-family:${fontBody};` : ''}">${p.nombre}</h3>
                <p class="text-base leading-5 font-light" style="color:${temaActual.colortexto};${fontBody ? `font-family:${fontBody};` : ''}">${p.descripcion || ''}</p>
              </div>
              <div class="mt-2 w-full flex items-center justify-between gap-2 product-actions">
                <div class="font-bold text-xl" style="color:${temaActual.colorprecio};${fontBody ? `font-family:${fontBody};` : ''}">$${priceTxt}</div>
              </div>
            </div>
          `;

          if (allowOrdering) {
            const actions = div.querySelector('.product-actions');
            if (actions) {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = 'text-sm font-semibold px-3 py-2 rounded-lg bg-black text-white';
              btn.textContent = 'Agregar';
              btn.addEventListener('click', () => updateCartItem(p.id, 1));
              actions.appendChild(btn);
            }
          }

          listaDiv.appendChild(div);
        }
      } catch (e) {
        console.warn('Error traduciendo menú/productos:', e);
        const descTxt = (menu.descripcion || '').trim();
        if (descElLocal) descElLocal.textContent = descTxt;
        listaDiv.innerHTML = '';
      }
    };

    wrapper.appendChild(btn);
    wrapper.appendChild(productosContenedor);
    seccionesEl.appendChild(wrapper);
  }

  // Traduce solo títulos/descripciones de secciones según idioma actual
  await actualizarTitulosSecciones();

  const linkPerfil = document.getElementById('linkPerfilComercio');
  if (linkPerfil) {
    linkPerfil.href = `/perfilComercio.html?id=${idComercio}`;
    linkPerfil.setAttribute('aria-label', comercio.nombre || 'Perfil comercio');
  }
  if (footerNombreComercio) footerNombreComercio.textContent = comercio.nombre || '';
  if (footerLogoComercio) {
    const logoSrc = comercio.logo?.startsWith('http')
      ? comercio.logo
      : comercio.logo
      ? `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${comercio.logo}`
      : '';
    footerLogoComercio.src = logoSrc || '';
    footerLogoComercio.alt = comercio.nombre || 'Logo comercio';
  }
  if (footerTelefono) {
    const telefonoRaw = String(comercio.telefono || '').trim();
    if (telefonoRaw && telefonoRaw.toLowerCase() !== 'null') {
      footerTelefono.href = `tel:${telefonoRaw}`;
      footerTelefono.classList.remove('hidden');
    } else {
      footerTelefono.classList.add('hidden');
    }
  }
  if (footerFacebook) {
    if (comercio.facebook) {
      footerFacebook.href = comercio.facebook;
      footerFacebook.classList.remove('hidden');
    } else {
      footerFacebook.classList.add('hidden');
    }
  }
  if (footerInstagram) {
    if (comercio.instagram) {
      footerInstagram.href = comercio.instagram;
      footerInstagram.classList.remove('hidden');
    } else {
      footerInstagram.classList.add('hidden');
    }
  }

  const logoLink = document.getElementById('logoLinkPerfil');
  if (logoLink) {
    logoLink.href = `/perfilComercio.html?id=${idComercio}`;
  }
}

window.ampliarImagen = function (nombreImagen) {
  const modal = document.getElementById('modalImagen');
  const img = document.getElementById('imgAmpliada');
  if (!modal || !img) return;
  img.src = `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${nombreImagen}`;
  modal.classList.remove('hidden');
  if (modal) {
    modal.onclick = () => modal.classList.add('hidden');
  }
};

if (btnVolver) {
  btnVolver.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  mountLangSelector('#langSwitcherMenu');
  initOrderUi();
  cargarDatos();
});

window.addEventListener('lang:changed', async () => {
  await actualizarTitulosSecciones();
});

async function actualizarTitulosSecciones() {
  if (!menusBase.length) return;
  showGlobalLoader();
  const lang = getCurrentLang();
  try {
    for (const menu of menusBase) {
      const refs = menuButtons.get(menu.id);
      if (!refs) continue;
      const { titleEl, descEl } = refs;
      const trad = await getMenuI18n(menu.id, lang, { includeProductos: false });
      if (titleEl && trad?.menu?.titulo) titleEl.textContent = trad.menu.titulo;
      if (descEl) {
        const descTxt = (trad?.menu?.descripcion || menu.descripcion || '').trim();
        descEl.textContent = descTxt;
      }
    }
  } catch (err) {
    console.warn('No se pudieron traducir encabezados de menú:', err);
  } finally {
    hideGlobalLoader();
  }
}

function initOrderUi() {
  if (!idComercio) return;

  cartKey = `cart_${idComercio}_${orderMode}${mesaParam ? `_mesa_${mesaParam}` : ''}`;
  cartState = loadCartState();

  orderBanner = document.createElement('div');
  orderBanner.id = 'orderModeBanner';
  orderBanner.className = 'w-[90%] max-w-5xl mx-auto mt-2 mb-2 px-4 py-3 rounded-xl border text-sm';
  orderBanner.classList.add('hidden');

  const mainEl = document.getElementById('seccionesMenu');
  if (mainEl && mainEl.parentElement) {
    mainEl.parentElement.insertBefore(orderBanner, mainEl);
  }

  if (allowMesa) {
    orderBanner.textContent = mesaParam ? `Orden en mesa ${mesaParam}. Paga en el local.` : 'Orden en mesa. Paga en el local.';
    orderBanner.classList.remove('hidden');
    orderBanner.classList.add('bg-green-50', 'border-green-200', 'text-green-800');
  } else if (orderMode === 'pickup') {
    if (allowPickup) {
      orderBanner.textContent = 'Ordena y paga para recoger en el comercio.';
      orderBanner.classList.remove('hidden');
      orderBanner.classList.add('bg-blue-50', 'border-blue-200', 'text-blue-800');
    } else {
      orderBanner.textContent = 'La orden para recoger solo está disponible desde la app.';
      orderBanner.classList.remove('hidden');
      orderBanner.classList.add('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
    }
  }

  if (!allowOrdering) return;
  buildCartFab();
  buildCartDrawer();
  updateCartUi();
}

function buildCartFab() {
  cartFab = document.createElement('button');
  cartFab.id = 'cartFab';
  cartFab.type = 'button';
  cartFab.className = 'fixed z-40 right-4 bottom-24 sm:bottom-28 bg-black text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2';
  cartFab.innerHTML = '<i class="fa-solid fa-basket-shopping"></i><span>Carrito</span><span id="cartCount" class="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">0</span>';
  cartFab.addEventListener('click', () => {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('hidden');
  });
  document.body.appendChild(cartFab);
}

function buildCartDrawer() {
  cartDrawer = document.createElement('div');
  cartDrawer.id = 'cartDrawer';
  cartDrawer.className = 'fixed inset-0 z-50 hidden';
  cartDrawer.innerHTML = `
    <div data-cart-close class="absolute inset-0 bg-black/60"></div>
    <div class="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl p-4 max-h-[80vh] overflow-auto">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">Tu pedido</h3>
        <button type="button" data-cart-close class="text-gray-500 hover:text-gray-700">Cerrar</button>
      </div>
      <div id="cartItems" class="space-y-3"></div>
      <div class="mt-4 flex items-center justify-between text-base font-semibold">
        <span>Total</span>
        <span id="cartTotal">$0.00</span>
      </div>
      <button id="cartCheckout" type="button" class="mt-4 w-full bg-green-600 text-white py-3 rounded-lg font-semibold"></button>
    </div>
  `;
  cartDrawer.addEventListener('click', (e) => {
    const target = e.target;
    if (target?.closest('[data-cart-close]')) {
      cartDrawer.classList.add('hidden');
    }
  });
  cartDrawer.addEventListener('click', (e) => {
    const btn = e.target?.closest('[data-cart-action]');
    if (!btn) return;
    const id = Number(btn.getAttribute('data-id'));
    if (!Number.isFinite(id)) return;
    const action = btn.getAttribute('data-cart-action');
    if (action === 'inc') updateCartItem(id, 1);
    if (action === 'dec') updateCartItem(id, -1);
    if (action === 'remove') removeCartItem(id);
  });
  const checkoutBtn = cartDrawer.querySelector('#cartCheckout');
  if (checkoutBtn) {
    checkoutBtn.textContent = allowMesa ? 'Enviar orden a cocina' : 'Pagar y recoger';
    checkoutBtn.addEventListener('click', submitOrder);
  }
  document.body.appendChild(cartDrawer);
}

function loadCartState() {
  if (!cartKey || typeof localStorage === 'undefined') return { items: {} };
  try {
    const raw = localStorage.getItem(cartKey);
    if (!raw) return { items: {} };
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { items: {} };
    return { items: data.items || {} };
  } catch {
    return { items: {} };
  }
}

function saveCartState() {
  if (!cartKey || typeof localStorage === 'undefined') return;
  localStorage.setItem(cartKey, JSON.stringify(cartState));
}

function updateCartItem(idProducto, delta) {
  const key = String(idProducto);
  const current = cartState.items[key] || { idProducto, qty: 0 };
  const nextQty = Math.max(0, (current.qty || 0) + delta);
  if (nextQty === 0) {
    delete cartState.items[key];
  } else {
    cartState.items[key] = { idProducto, qty: nextQty };
  }
  saveCartState();
  updateCartUi();
}

function removeCartItem(idProducto) {
  const key = String(idProducto);
  delete cartState.items[key];
  saveCartState();
  updateCartUi();
}

function getCartItemsArray() {
  return Object.values(cartState.items || {}).filter((i) => Number.isFinite(Number(i.idProducto)) && Number(i.qty) > 0);
}

function updateCartUi() {
  if (!cartFab || !cartDrawer) return;
  const items = getCartItemsArray();
  const count = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const countEl = cartFab.querySelector('#cartCount');
  if (countEl) countEl.textContent = String(count);
  cartFab.classList.toggle('hidden', count === 0);

  const cartItemsEl = cartDrawer.querySelector('#cartItems');
  const cartTotalEl = cartDrawer.querySelector('#cartTotal');
  if (!cartItemsEl || !cartTotalEl) return;
  if (count === 0) {
    cartItemsEl.innerHTML = '<p class="text-sm text-gray-500">Tu carrito está vacío.</p>';
    cartTotalEl.textContent = '$0.00';
    return;
  }

  let total = 0;
  cartItemsEl.innerHTML = '';
  items.forEach((item) => {
    const product = productosById.get(Number(item.idProducto));
    const price = Number(product?.precio) || 0;
    total += price * Number(item.qty);
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-3';
    row.innerHTML = `
      <div class="flex-1">
        <div class="font-medium text-sm">${product?.nombre || `Producto ${item.idProducto}`}</div>
        <div class="text-xs text-gray-500">$${price.toFixed(2)}</div>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" data-cart-action="dec" data-id="${item.idProducto}" class="w-7 h-7 rounded-full border text-sm">-</button>
        <span class="min-w-[20px] text-center text-sm">${item.qty}</span>
        <button type="button" data-cart-action="inc" data-id="${item.idProducto}" class="w-7 h-7 rounded-full border text-sm">+</button>
      </div>
      <button type="button" data-cart-action="remove" data-id="${item.idProducto}" class="text-xs text-gray-400">Quitar</button>
    `;
    cartItemsEl.appendChild(row);
  });
  cartTotalEl.textContent = `$${total.toFixed(2)}`;
}

async function submitOrder() {
  const items = getCartItemsArray();
  if (!items.length) return;
  const payload = {
    idComercio: Number(idComercio),
    items: items.map((i) => ({ idProducto: Number(i.idProducto), qty: Number(i.qty) })),
    mode: orderMode,
    mesa: mesaParam || null,
    source: orderSource,
    idempotencyKey: `order_${idComercio}_${orderMode}_${mesaParam || 'na'}_${Date.now()}`,
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || SUPABASE_ANON_KEY;
    const resp = await fetch(`${FUNCTIONS_BASE}/clover-create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = json?.error || json?.details?.message || `Error creando orden (${resp.status})`;
      alert(msg);
      return;
    }

    if (orderMode === 'pickup') {
      const url = json?.checkout_url || json?.order?.checkout_url;
      if (url) {
        window.location.href = url;
        return;
      }
      alert('No se pudo obtener el enlace de pago.');
      return;
    }

    alert('Orden enviada. El pago se realiza en el local.');
    cartState = { items: {} };
    saveCartState();
    updateCartUi();
    if (cartDrawer) cartDrawer.classList.add('hidden');
  } catch (err) {
    alert(err?.message || 'Error inesperado al enviar la orden.');
  }
}
