export function cardLugarSlide(lugar) {
  const {
    nombre,
    municipio,
    tiempoTexto = '',
  } = lugar;

  const card = document.createElement("div");
  card.className = `
    block w-40 shrink-0 rounded-xl overflow-hidden shadow bg-white relative
  `.trim();

  const urlImagen = lugar.imagen || 'https://placehold.co/200x120?text=Lugar';

  card.innerHTML = `
    <div class="w-full h-24 relative bg-gray-200">
      <img src="${urlImagen}" alt="Imagen de ${nombre}" class="w-full h-full object-cover" />
    </div>
    <div class="pt-2 px-2 pb-2 text-center">
      <h3 class="text-sm font-semibold leading-tight h-10 overflow-hidden text-ellipsis line-clamp-2">${nombre}</h3>
      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-map-pin text-sky-600"></i>
        <span>${municipio}</span>
      </div>
      <div class="flex items-center justify-center gap-1 text-[11px] text-gray-600 mt-1">
        <i class="fas fa-car text-red-500"></i>
        <span>${tiempoTexto || 'N/A'}</span>
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    window.location.href = `perfilComercio.html?id=${lugar.id}`;
  });

  return card;
}