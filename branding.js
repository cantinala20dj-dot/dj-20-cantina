// branding.js — DJ’ Cantina 20: auto-registro de unidades y marca
export let UNIT_ID = "general";
export const BRAND = {
  name: "DJ’ Cantina 20",
  logo: "/logovideos.png",
  instagramUrl: "https://www.instagram.com/cantinaveinte"
};

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// ⬇️ TU CONFIG DE FIREBASE (Cantina 20)
const firebaseConfig = {
  apiKey: "AIzaSyAJGgPddVWwKytKv8GlPvZ27vkqZfod-4U",
  authDomain: "dj-cantina-20.firebaseapp.com",
  projectId: "dj-cantina-20",
  storageBucket: "dj-cantina-20.firebasestorage.app",
  messagingSenderId: "777157429108",
  appId: "1:777157429108:web:de2efae209dcca67228e21"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

(function initBrand(){
  const p = new URLSearchParams(location.search);
  UNIT_ID = (p.get("unit") || "general").toLowerCase();

  // IG override por URL (opcional): ?ig=https://instagram.com/mi_sucursal
  let ig = p.get("ig") || BRAND.instagramUrl;

  document.addEventListener("DOMContentLoaded", async ()=>{
    // Aplica logo + nombre
    const logo = document.getElementById("logo");
    if (logo){ logo.src = BRAND.logo; logo.onerror = ()=>{ logo.src="/logo.png"; }; }
    document.querySelectorAll("[data-brand-name]").forEach(el => el.textContent = BRAND.name);

    // Muestra tag de sucursal
    const tag = document.getElementById("unitTag");
    if (tag) tag.textContent = UNIT_ID;

    // ===== Auto-registro de unidad en Firestore =====
    try {
      const ref = doc(db, "units", UNIT_ID);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          name: UNIT_ID.charAt(0).toUpperCase() + UNIT_ID.slice(1),
          instagramUrl: ig,
          blocked: false,                  // por defecto activa
          createdAt: new Date().toISOString()
        });
      } else {
        const data = snap.data() || {};
        // Si no hubo override vía ?ig, usa el IG guardado en la unidad (si existe)
        if (!p.get("ig") && data.instagramUrl) ig = data.instagramUrl;
      }
    } catch (e) {
      console.warn("No se pudo auto-registrar la unidad:", e);
    }

    // Aplica link de IG (botón “Síguenos”)
    document.querySelectorAll("a[data-ig]").forEach(a => a.href = ig);
  });
})();
