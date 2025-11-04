import { supabase } from '../shared/supabaseClient.js';
import { calcularTiemposParaLista } from './calcularTiemposParaLista.js';
import { mostrarCercanosComida } from './cercanosComida.js';
import { mostrarPlayasCercanas } from './playasCercanas.js';
import { mostrarLugaresCercanos } from './lugaresCercanos.js';

const idComercio = new URLSearchParams(window.location.search).get('id');
let latUsuario = null;
let lonUsuario = null;
const isLocalHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
const loginPath = isLocalHost ? '/public/logearse.html' : '/logearse.html';

async function cargarCuponesComercio(idComercio) {
  const seccion = document.getElementById('seccionCupones');
  const contenedor = document.getElementById('cuponContainer');
  const mensaje = document.getElementById('cuponMensaje');
  if (!seccion || !contenedor || !mensaje) return;

  contenedor.innerHTML = '';
  mensaje.classList.add('hidden');
  seccion.classList.add('hidden');

  const hoyISO = new Date().toISOString();
  const { data: cupones, error } = await supabase
  .from('cupones')
  .select('*')
  .eq('idComercio', idComercio)
  .eq('activo', true)
  .gte('fechafin', new Date().toISOString())
  .order('fechainicio', { ascending: false });

if (error) {
  console.error('❌ Error cargando cupones del comercio:', error);
  return;
}

if (!cupones || cupones.length === 0) {
  mensaje.textContent = 'No hay cupones disponibles en este momento.';
  mensaje.classList.remove('hidden');
  return;
}

  const { data: { user } } = await supabase.auth.getUser();
  console.log('Cupones del comercio:', cupones);
  console.log('Usuario actual (cupones):', user?.id);

  const cuponIds = cupones.map((c) => c.id);
  const guardadosMap = new Map();
  const totalesMap = new Map();

  if (cuponIds.length) {
    const { data: totalesData, error: totalesError } = await supabase
      .from('cuponesUsuarios')
      .select('idCupon')
      .in('idCupon', cuponIds);

    if (totalesError) {
      console.error('❌ Error obteniendo uso de cupones:', totalesError);
    } else {
      (totalesData || []).forEach((row) => {
        totalesMap.set(row.idCupon, (totalesMap.get(row.idCupon) || 0) + 1);
      });
    }
  }

  if (user && cuponIds.length) {
    const { data: guardadosData, error: guardadosError } = await supabase
      .from('cuponesUsuarios')
      .select('idCupon, codigoqr, redimido, fechaRedimido')
      .eq('idUsuario', user.id)
      .in('idCupon', cuponIds);

    if (guardadosError) {
      console.error('❌ Error consultando cupones guardados del usuario:', guardadosError);
    } else {
      (guardadosData || []).forEach((row) => {
        guardadosMap.set(row.idCupon, row);
      });
    }
  }

  contenedor.innerHTML = '';

  cupones.forEach((cupon) => {
    const card = document.createElement('div');
    card.className = 'border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col gap-3 bg-white';

    if (cupon.imagen) {
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'relative rounded-md overflow-hidden h-40';
      const img = document.createElement('img');
      img.src = cupon.imagen;
      img.alt = cupon.titulo || 'Cupón';
      img.className = 'w-full h-full object-cover';
      imgWrapper.appendChild(img);
      card.appendChild(imgWrapper);
    }

    const tituloEl = document.createElement('h3');
    tituloEl.className = 'text-lg font-semibold text-[#424242]';
    tituloEl.textContent = cupon.titulo || 'Cupón';
    card.appendChild(tituloEl);

    if (cupon.descripcion) {
      const descEl = document.createElement('p');
      descEl.className = 'text-sm text-gray-600';
      descEl.textContent = cupon.descripcion;
      card.appendChild(descEl);
    }

    if (cupon.descuento != null) {
      const desc = document.createElement('p');
      desc.className = 'text-sm font-medium text-green-600';
      desc.textContent = `Descuento: ${cupon.descuento}%`;
      card.appendChild(desc);
    }

    const fechasEl = document.createElement('p');
    fechasEl.className = 'text-xs text-gray-500';
    fechasEl.textContent = `Válido del ${cupon.fechaInicio?.slice(0, 10) || '--'} al ${cupon.fechaFin?.slice(0, 10) || '--'}`;
    card.appendChild(fechasEl);

    const disponiblesTotal = cupon.cantidadDisponible ?? 0;
    const usados = totalesMap.get(cupon.id) || 0;
    const agotado = disponiblesTotal > 0 && usados >= disponiblesTotal;

    const estadoRow = document.createElement('div');
    estadoRow.className = 'flex items-center justify-between text-xs text-gray-500';
    const cantidadTexto = disponiblesTotal > 0
      ? `Disponibles: ${Math.max(disponiblesTotal - usados, 0)} de ${disponiblesTotal}`
      : 'Disponibilidad ilimitada';
    estadoRow.innerHTML = `<span>${cantidadTexto}</span>`;
    card.appendChild(estadoRow);

    const acciones = document.createElement('div');
    acciones.className = 'mt-2';

    const guardado = guardadosMap.get(cupon.id);
    console.log('Guardado encontrado:', cupon.id, guardado);

    if (!user) {
      const btnLogin = document.createElement('button');
      btnLogin.type = 'button';
      btnLogin.className = 'px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition w-full';
      btnLogin.textContent = 'Guardar cupón';
      btnLogin.addEventListener('click', () => {
        window.location.href = loginPath;
      });
      acciones.appendChild(btnLogin);
    } else if (guardado) {
      const estado = document.createElement('span');
      estado.className = guardado.redimido
        ? 'inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full'
        : 'inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full';
      estado.textContent = guardado.redimido ? 'Redimido' : 'Ya guardado';
      acciones.appendChild(estado);
    } else if (agotado) {
      const agotadoEl = document.createElement('span');
      agotadoEl.className = 'inline-flex items-center px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full';
      agotadoEl.textContent = 'Agotado';
      acciones.appendChild(agotadoEl);
    } else {
      const btnGuardar = document.createElement('button');
      btnGuardar.type = 'button';
      btnGuardar.className = 'px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition w-full';
      btnGuardar.textContent = 'Guardar cupón';
      btnGuardar.addEventListener('click', async () => {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';
        try {
          const codigoqr = crypto.randomUUID();
          console.log('Generando QR para cupón:', cupon.id, codigoqr);
          const { error: insertError } = await supabase
            .from('cuponesUsuarios')
            .insert({
              idCupon: cupon.id,
              idUsuario: user.id,
              codigoqr,
              redimido: false,
              fechaGuardado: new Date().toISOString()
            });

          if (insertError) {
            if (insertError.code === '23505') {
              alert('Ya guardaste este cupón.');
            } else {
              console.error('❌ Error guardando cupón:', insertError);
              alert('Ocurrió un error al guardar el cupón.');
            }
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar cupón';
            return;
          }

          guardadosMap.set(cupon.id, { redimido: false, codigoqr });
          totalesMap.set(cupon.id, (totalesMap.get(cupon.id) || 0) + 1);
          btnGuardar.remove();
          const estado = document.createElement('span');
          estado.className = 'inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full';
          estado.textContent = 'Ya guardado';
          acciones.appendChild(estado);
          estadoRow.innerHTML = `<span>${disponiblesTotal > 0 ? `Disponibles: ${Math.max(disponiblesTotal - (totalesMap.get(cupon.id) || 0), 0)} de ${disponiblesTotal}` : 'Disponibilidad ilimitada'}</span>`;
        } catch (error) {
          console.error('🛑 Error inesperado guardando cupón:', error);
          alert('No se pudo guardar el cupón. Intenta nuevamente.');
          btnGuardar.disabled = false;
          btnGuardar.textContent = 'Guardar cupón';
        }
      });
      acciones.appendChild(btnGuardar);
    }

    card.appendChild(acciones);
    contenedor.appendChild(card);
  });

  seccion.classList.remove('hidden');
}

