// app.js — DJ’ Cantina 20: sugerencias + envío con verificación de bloqueo por unidad
import { BRAND, UNIT_ID, db } from "./branding.js";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// DOM
const input = document.getElementById("songSearch");
let suggestions = document.getElementById("suggestions");
const sendBtn = document.getElementById("sendSong");
const status = document.getElementById("status");

// Asegura <ul id="suggestions">
if (!suggestions) {
  suggestions = document.createElement("ul");
  suggestions.id = "suggestions";
  input.parentElement.style.position = "relative";
  input.parentElement.appendChild(suggestions);
}

// Utils
function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); } }
async function getJSON(url){ try{ const r=await fetch(url); if(!r.ok) return null; return await r.json(); }catch{ return null; } }

// Autocompletado (Spotify → iTunes → nada)
async function fetchSuggestions(q){
  const sp = await getJSON(`/api/searchSpotify?q=${encodeURIComponent(q)}`);
  if (sp?.results?.length) return sp.results;
  const it = await getJSON(`/api/searchiTunes?q=${encodeURIComponent(q)}`);
  if (it?.results?.length) return it.results;
  return [];
}

function renderList(items){
  suggestions.innerHTML="";
  items.forEach(track=>{
    const li=document.createElement("li");
    li.textContent = `${track.name} — ${track.artist || "Artista desconocido"}`;
    li.addEventListener("click", ()=>{
      input.value = track.name;
      input.dataset.spotifyId = track.id || "";
      input.dataset.artist = track.artist || "";
      suggestions.innerHTML=""; suggestions.style.display="none";
    });
    suggestions.appendChild(li);
  });
  suggestions.style.display = items.length ? "block" : "none";
}

input.addEventListener("input", debounce(async ()=>{
  const q = input.value.trim();
  input.dataset.spotifyId=""; input.dataset.artist="";
  suggestions.innerHTML=""; suggestions.style.display="none";
  if (!q) return;
  const list = await fetchSuggestions(q);
  renderList(list || []);
}, 140));

// 👉 Verifica bloqueo de unidad antes de enviar
async function isUnitBlocked(unitId){
  try{
    const snap = await getDoc(doc(db, "units", unitId));
    if (!snap.exists()) return false; // si no existe, tratamos como activa (branding.js la crea)
    return !!(snap.data()||{}).blocked;
  }catch{ return false; }
}

sendBtn.addEventListener("click", async ()=>{
  const song = input.value.trim();
  const spotifyId = input.dataset.spotifyId || null;
  const artist = input.dataset.artist || "";
  if (!song) return;

  // 1) Bloqueo
  if (await isUnitBlocked(UNIT_ID)){
    status.textContent = "🚫 Esta sucursal está temporalmente desactivada.";
    return;
  }

  // 2) Guardar solicitud
  try{
    await addDoc(collection(db, "requests"), {
      song, artist, spotifyId,
      status: "pending",
      unitId: UNIT_ID,
      timestamp: serverTimestamp()
    });
    status.textContent = "✅ Enviado con éxito. ¡Dale like a nuestro Instagram!";
    if (window._toast) window._toast("✅ ¡Solicitud enviada!");
    input.value=""; input.dataset.spotifyId=""; input.dataset.artist="";
    suggestions.innerHTML=""; suggestions.style.display="none";
  }catch(e){
    console.error(e);
    status.textContent = "❌ Error al enviar; intenta de nuevo.";
  }
});
