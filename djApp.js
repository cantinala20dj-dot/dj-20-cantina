import { BRAND } from "./branding.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, query, where, onSnapshot, updateDoc, doc, getDoc
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

const loginBtn = document.getElementById("loginBtn");
const djPass = document.getElementById("djPass");
const requestsList = document.getElementById("requests");

async function isUnitBlocked(unitId){
  try {
    const snap = await getDoc(doc(db, "units", unitId || "general"));
    return snap.exists() && snap.data()?.blocked === true;
  } catch(e){
    console.error("units check error", e);
    return false;
  }
}

loginBtn.addEventListener("click", async () => {
  // Normaliza lo que el usuario escribió
  const val = (djPass.value || "").trim();  // ← elimina espacios al inicio y final

  // Comparación estricta, pero sin espacios de más
  if (val !== "Dj20cantina") {
    alert("Contraseña incorrecta");
    return;
  }

  // --- aquí sigue el código de snapshot, etc ---
});

  // suscripción a solicitudes PENDIENTES de esta sucursal
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
      const name = d.song ? String(d.song).trim() : "";
      const artist = d.artist ? String(d.artist).trim() : "";
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
      const ts = typeof d.timestamp === "number" ? d.timestamp : (d.timestamp?.toMillis?.() ?? 0);
      g.lastTs = Math.max(g.lastTs, ts || 0);
    });

    const sorted = Array.from(groups.values()).sort((a,b)=>{
      const c = b.docs.length - a.docs.length;
      if (c !== 0) return c;
      return (b.lastTs||0) - (a.lastTs||0);
    });

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

      const title = document.createElement("span");
      const displayArtist = g.artist || "Artista desconocido";
      title.textContent = `${g.song} — ${displayArtist}${g.spotifyId ? ` (ID: ${g.spotifyId})` : ""}`;

      const badge = document.createElement("span");
      if (count > 1) { badge.className = "badge"; badge.textContent = `🔥 x${count}`; }

      const btnPlayed = document.createElement("button");
      btnPlayed.textContent = "Reproducida";
      btnPlayed.className = "btn"; btnPlayed.style.marginLeft = "10px";
      btnPlayed.onclick = async () => {
        await Promise.all(g.docs.map((d)=> updateDoc(doc(db, "requests", d.id), { status: "played" })));
      };

      const btnRejected = document.createElement("button");
      btnRejected.textContent = "Rechazada";
      btnRejected.className = "btn secondary"; btnRejected.style.marginLeft = "8px";
      btnRejected.onclick = async () => {
        await Promise.all(g.docs.map((d)=> updateDoc(doc(db, "requests", d.id), { status: "rejected" })));
      };

      li.appendChild(title);
      if (count>1) li.appendChild(badge);
      li.appendChild(btnPlayed);
      li.appendChild(btnRejected);
      requestsList.appendChild(li);
    });
  });
});
