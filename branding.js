// branding.js — Configuración de marca y sucursal
const BRAND = {
  name: "DJ’ Cantina 20",
  logo: "/logovideos.png", // coloca tu logo en /public/assets/logo.png
  instagramUrl: "https://instagram.com/TU_INSTAGRAM", // editable
  unitId: "general" // se puede sobrescribir con ?unit=sucursal1
};

(function initBrand() {
  // Permite override por querystring: ?unit=sucursal1&ig=https://instagram.com/mi_ig
  const p = new URLSearchParams(location.search);
  if (p.get("unit")) BRAND.unitId = p.get("unit");
  if (p.get("ig")) BRAND.instagramUrl = p.get("ig");

  // Aplica nombre y logo si existen en el DOM
  document.addEventListener("DOMContentLoaded", () => {
    const nameEls = document.querySelectorAll("[data-brand-name]");
    nameEls.forEach(el => (el.textContent = BRAND.name));

    const logoEl = document.getElementById("logo");
    if (logoEl) logoEl.src = BRAND.logo;

    const igLinks = document.querySelectorAll("a[data-ig]");
    igLinks.forEach(a => (a.href = BRAND.instagramUrl));
  });
})();
export { BRAND };
