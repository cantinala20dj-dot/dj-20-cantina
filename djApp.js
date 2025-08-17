// djApp.js — Panel del DJ con bloqueo por sucursal (password: Dj20cantina)

import { BRAND } from "./branding.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, query, where, onSnapshot,
  updateDoc, doc, onSnapshot as onDocSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- Firebase ---
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

// --- DOM ---
const loginBtn = document.getElementById("loginBtn");
const djPass = document.getElementById("djPass");
const requestsList = document.getElementById("requests");
const unitId = (BRAND.unitId || "general");

// Banner opcional si lo agregaste en dj.html:
// <div id="blockNotice" style="display:none;margin-bottom:10px;color:#ffb4b4">
//   ⚠️ Panel bloqueado por el administrador para esta sucursal.
// </div>
const blockNotice = document.getElementById("blockNotice");

// --- Utils ---
function tsToMillis(ts){
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return 0;
}

// --- 1) Escuchar en tiempo real el estado de bloqueo de la sucursal ---
let isBlocked = false;

onDocSnapshot(doc(db, "units", unitId), (snap) => {
  isBlocked = !!(snap.exists() && snap.data()?.blocked === true);
  // UI
  if (blockNotice) blockNotice.style.display = isBlocked ? "block" : "none";
  loginBtn.disabled = isBlocked;
  djPass.disabled = isBlocked;
}, (err) => {
  // Si hay error leyendo el doc, por seguridad NO bloqueamos el panel automáticamente.
  console.error("Error leyendo units/"+unitId, err);
  isBlocked = false;
  if (blockNotice) blockNotice.style.display = "none";
  loginBtn.disabled = false;
  djPass.disabled = false;
});

// --- 2) Login y suscripción a solicitudes pendientes ---
loginBtn.addEventListener("click", async () => {
  // Bloqueo activo → salir
  if (isBlocked) {
    alert(`Panel bloqueado para la sucursal: ${unitId}. Consulta al administrador.`);
    return;
  }

  // Password robusta (recorta espacios)
  const val = (djPass.value || "").trim();
  if (val !== "Dj20cantina") {
    alert("Contraseña incorrecta");
    return;
  }

  // Suscribir a solicitudes PENDIENTES de esta sucursal
  const q = query(
    collection(db, "requests"),
    where("unitId", "==", unitId),
    where("status", "==", "pending")
  );

  onSnapshot(q, (snapshot) => {
    // Agrupar por spotifyId; si no hay, por "canción|||artista"
    const groups = new Map();

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const name   = (d.song   || "").trim();
      const artist = (d.artist || "").trim();
      const keyBase =
        (d.spotifyId && String(d.spotifyId).trim()) ||
        (name && artist ? `${name}|||${artist}` : name) || "";
      const key = keyBase.toLowerCase();
      if (!key) return;

      if (!groups.has(key)) {
        groups.set(key, {
          docs: [],
          song: name,
          artist: artist,
          spotifyId: d.spotifyId || null,
          lastTs: 0
        });
      }
      const g = groups.get(key);
      g.docs.push(docSnap);
      g.lastTs = Math.max(g.lastTs, tsToMillis(d.timestamp));
    });

    // Orden: primero por cantidad desc, luego por más reciente
    const sorted = Array.from(groups.values()).sort((a,b)=>{
      const c = b.docs.length - a.docs.length;
      if (c !== 0) return c;
      return (b.lastTs || 0) - (a.lastTs || 0);
    });

    // Render
    requestsList.innerHTML = "";
    if (sorted.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No hay solicitudes pendientes.";
      requestsList.appendChild(empty);
      return;
    }

    sorted.forEach(g => {
      const count = g.docs.length;
      const li = document.createElement("li");

      // Título: Canción — Artista (ID opcional)
      const displayArtist = g.artist || "Artista desconocido";
      const title = document.createElement("span");
      title.textContent = `${g.song} — ${displayArtist}${g.spotifyId ? ` (ID: ${g.spotifyId})` : ""}`;

      // Badge 🔥 xN
      if (count > 1) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `🔥 x${count}`;
        li.appendChild(title);
        li.appendChild(badge);
      } else {
        li.appendChild(title);
      }

      // Botón Reproducida
      const btnPlayed = document.createElement("button");
      btnPlayed.textContent = "Reproducida";
      btnPlayed.className = "btn";
      btnPlayed.style.marginLeft = "10px";
      btnPlayed.onclick = async () => {
        await Promise.all(g.docs.map((d)=> updateDoc(doc(db, "requests", d.id), { status: "played" })));
      };

      // Botón Rechazada
      const btnRejected = document.createElement("button");
      btnRejected.textContent = "Rechazada";
      btnRejected.className = "btn secondary";
      btnRejected.style.marginLeft = "8px";
      btnRejected.onclick = async () => {
        await Promise.all(g.docs.map((d)=> updateDoc(doc(db, "requests", d.id), { status: "rejected" })));
      };

      li.appendChild(btnPlayed);
      li.appendChild(btnRejected);
      requestsList.appendChild(li);
    });
  });
});
