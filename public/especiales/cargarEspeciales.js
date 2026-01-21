console.log('🚀 Inició cargarEspeciales.js');
import { supabase } from '../shared/supabaseClient.js';
import { renderizarEspeciales } from './renderEspeciales.js';
import { mostrarCargando, mostrarError } from '../js/mensajesUI.js';

const contenedorAlmuerzos = document.getElementById('contenedorAlmuerzos');
const contenedorHappy = document.getElementById('contenedorHappy');

async function cargarEspecialesDelDia() {
  const hoy = new Date().getDay();

  if (contenedorAlmuerzos) {
    mostrarCargando(contenedorAlmuerzos, 'Cargando especiales...', '⏳');
  }
  if (contenedorHappy) {
    mostrarCargando(contenedorHappy, 'Cargando especiales...', '⏳');
  }

  const { data: especiales, error } = await supabase
    .from('especialesDia')
    .select('id, nombre, descripcion, precio, tipo, diasemana, imagen, activo, idcomercio')
    .eq('activo', true)
    .eq('diasemana', hoy);

  if (error) {
    console.error('🛑 Error cargando especiales:', error.message);
    if (contenedorAlmuerzos) {
      mostrarError(contenedorAlmuerzos, 'No pudimos cargar los especiales.', '⚠️');
    }
    if (contenedorHappy) {
      mostrarError(contenedorHappy, 'No pudimos cargar los especiales.', '⚠️');
    }
    return;
  }

  const agrupados = {};

  for (const especial of especiales) {
    const comercioId = especial.idcomercio;

    if (!agrupados[comercioId]) {
            const { data: comercio } = await supabase
        .from('Comercios')
        .select(`
          id,
          nombre,
          nombreComercio,
          nombreSucursal,
          municipio,
          pueblo,
          idCategoria,
          idSubcategoria
        `)
        .eq('id', comercioId)
        .single();

      const categorias = [];

      if (comercio?.idCategoria?.length > 0) {
        const { data: catData } = await supabase
          .from('Categorias')
          .select('nombre, id')
          .in('id', comercio.idCategoria);

        if (catData) {
          categorias.push(...catData.map(c => c.nombre));
        }
      }
      const { data: logoData } = await supabase
        .from('imagenesComercios')
        .select('imagen')
        .eq('idComercio', comercioId)
        .eq('logo', true)
        .maybeSingle();

            agrupados[comercioId] = {
        comercio: {
          id: comercio?.id,
          nombre: comercio?.nombre || comercio?.nombreComercio || comercio?.nombreSucursal || 'Comercio',
          municipio: comercio?.municipio || comercio?.pueblo || '',
          categorias: categorias,
          logo: logoData?.imagen
            ? `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${logoData.imagen}`
            : null
        },
        especiales: []
      };
    }

    agrupados[comercioId].especiales.push({
      ...especial,
      imagen: especial.imagen || null
    });
  }

  const listaAgrupada = Object.values(agrupados);
  renderizarEspeciales(listaAgrupada);
}

document.addEventListener('DOMContentLoaded', cargarEspecialesDelDia);
