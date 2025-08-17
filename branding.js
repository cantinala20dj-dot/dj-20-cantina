// branding.js
const BRAND = {
  name: "DJ’ Cantina 20",
  logo: "logovideos.png",
  instagramUrl: "https://www.instagram.com/cantinaveinte", // IG oficial fijo
  unitId: "general"
};

(function initBrand() {
  const p = new URLSearchParams(location.search);
  if (p.get("unit")) BRAND.unitId = p.get("unit");
  // Solo cambia IG si explícitamente pasas ?ig=...
  if (p.get("ig")) BRAND.instagramUrl = p.get("ig");

  document.addEventListener("DOMContentLoaded", () => {
    const nameEls = document.querySelectorAll("[data-brand-name]");
    nameEls.forEach(el => (el.textContent = BRAND.name));

    const logoEl = document.getElementById("logo");
    if (logoEl) logoEl.src = BRAND.logo;

    // Aplica IG definitivo a todos los enlaces con data-ig
    document.querySelectorAll("a[data-ig]").forEach(a => {
      a.href = BRAND.instagramUrl;
      a.target = "_blank";
      a.rel = "noopener";
    });

    const unitEl = document.getElementById("unitTag");
    if (unitEl) unitEl.textContent = BRAND.unitId || "general";
  });
})();
export { BRAND };
