// menu/menuComercio.js
import { supabase } from '../shared/supabaseClient.js';
import { getMenuI18n } from '../shared/menuI18n.js';
import { mountLangSelector } from '../shared/langSelector.js';
import { getLang } from '../js/i18n.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
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
let renderToken = 0;
let seccionActivaId = null;
const menuButtons = new Map(); // idMenu -> { btn, titleEl, descEl }

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
              <div class="font-bold text-xl mt-2 w-full" style="color:${temaActual.colorprecio};${fontBody ? `font-family:${fontBody};` : ''}">$${priceTxt}</div>
            </div>
          `;

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
