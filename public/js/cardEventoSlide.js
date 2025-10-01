function capitalizarPalabra(texto = '') {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function estilizarFechaExtendida(fechaLocale = '') {
  if (!fechaLocale) return '';
  const [primeraParte, ...resto] = fechaLocale.split(', ');
  const primera = capitalizarPalabra(primeraParte);
  let restoTexto = resto.join(', ');

  if (restoTexto) {
    restoTexto = restoTexto.replace(/ de ([a-záéíóúñ]+)/gi, (_, palabra) => ` de ${capitalizarPalabra(palabra)}`);
    restoTexto = restoTexto.replace(/\sde\s(\d{4})$/i, ' $1');
  }

  return restoTexto ? `${primera}, ${restoTexto}` : primera;
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'Sin fecha';
  const [year, month, day] = String(fechaStr).split('-').map(Number);
  if ([year, month, day].some((value) => Number.isNaN(value))) return 'Sin fecha';
  const fecha = new Date(Date.UTC(year, month - 1, day));
  const base = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
  return estilizarFechaExtendida(base);
}

function formatearHora(horaStr) {
  if (!horaStr) return '';
  const [hourPart, minutePart] = horaStr.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return '';
  const fecha = new Date(Date.UTC(1970, 0, 1, hour, minute));
  const base = fecha.toLocaleTimeString('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  });
  return base.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
}

function obtenerPartesFecha(fechaStr) {
  const completa = formatearFecha(fechaStr);
  if (!completa || completa === 'Sin fecha') return null;
  const [weekday, resto] = completa.split(', ');
  return {
    weekday: weekday || completa,
    resto: resto || ''
  };
}

export function cardEventoSlide(evento) {
  const {
    id,
    nombre,
    municipioNombre,
    fecha,
    imagen,
    categoriaNombre = '',
    categoriaIcono = '',
    horainicio,
    hora,
    gratis,
    costo
  } = evento;

  const fechaDetalle = obtenerPartesFecha(fecha);
  const horaBase = horainicio || hora || '';
  const horaFormateada = formatearHora(horaBase);
  const urlImagen = imagen || 'https://placehold.co/200x120?text=Evento';
  const costoTexto = gratis ? 'Gratis' : (costo || 'No disponible');
  const iconoHTML = categoriaIcono ? `<i class="fas ${categoriaIcono}"></i>` : '';

  const card = document.createElement('div');
  card.className = 'block w-40 shrink-0 rounded-xl overflow-hidden shadow bg-white relative';

  card.innerHTML = `
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${urlImagen}" alt="Imagen de ${nombre}" class="w-full h-full object-cover" />
    </div>
    <div class="pt-2 px-2 pb-3 text-center flex flex-col gap-2">
      <h3 class="flex items-center justify-center text-center text-sm font-bold line-clamp-2 h-12">${nombre}</h3>
      <div class="flex items-center justify-center gap-1 text-[12px] text-orange-500">
        ${iconoHTML}
        <span>${categoriaNombre}</span>
      </div>
      ${fechaDetalle ? `
        <div class="flex flex-col items-center justify-center gap-0 text-[12px] text-red-600 font-medium leading-tight">
          <span>${fechaDetalle.weekday}</span>
          <span>${fechaDetalle.resto}</span>
        </div>
      ` : `
        <div class="flex items-center justify-center gap-1 text-[12px] text-red-600 font-medium leading-tight">Sin fecha</div>
      `}
      ${horaFormateada ? `<div class="flex items-center justify-center gap-1 text-[12px] text-red-600">${horaFormateada}</div>` : ''}
      <div class="flex items-center justify-center gap-1 text-[12px] font-medium" style="color:#23B4E9;">
        <i class="fas fa-map-pin"></i>
        <span>${municipioNombre || 'Municipio'}</span>
      </div>
      <div class="flex items-center justify-center text-[12px] font-semibold text-green-600 mt-1">Costo: ${costoTexto}</div>
    </div>
  `;

  card.addEventListener('click', () => {
    window.location.href = `perfilEvento.html?id=${id}`;
  });

  return card;
}
