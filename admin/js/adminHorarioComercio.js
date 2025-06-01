// adminHorariosComercio.js
import { supabase } from './supabaseClient.js';
import { idComercio } from './mainAdmin.js';

const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export async function cargarHorariosComercio() {
  const container = document.getElementById("horariosContainer");
  if (!container) return;

  const { data: horarios, error } = await supabase
    .from("horarios")
    .select("*")
    .eq("idComercio", idComercio);

  if (error) {
    console.error("Error cargando horarios:", error);
    container.innerHTML = "<p>Error al cargar horarios</p>";
    return;
  }

  container.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const horarioDia = horarios.find(h => h.diaSemana === i) || {
      apertura: "09:00",
      cierre: "17:00",
      cerrado: false
    };

    const div = document.createElement("div");
    div.className = "flex items-center gap-4 bg-white rounded p-3 shadow";

    div.innerHTML = `
      <label class="w-24 font-semibold">${diasSemana[i]}</label>
      <input type="time" id="apertura-${i}" class="border rounded p-1" value="${horarioDia.apertura || "09:00"}">
      <input type="time" id="cierre-${i}" class="border rounded p-1" value="${horarioDia.cierre || "17:00"}">
      <label class="ml-4 flex items-center gap-2">
        <input type="checkbox" id="cerrado-${i}" ${horarioDia.cerrado ? "checked" : ""}> Cerrado
      </label>
    `;

    container.appendChild(div);
  }
}

export async function guardarHorariosComercio() {
  for (let i = 0; i < 7; i++) {
    const apertura = document.getElementById(`apertura-${i}`).value;
    const cierre = document.getElementById(`cierre-${i}`).value;
    const cerrado = document.getElementById(`cerrado-${i}`).checked;

    const { data: existente } = await supabase
      .from("horarios")
      .select("id")
      .eq("idComercio", idComercio)
      .eq("diaSemana", i)
      .maybeSingle();

    if (existente) {
      await supabase.from("horarios").update({ apertura, cierre, cerrado }).eq("id", existente.id);
    } else {
      await supabase.from("horarios").insert({ idComercio, diaSemana: i, apertura, cierre, cerrado });
    }
  }

  console.log("Horarios guardados ✅");
}

