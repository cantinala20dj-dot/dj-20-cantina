// djApp.js — Panel del DJ (contraseña fija: Dj20cantina)

import { BRAND } from "./branding.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, query, where, onSnapshot, updateDoc, doc, getDoc
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

// Sugerido en dj.html para el input (por si no lo tienes):
// <input type="password" id="djPass" placeholder="Contraseña DJ"
//        style="flex:1;" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />

// --- Utilidades ---
function tsToMillis(ts) {
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return 0;
}

async function isUnitBlocked(unitId){
  try {
    const snap = await getDoc(doc(db, "units", unitId || "general"));
    return snap.exists() && snap.data()?.blocked === true;
  } catch(e){
    console.error("units check error", e);
    return false; // si falla la lectura, no bloquear
  }
}

// --- Login + escucha ---
loginBtn.addEventListener("click", async () => {
  // 1) Normaliza contraseña (evita espacios invisibles)
  const val = (djPass.value || "").trim();
  if (val !== "Dj20cantina") {
    alert("Contraseña incorrecta");
    return;
  }

  // 2) Bloqueo por sucursal
  const blocked = await isUnitBlocked(BRAND.unitId);
  if (blocked) {
    alert(`Panel bloqueado para la sucursal: ${BRAND.unitId}. Consulta al administrador.`);
    return;
  }

  // 3) Suscripción a solicitudes PENDIENTES para esta sucursal
  const q = query(
    collection(db, "requests"),
    where("unitId", "==", BRAND.unitId),
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
      const title = document.createElement("span");
      const displayArtist = g.artist || "Artista desconocido";
      title.textContent = `${g.song} — ${displayArtist}${g.spotifyId ? ` (ID: ${g.spotifyId})` : ""}`;

      // Badge 🔥 xN si hay duplicadas
      if (count > 1) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = `🔥 x${count}`;
        title.appendChild(document.createTextNode(" "));
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
