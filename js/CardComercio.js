export function cardComercio(comercio) {
  const div = document.createElement('div');
  div.className = `
    bg-white rounded-2xl shadow-md overflow-hidden 
    text-center transition-transform duration-300 hover:scale-[1.02]
  `;

  div.innerHTML = `
    <div class="relative">
      <img src="${comercio.imagenPortada}" alt="Portada de ${comercio.nombre}" 
        class="w-full h-40 object-cover" />

      <img src="${comercio.logo}" alt="Logo de ${comercio.nombre}"
        class="w-20 h-20 rounded-full absolute left-1/2 -bottom-10 transform -translate-x-1/2 
               bg-white object-contain shadow-md border-4 border-white z-10" />
    </div>

    <div class="pt-14 pb-4 px-3 text-center text-sm text-gray-700 font-sans">
      <h3 class="text-base font-bold text-gray-900 mb-2 leading-tight">${comercio.nombre}</h3>

      <a href="tel:${comercio.telefono}" 
         class="inline-block w-full text-white font-semibold bg-red-600 rounded-full px-4 py-1 mb-2 shadow hover:bg-red-700 transition text-sm">
        <i class="fa-solid fa-phone mr-1"></i>${comercio.telefono}
      </a>

      <div class="flex justify-center items-center gap-1 ${comercio.abierto ? 'text-green-600' : 'text-red-600'} font-medium mb-1 text-sm">
        <i class="fas fa-clock"></i> ${comercio.abierto ? 'Abierto Ahora' : 'Cerrado Ahora'}
      </div>

      <div class="flex justify-center items-center gap-1 text-blue-500 font-medium mb-1 text-sm">
        <i class="fas fa-map-marker-alt"></i> ${comercio.pueblo}
      </div>

      <div class="flex justify-center items-center gap-1 text-gray-500 font-medium text-sm">
        <i class="fas fa-car"></i> ${comercio.tiempoVehiculo}
      </div>
    </div>
  `;

  return div;
}