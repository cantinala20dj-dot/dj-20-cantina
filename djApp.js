// djApp.js — Cantina 20: login + bloqueo por unidad
import { UNIT_ID, db } from "./branding.js";
import {
  collection, query, where, onSnapshot, updateDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ===== DOM =====
const loginBtn     = document.getElementById("loginBtn");
const djPassInput  = document.getElementById("djPass");
const requestsList = document.getElementById("requests");

const MASTER_PASS = "Dj20cantina";   // misma clave maestra

// Banner de estado (si no existe, lo creo)
let banner = document.getElementById("unitBanner");
if (!banner) {
  banner = document.createElement("div");
  banner.id = "unitBanner";
  banner.style.cssText = "margin:10px 0 0; padding:10px 12px; border-radius:10px; font-size:14px; display:none;";
  const card = document.querySelector(".card") || document.body;
  card.prepend(banner);
}

function showBanner(msg, type="info"){
  const styles = {
    info:  "background:#0f141c; color:#cde3ff; border:1px solid #243041;",
    warn:  "background:#1c140f; color:#ffd9b3; border:1px solid #413224;",
    error: "background:#1a0f10; color:#ffc9d0; border:1px solid #402430;"
  };
  banner.style.cssText = `margin:10px 0 0; padding:10px 12px; border-radius:10px; font-size:14px; ${styles[type] || styles.info}`;
  banner.textContent = msg;
  banner.style.display = "block";
}

function clearBanner(){
  banner.style.display = "none";
  banner.textContent = "";
}

function setDisabledLogin(disabled){
  if (djPassInput) djPassInput.disabled = disabled;
  if (loginBtn)    loginBtn.disabled = disabled;
}

// Verifica si la unidad está bloqueada en Firestore
async function isUnitBlocked(unitId){
  try{
    const snap = await getDoc(doc(db, "units", unitId));
    if (!snap.exists()) return false; // si no existe, branding.js la creará y se considera activa
    return !!(snap.data()||{}).blocked;
  }catch(e){
    console.warn("unit blocked check:", e);
    return false;
  }
}

loginBtn?.addEventListener("click", async () => {
  const pass = (djPassInput?.value || "").trim();
  if (!pass) return alert("Escribe la contraseña del DJ.");

  try {
    setDisabledLogin(true);
    clearBanner();

    // 1) Verificación de bloqueo por unidad
    if (await isUnitBlocked(UNIT_ID)) {
      showBanner("🚫 Esta sucursal está desactivada por el administrador. No es posible operar el panel.", "warn");
      setDisabledLogin(false);
      return;
    }

    // 2) Validación de contraseña (solo maestra en Cantina 20)
    const ok = (pass === MASTER_PASS);
    if (!ok) {
      setDisabledLogin(false);
      return alert("Contraseña incorrecta.");
    }

    // 3) Suscripción a solicitudes pendientes de la unidad
    const q = query(
      collection(db, "requests"),
      where("unitId", "==", UNIT_ID),
      where("status", "==", "pending")
    );

    onSnapshot(q, (snapshot) => {
      requestsList.innerHTML = "";
      let count = 0;

      snapshot.forEach((docSnap) => {
        const r = docSnap.data();
        count++;

        const li = document.createElement("li");
        li.textContent = `${r.song} — ${r.artist || "Artista desconocido"}`;

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

      if (count === 0) {
        showBanner("No hay solicitudes pendientes en esta sucursal.", "info");
      } else {
        clearBanner();
      }
    });

    if (djPassInput) djPassInput.value = "";
    alert(`Acceso concedido — Sucursal: ${UNIT_ID}`);
  } catch (e) {
    console.error(e);
    alert("Error al iniciar sesión. Revisa conexión o Reglas de Firestore.");
  } finally {
    setDisabledLogin(false);
  }
});
