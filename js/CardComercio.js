export function cardComercio(comercio) {
  const div = document.createElement('div');
  div.className = `
    bg-white rounded-2xl shadow-md overflow-hidden 
    text-center transition-transform duration-300 hover:scale-[1.02]
  `;

  div.innerHTML = `
  <div class="relative">
    <img src="${comercio.imagenPortada}" alt="Portada de ${comercio.nombre}" 
      class="w-full h-20 object-cover" />

    <div class="relative w-full flex flex-col items-center pt-7 ">
      <img src="${comercio.logo}" alt="Logo de ${comercio.nombre}"
        class="w-20 h-20 rounded-full absolute left-1/2 -top-10 transform -translate-x-1/2 
               bg-white object-contain shadow-[0px_-22px_38px_-22px_rgba(0,_0,_0,_0.5)] border-4 border-white z-10" />

      <div class="relative h-12 w-full">
        <div class="absolute inset-0 flex items-center justify-center px-2 text-center">
          <h3 class="text-base font-bold text-gray-900 leading-tight line-clamp-2">
            ${comercio.nombre}
          </h3>
        </div>
      </div>
    </div>

    <a href="tel:${comercio.telefono}" 
   class="inline-flex items-center justify-center gap-2 text-white font-semibold bg-red-600 
          rounded-full px-6 py-1.5 mb-2 shadow hover:bg-red-700 transition text-sm mx-auto">
        <i class="fa-solid fa-phone"></i> ${comercio.telefono}
      </a>

    <div class="flex justify-center items-center gap-1 ${comercio.abierto ? 'text-green-600' : 'text-red-600'} font-medium mb-1 text-sm">
      <i class="fas fa-clock"></i> ${comercio.abierto ? 'Abierto Ahora' : 'Cerrado Ahora'}
    </div>

    <div class="flex justify-center items-center gap-1 text-blue-500 font-medium mb-1 text-sm">
      <i class="fas fa-map-marker-alt"></i> ${comercio.pueblo}
    </div>

    <div class="flex justify-center items-center gap-1 text-gray-500 font-medium text-sm mb-4">
      <i class="fas fa-car"></i> ${comercio.tiempoVehiculo}
    </div>

  </div>
`;

  return div;
}