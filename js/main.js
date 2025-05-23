import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { cardComercio } from './CardComercio.js'

const supabaseUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnamF4YW5xZmt3ZXNsa3h0YXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNzk3NjgsImV4cCI6MjA2Mjg1NTc2OH0.Abif2Fu2uHyby--t_TAacEbjG8jCxmgsCbLx6AinT6c'
const supabase = createClient(supabaseUrl, supabaseKey)

const baseImageUrl = 'https://zgjaxanqfkweslkxtayt.supabase.co/storage/v1/object/public/galeriacomercios'
const diaActual = new Date().getDay()

async function cargarComercios() {
  const { data: comercios, error } = await supabase
    .from('Comercios')
    .select('*')
    .eq('activo', true)

  if (error) {
    console.error('Error cargando comercios:', error)
    return
  }

  const contenedor = document.getElementById('app')
  contenedor.innerHTML = ''

  for (const comercio of comercios) {
    const { data: portada } = await supabase
      .from('imagenesComercios')
      .select('imagen')
      .eq('idComercio', comercio.id)
      .eq('portada', true)
      .single()

    const { data: logo } = await supabase
      .from('imagenesComercios')
      .select('imagen')
      .eq('idComercio', comercio.id)
      .eq('logo', true)
      .single()

    const { data: horario } = await supabase
      .from('horarios')
      .select('apertura, cierre, cerrado')
      .eq('idComercio', comercio.id)
      .eq('diaSemana', diaActual)
      .single()

    const ahora = new Date()
    const horaActual = ahora.toTimeString().slice(0, 5)
    let abierto = false

    if (horario && !horario.cerrado) {
      abierto = horaActual >= horario.apertura && horaActual <= horario.cierre
    }

    const card = cardComercio({
      nombre: comercio.nombre,
      telefono: comercio.telefono,
      googleMap: comercio.googleMap,
      pueblo: comercio.municipio,
      tiempoVehiculo: "8 min",
      abierto: abierto,
      imagenPortada: portada ? `${baseImageUrl}/${portada.imagen}` : '',
      logo: logo ? `${baseImageUrl}/${logo.imagen}` : ''
    })

    contenedor.appendChild(card)
  }
}

cargarComercios()