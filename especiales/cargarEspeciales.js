console.log('🚀 Inició cargarEspeciales.js');
import { supabase } from '../js/supabaseClient.js';
import { renderizarEspeciales } from './renderEspeciales.js';
import { obtenerImagenEspecial } from './renderImagenesEspecial.js';

async function cargarEspecialesDelDia() {
  const hoy = new Date().getDay(); // 0 = domingo

  const { data: especiales, error } = await supabase
    .from('especialesDia')
    .select('id, nombre, descripcion, precio, tipo, diasemana, imagen, activo, idcomercio')
    .eq('activo', true)
    .eq('diasemana', hoy);

  if (error) {
    console.error('🛑 Error cargando especiales:', error.message);
    return;
  }

  const agrupados = {};

  for (const especial of especiales) {
    const comercioId = especial.idcomercio;

    if (!agrupados[comercioId]) {
      const { data: comercio } = await supabase
        .from('Comercios')
        .select('id, nombre')
        .eq('id', comercioId)
        .single();

      const { data: logoData } = await supabase
        .from('imagenesComercios')
        .select('imagen')
        .eq('idComercio', comercioId)
        .eq('logo', true)
        .maybeSingle();

      agrupados[comercioId] = {
        comercio: {
          id: comercio?.id,
          nombre: comercio?.nombre || 'Comercio',
          logo: logoData?.imagen
            ? `https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios/${logoData.imagen}`
            : null
        },
        especiales: []
      };
    }

    const imagenEspecial = await obtenerImagenEspecial(especial.id);
    agrupados[comercioId].especiales.push({
      ...especial,
      imagen: imagenEspecial
    });
  }

  const listaAgrupada = Object.values(agrupados);
  renderizarEspeciales(listaAgrupada);
}

document.addEventListener('DOMContentLoaded', cargarEspecialesDelDia);
