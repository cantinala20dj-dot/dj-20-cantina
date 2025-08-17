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

  // Pide solo solicitudes de esta sucursal y pendientes
  const q = query(
    collection(db, "requests"),
    where("unitId", "==", BRAND.unitId),
    where("status", "==", "pending")
  );

  onSnapshot(q, (snapshot) => {
    requestsList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const li = document.createElement("li");
      li.textContent = `${data.song} ${data.spotifyId ? `(ID: ${data.spotifyId})` : ""}`;

      const btnPlayed = document.createElement("button");
      btnPlayed.textContent = "Reproducida";
      btnPlayed.className = "btn"; btnPlayed.style.marginLeft = "10px";
      btnPlayed.onclick = async () => {
        await updateDoc(doc(db, "requests", docSnap.id), { status: "played" });
      };

      const btnRejected = document.createElement("button");
      btnRejected.textContent = "Rechazada";
      btnRejected.className = "btn secondary"; btnRejected.style.marginLeft = "8px";
      btnRejected.onclick = async () => {
        await updateDoc(doc(db, "requests", docSnap.id), { status: "rejected" });
      };

      li.appendChild(btnPlayed);
      li.appendChild(btnRejected);
      requestsList.appendChild(li);
    });
  });
});