async function mostrarSucursales(idComercio, nombreComercio) {
  const { data: relaciones, error: errorRelaciones } = await supabase
    .from('ComercioSucursales')
    .select('comercio_id, sucursal_id')
    .or(`comercio_id.eq.${idComercio},sucursal_id.eq.${idComercio}`);

  if (errorRelaciones) {
    console.error('Error consultando relaciones de sucursales:', errorRelaciones);
    return;
  }

  if (!relaciones || relaciones.length === 0) return;

  const idsRelacionados = relaciones.flatMap(r => [r.comercio_id, r.sucursal_id]);
  const idsUnicos = [...new Set(idsRelacionados.filter(id => id !== parseInt(idComercio)))];

  const { data: sucursales, error: errorSucursales } = await supabase
    .from('Comercios')
    .select('id, nombre, nombreSucursal')
    .in('id', idsUnicos);

  if (errorSucursales) {
    console.error('Error consultando sucursales:', errorSucursales);
    return;
  }

  if (!sucursales || sucursales.length === 0) return;

  const contenedor = document.getElementById('listaSucursales');
  const wrapper = document.getElementById('sucursalesContainer');
  if (!contenedor || !wrapper) return;

  sucursales.forEach(sucursal => {
    const btn = document.createElement('button');
    btn.textContent = sucursal.nombreSucursal || sucursal.nombre;
    btn.className = 'px-3 py-2 m-1 bg-red-600 text-white rounded-full text-base font-medium hover:bg-red-700 transition';
    btn.onclick = () => window.location.href = `perfilComercio.html?id=${sucursal.id}`;
    contenedor.appendChild(btn);
  });

  const titulo = document.getElementById('tituloSucursales');
  if (titulo) titulo.textContent = `Otras Sucursales de ${nombreComercio}`;

  wrapper.classList.remove('hidden');
}

