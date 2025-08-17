import { BRAND } from "./branding.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJGgPddVWwKytKv8GlPvZ27vkqZfod-4U",
  authDomain: "dj-cantina-20.firebaseapp.com",
  projectId: "dj-cantina-20",
  storageBucket: "dj-cantina-20.firebasestorage.app",
  messagingSenderId: "777157429108",
  appId: "1:777157429108:web:de2efae209dcca67228e21"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const input = document.getElementById("songSearch");
const suggestions = document.getElementById("suggestions");
const sendBtn = document.getElementById("sendSong");
const status = document.getElementById("status");

// debounce
function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); } }

input.addEventListener("input", debounce(async () => {
  const query = input.value.trim();
  suggestions.innerHTML = "";
  if (!query) return;

  try {
    const res = await fetch(`/api/searchSpotify?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return;

    data.results.forEach(track => {
      const li = document.createElement("li");
      li.textContent = `${track.name} — ${track.artist}`;
      li.addEventListener("click", () => {
        input.value = track.name;
        input.dataset.spotifyId = track.id;
        suggestions.innerHTML = "";
      });
      suggestions.appendChild(li);
    });
  } catch(e){ console.error(e); }
}, 180));

sendBtn.addEventListener("click", async () => {
  const song = input.value.trim();
  const spotifyId = input.dataset.spotifyId || null;
  if (!song) return;

  try {
    await addDoc(collection(db, "requests"), {
      song, spotifyId,
      status: "pending",
      unitId: BRAND.unitId,             // ← guarda la sucursal
      timestamp: serverTimestamp()
    });
    status.textContent = "✅ Enviado con éxito. ¡Dale like a nuestro Instagram!";
    if (window._toast) window._toast("✅ ¡Solicitud enviada!");
    input.value = ""; input.dataset.spotifyId = ""; suggestions.innerHTML = "";
  } catch (error) {
    status.textContent = "❌ Error al enviar, intenta de nuevo.";
    console.error(error);
  }
});
