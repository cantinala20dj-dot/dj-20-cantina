import { BRAND } from "./branding.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, query, where, onSnapshot, updateDoc, doc
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

loginBtn.addEventListener("click", () => {
  if (djPass.value !== "Dj20cantina") return alert("Contraseña incorrecta");

  // Pide solo solicitudes PENDIENTES de esta sucursal
  const q = query(
    collection(db, "requests"),
    where("unitId", "==", BRAND.unitId),
    where("status", "==", "pending")
  );

  onSnapshot(q, (snapshot) => {
    // 1) Agrupar solicitudes por clave (spotifyId si existe; si no, por nombre de canción)
    const groups = new Map();
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const keyBase = (d.spotifyId && String(d.spotifyId).trim()) || (d.song && String(d.song).trim()) || "";
      const key = keyBase.toLowerCase();
      if (!key) return;

      if (!groups.has(key)) {
        groups.set(key, { docs: [], song: d.song || "", spotifyId: d.spotifyId || null, lastTs: 0 });
      }
      const g = groups.get(key);
      g.docs.push(docSnap);
      // para ordenar por lo más reciente
      const ts =
        typeof d.timestamp === "number"
          ? d.timestamp
          : (d.timestamp?.toMillis?.() ?? 0);
      g.lastTs = Math.max(g.lastTs, ts || 0);
    });

    // 2) Ordenar grupos por (a) cantidad desc, (b) más reciente
    const sorted = Array.from(groups.values()).sort((a, b) => {
      const countDiff = b.docs.length - a.docs.length;
      if (countDiff !== 0) return countDiff;
      return (b.lastTs || 0) - (a.lastTs || 0);
    });

    // 3) Render
    requestsList.innerHTML = "";
    sorted.forEach((g) => {
      const count = g.docs.length;
      const li = document.createElement("li");

      const title = document.createElement("span");
      title.textContent = `${g.song}${g.spotifyId ? ` (ID: ${g.spotifyId})` : ""}`;

      const badge = document.createElement("span");
      if (count > 1) {
        badge.className = "badge";
        badge.textContent = `🔥 x${count}`;
      }

      const btnPlayed = document.createElement("button");
      btnPlayed.textContent = "Reproducida";
      btnPlayed.className = "btn";
      btnPlayed.style.marginLeft = "10px";
      btnPlayed.onclick = async () => {
        // marcar TODAS las solicitudes del grupo como 'played'
        await Promise.all(
          g.docs.map((docSnap) =>
            updateDoc(doc(db, "requests", docSnap.id), { status: "played" })
          )
        );
      };

      const btnRejected = document.createElement("button");
      btnRejected.textContent = "Rechazada";
      btnRejected.className = "btn secondary";
      btnRejected.style.marginLeft = "8px";
      btnRejected.onclick = async () => {
        // marcar TODAS las solicitudes del grupo como 'rejected'
        await Promise.all(
          g.docs.map((docSnap) =>
            updateDoc(doc(db, "requests", docSnap.id), { status: "rejected" })
          )
        );
      };

      li.appendChild(title);
      if (count > 1) li.appendChild(badge);
      li.appendChild(btnPlayed);
      li.appendChild(btnRejected);
      requestsList.appendChild(li);
    });

    // Si no hay nada
    if (sorted.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No hay solicitudes pendientes.";
      requestsList.appendChild(empty);
    }
  });
});