export async function obtenerComercioPorID(idComercio) {
  const { data, error } = await supabase
    .from('Comercios')
    .select(`
      *,
      ComercioCategorias ( idCategoria )
    `)
    .eq('id', idComercio)
    .single();

  if (error || !data) {
    console.error('Error cargando comercio:', error);
    return null;
  }

  document.getElementById('nombreComercio').textContent = data.nombre;
  if (data.nombreSucursal) {
    document.getElementById('nombreSucursal').textContent = data.nombreSucursal;
  }
  document.getElementById('textoDireccion').textContent = data.direccion;

  // ✅ Mostrar teléfono solo si NO es categoría Jangueo (id 11)
  const esJangueo = data.ComercioCategorias?.some((c) => c.idCategoria === 11);
  const telefonoElemento = document.getElementById('telefonoComercio');

  if (!esJangueo && data.telefono) {
    telefonoElemento.innerHTML = `<i class="fa-solid fa-phone text-xl"></i> ${data.telefono}`;
    telefonoElemento.href = `tel:${data.telefono}`;
  } else if (telefonoElemento) {
    telefonoElemento.classList.add('hidden');
  }

  document.getElementById('nombreCercanosComida').textContent = data.nombre;

  if (data.whatsapp) document.getElementById('linkWhatsapp')?.setAttribute('href', data.whatsapp);
  if (data.facebook) document.getElementById('linkFacebook')?.setAttribute('href', data.facebook);
  if (data.instagram) document.getElementById('linkInstagram')?.setAttribute('href', data.instagram);
  if (data.tiktok) document.getElementById('linkTikTok')?.setAttribute('href', data.tiktok);
  if (data.webpage) document.getElementById('linkWeb')?.setAttribute('href', data.webpage);
  if (data.email) document.getElementById('linkEmail')?.setAttribute('href', `mailto:${data.email}`);

  const { data: imagenLogo } = await supabase
    .from('imagenesComercios')
    .select('imagen')
    .eq('idComercio', idComercio)
    .eq('logo', true)
    .maybeSingle();

  if (imagenLogo?.imagen) {
    const url = supabase.storage.from('galeriacomercios').getPublicUrl(imagenLogo.imagen).data.publicUrl;
    document.getElementById('logoComercio').src = url;
  }

  if (latUsuario && lonUsuario && data.latitud && data.longitud) {
    const [conTiempo] = await calcularTiemposParaLista([data], {
      lat: latUsuario,
      lon: lonUsuario
    });

    if (conTiempo?.tiempoVehiculo) {
      document.getElementById('tiempoVehiculo').innerHTML = `<i class="fas fa-car"></i> ${conTiempo.tiempoVehiculo}`;
    }

    const googleMapsURL = `https://www.google.com/maps/search/?api=1&query=${data.latitud},${data.longitud}`;
    const wazeURL = `https://waze.com/ul?ll=${data.latitud},${data.longitud}&navigate=yes`;

    document.getElementById('btnGoogleMaps').href = googleMapsURL;
    document.getElementById('btnWaze').href = wazeURL;
  }

  if (data.tieneSucursales) await mostrarSucursales(idComercio, data.nombre);

  await cargarCuponesComercio(idComercio);

  return data;
}

navigator.geolocation.getCurrentPosition(
  async (pos) => {
    latUsuario = pos.coords.latitude;
    lonUsuario = pos.coords.longitude;
    const comercio = await obtenerComercioPorID(idComercio);
    if (comercio) {
      mostrarCercanosComida(comercio);
      mostrarPlayasCercanas(comercio);
      mostrarLugaresCercanos(comercio);
    }
  },
  async () => {
    console.warn('❗ Usuario no permitió ubicación.');
    const comercio = await obtenerComercioPorID(idComercio);
    if (comercio) {
      mostrarCercanosComida(comercio);
      mostrarPlayasCercanas(comercio);
      mostrarLugaresCercanos(comercio);
    }
  }
);
