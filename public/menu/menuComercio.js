// menu/menuComercio.js
import { supabase } from '../shared/supabaseClient.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
const seccionesEl = document.getElementById('seccionesMenu');
const btnVolver = document.getElementById('btnVolver');
const btnMenuPdf = document.getElementById('btnMenuPdf');
const heroPortada = document.getElementById('heroPortada');
const heroOverlay = document.getElementById('heroOverlay');
const heroImg = document.getElementById('heroImg');
const heroNombre = document.getElementById('heroNombre');
const heroMenuWord = document.getElementById('heroMenuWord');
const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const DEFAULT_TEMA = {
  colortexto: '#1f2937',
  colortitulo: '#111827',
  colorprecio: '#2563eb',
  colorboton: '#2563eb',
  colorbotontexto: '#ffffff',
  overlayoscuro: 40,
  pdfurl: '',
  portadaimagen: '',
  backgroundimagen: '',
  backgroundcolor: '#ffffff',
  textomenu: 'Menú',
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
};

let temaActual = { ...DEFAULT_TEMA };
let linkFuente = null;
let coverUrl = '';
let backgroundUrl = '';
const fontLinks = new Set();

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
  document.body.style.fontFamily = `'${fuente.name}', 'Kanit', sans-serif`;
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
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundColor = t.backgroundcolor || '#ffffff';
  }
}

