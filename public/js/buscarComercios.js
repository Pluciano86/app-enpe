import fetch from 'node-fetch';
import fs from 'fs';

const GOOGLE_API_KEY = 'AIzaSyBxfWTx5kMwy_2UcOnKhILbnLkbU4VMaBI';

// Coordenadas aproximadas de municipios de PR
const coordenadasMunicipios = {
  "Ponce": "17.9854,-66.6141",
  "San Juan": "18.4655,-66.1057",
  "Mayagüez": "18.2010,-67.1396",
  "Bayamón": "18.3986,-66.1557",
  "Arecibo": "18.4720,-66.7157",
  "Caguas": "18.2333,-66.0350",
  "Guayama": "17.9794,-66.1133",
  "Humacao": "18.1516,-65.8270"
  // Agrega más municipios según necesites
};

const municipio = 'Ponce'; // <-- Cambia aquí
const tipo = 'restaurant'; // <-- Cambia a 'bakery', 'bar', etc.

const location = coordenadasMunicipios[municipio];
const radius = 8000;

async function buscarComercios() {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${tipo}&key=${GOOGLE_API_KEY}`;
  const response = await fetch(searchUrl);
  const data = await response.json();

  if (data.status !== 'OK') {
    console.error('❌ Error:', data.status, data.error_message);
    return;
  }

  const resultados = data.results.map(c => ({
    nombre: c.name,
    direccion: c.vicinity || '',
    latitud: c.geometry.location.lat,
    longitud: c.geometry.location.lng,
    place_id: c.place_id
  }));

  const archivo = `resultados_${tipo}_${municipio}.json`;
  fs.writeFileSync(archivo, JSON.stringify(resultados, null, 2));
  console.log(`✅ Se guardaron ${resultados.length} comercios en ${archivo}`);
}

buscarComercios();
