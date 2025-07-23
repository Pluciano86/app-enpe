export function cardEventoSlide(evento) {
  const {
    id,
    nombre,
    municipioNombre,
    fecha,
    imagen,
    categoriaNombre = '',
    gratis,
    costo
  } = evento;

  const fechaObj = new Date(fecha);
  const fechaFormateada = fechaObj.toLocaleDateString("es-PR", {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  const card = document.createElement("div");
  card.className = `
    block w-40 shrink-0 rounded-xl overflow-hidden shadow bg-white relative
  `.trim();

  const urlImagen = imagen || 'https://placehold.co/200x120?text=Evento';

  card.innerHTML = `
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${urlImagen}" alt="Imagen de ${nombre}" class="w-full h-full object-cover" />
    </div>
    <div class="pt-2 px-2 pb-2 text-center">
      <h3 class="text-sm font-semibold leading-tight h-10 overflow-hidden text-ellipsis line-clamp-2">${nombre}</h3>
      <div class="text-[11px] text-gray-500 mt-1">${categoriaNombre}</div>
      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-calendar-days text-sky-600"></i>
        <span>${fechaFormateada}</span>
      </div>
      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-map-pin text-pink-600"></i>
        <span>${municipioNombre || 'Municipio'}</span>
      </div>
      <div class="text-xs font-bold mt-1 ${gratis ? 'text-green-600' : 'text-black'}">
        ${gratis ? 'Gratis' : costo || 'Costo no disponible'}
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    window.location.href = `perfilEvento.html?id=${id}`;
  });

  return card;
}