async function cargarTema() {
  const { data, error } = await supabase
    .from('menu_tema')
    .select('colortexto,colortitulo,colorprecio,colorboton,colorbotontexto,overlayoscuro,pdfurl,portadaimagen,backgroundimagen,backgroundcolor,textomenu,fontbodyfamily,fontbodyurl,fonttitlefamily,fonttitleurl,fontnombrefamily,fontnombreurl,fontmenuwordfamily,fontmenuwordurl,nombre_shadow,nombre_stroke_width,nombre_stroke_color,menu_shadow,menu_stroke_width,menu_stroke_color,titulos_shadow,titulos_stroke_width,titulos_stroke_color,boton_shadow,boton_stroke_width,boton_stroke_color,item_bg_color,item_overlay')
    .eq('idcomercio', idComercio)
    .maybeSingle();

  if (error) {
    console.warn('No se pudo cargar tema de menú:', error?.message || error);
  }

  temaActual = { ...DEFAULT_TEMA, ...(data || {}) };

  // background/portada
  if (temaActual.portadaimagen) {
    if (temaActual.portadaimagen.startsWith('http')) {
      coverUrl = temaActual.portadaimagen;
    } else {
      coverUrl =
        supabase.storage.from('galeriacomercios').getPublicUrl(temaActual.portadaimagen).data?.publicUrl || '';
    }
  } else {
    coverUrl = '';
  }

  if (temaActual.backgroundimagen) {
    backgroundUrl = temaActual.backgroundimagen.startsWith('http')
      ? temaActual.backgroundimagen
      : supabase.storage.from('galeriacomercios').getPublicUrl(temaActual.backgroundimagen).data?.publicUrl || '';
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

  if (btnMenuPdf) {
    if (temaActual.pdfurl) {
      btnMenuPdf.href = temaActual.pdfurl;
      btnMenuPdf.classList.remove('hidden');
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
    .select('id, nombre, colorPrimario, colorSecundario')
    .eq('id', idComercio)
    .single();

  if (errorComercio || !comercio) return alert('Error cargando comercio');

  if (heroNombre) {
    heroNombre.textContent = comercio.nombre || heroNombre.textContent || '';
    heroNombre.style.color = temaActual.colortitulo;
    const strokeW = Number(temaActual.nombre_stroke_width) || 0;
    heroNombre.style.webkitTextStroke = strokeW > 0 ? `${strokeW}px ${temaActual.nombre_stroke_color || '#000'}` : '';
    heroNombre.style.textShadow = temaActual.nombre_shadow || '';
    heroNombre.style.fontFamily = temaActual.fontnombrefamily
      ? `'${temaActual.fontnombrefamily}', 'Kanit', sans-serif`
      : '';
  }
  if (heroMenuWord) {
    heroMenuWord.textContent = temaActual.textomenu || heroMenuWord.textContent || 'Menú';
    heroMenuWord.style.color = temaActual.colortitulo;
    const strokeW = Number(temaActual.menu_stroke_width) || 0;
    heroMenuWord.style.webkitTextStroke = strokeW > 0 ? `${strokeW}px ${temaActual.menu_stroke_color || '#000'}` : '';
    heroMenuWord.style.textShadow = temaActual.menu_shadow || '';
    heroMenuWord.style.fontFamily = temaActual.fontmenuwordfamily
      ? `'${temaActual.fontmenuwordfamily}', 'Kanit', sans-serif`
      : '';
  }
  document.body.style.setProperty('--colorPrimario', comercio.colorPrimario || '#23b4e9');
  document.body.style.setProperty('--colorSecundario', comercio.colorSecundario || '#f5f5f5');

  if (heroPortada) {
    const alpha = Math.min(Math.max(Number(temaActual.overlayoscuro) || 0, 0), 80) / 100;
    if (heroOverlay) heroOverlay.style.backgroundColor = `rgba(0,0,0,${alpha})`;
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
    .select('id, titulo, orden')
    .eq('idComercio', idComercio)
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (errorMenus) return alert('Error cargando menú');

  if (!seccionesEl) {
    console.warn('[menu] Contenedor de secciones no encontrado');
    return;
  }
  // Asegura color de texto base para legibilidad sobre fondos
  seccionesEl.style.color = temaActual.colortexto || '#1f2937';

  seccionesEl.innerHTML = '';
  let seccionActiva = null;

  for (const menu of menus) {
    const wrapper = document.createElement('div');
    wrapper.className = 'w-[90%] mx-auto';

    const btn = document.createElement('button');
    btn.className = 'w-full text-xl px-4 py-2 rounded mb-2 shadow font-medium hover:opacity-90 transition text-center';
    btn.textContent = menu.titulo;
    btn.style.backgroundColor = temaActual.colorboton || '#2563eb';
    btn.style.color = temaActual.colorbotontexto || '#ffffff';
    const strokeBtn = Number(temaActual.boton_stroke_width) || 0;
    btn.style.webkitTextStroke = strokeBtn > 0 ? `${strokeBtn}px ${temaActual.boton_stroke_color || '#000'}` : '';
    btn.style.textShadow = temaActual.boton_shadow || '';

    const productosContenedor = document.createElement('div');
    productosContenedor.className = 'hidden mt-2 space-y-2';

    btn.onclick = async () => {
      if (seccionActiva === productosContenedor) {
        productosContenedor.classList.add('hidden');
        seccionActiva = null;
        return;
      }
      if (seccionActiva) seccionActiva.classList.add('hidden');
      seccionActiva = productosContenedor;
      productosContenedor.innerHTML = '<p class="text-sm text-gray-500">Cargando...</p>';
      productosContenedor.classList.remove('hidden');

      const { data: productos, error } = await supabase
        .from('productos')
        .select('*')
        .eq('idMenu', menu.id)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (error) {
        productosContenedor.innerHTML = '<p class="text-red-500">Error cargando productos</p>';
        return;
      }

    productosContenedor.innerHTML = `
      <h2 class="text-center text-xl font-bold mb-4" style="color:${temaActual.colortitulo};">${menu.titulo}</h2>
    `;

    const alphaItem = 1 - Math.min(Math.max(Number(temaActual.item_overlay) || 0, 0), 80) / 100;
    const itemBgColor = temaActual.item_bg_color || '#ffffff';
    const toRgba = (color, a) => {
      const alpha = Math.min(Math.max(a, 0), 1);
      if (!color) return `rgba(0,0,0,${alpha})`;
      if (color.startsWith('rgb')) {
        const parts = color.replace(/rgba?\\(|\\)/g, '').split(',').map((v) => v.trim());
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

    for (const p of productos) {
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
          <div class="flex flex-col justify-between">
            <div>
              <h3 class="text-xl font-semibold" style="color:${temaActual.colortitulo};">${p.nombre}</h3>
              <p class="text-base leading-5 font-light" style="color:${temaActual.colortexto};">${p.descripcion || ''}</p>
            </div>
            <div class="font-bold text-xl mt-2" style="color:${temaActual.colorprecio};">$${p.precio.toFixed(2)}</div>
          </div>
        `;

        productosContenedor.appendChild(div);
      }
    };

    wrapper.appendChild(btn);
    wrapper.appendChild(productosContenedor);
    seccionesEl.appendChild(wrapper);
  }

  const linkPerfil = document.getElementById('linkPerfilComercio');
  linkPerfil.textContent = comercio.nombre;
  linkPerfil.href = `/perfilComercio.html?id=${idComercio}`;

  const logoLink = document.getElementById('logoLinkPerfil');
  if (logoLink) {
    logoLink.href = `/perfilComercio.html?id=${idComercio}`;
  }
}

window.ampliarImagen = function (nombreImagen) {
  const modal = document.getElementById('modalImagen');
  const img = document.getElementById('imgAmpliada');
  img.src = `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${nombreImagen}`;
  modal.classList.remove('hidden');
  modal.onclick = () => modal.classList.add('hidden');
};

btnVolver.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

document.addEventListener('DOMContentLoaded', cargarDatos);
