import { BRAND } from "./branding.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getFirestore, collection, onSnapshot, orderBy, query, doc, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAJGgPddVWwKytKv8GlPvZ27vkqZfod-4U",
  authDomain: "dj-cantina-20.firebaseapp.com",
  projectId: "dj-cantina-20",
  storageBucket: "dj-cantina-20.firebasestorage.app",
  messagingSenderId: "777157429108",
  appId: "1:777157429108:web:de2efae209dcca67228e21"
};

// Gate
const PASS = "1985";
const gate = document.getElementById("gate");
const appEl = document.getElementById("app");
const enterBtn = document.getElementById("enterBtn");
const dashPass = document.getElementById("dashPass");
const gateMsg = document.getElementById("gateMsg");

enterBtn.addEventListener("click", () => {
  if (dashPass.value !== PASS) { gateMsg.textContent = "Contraseña incorrecta."; return; }
  gate.style.display = "none"; appEl.style.display = "block"; initDashboard();
});

function toMillis(ts){ if(!ts) return null; if(typeof ts==="number") return ts; if(ts instanceof Date) return ts.getTime(); if(typeof ts.toMillis==="function") return ts.toMillis(); return null; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

const unitSelect   = document.getElementById("unitSelect");
const statusFilter = document.getElementById("statusFilter");
const fromDate     = document.getElementById("fromDate");
const toDate       = document.getElementById("toDate");
const clearBtn     = document.getElementById("clearFilters");
const exportBtn    = document.getElementById("exportCsv");

let all = []; let chart; let db;

async function initDashboard(){
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  const q = query(collection(db, "requests"), orderBy("timestamp", "desc"));
  onSnapshot(q, async (snap) => {
    all = [];
    const unitsSeen = new Set();

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const unit = d.unitId || "(sin)";
      unitsSeen.add(unit);
      all.push({
        ts: toMillis(d.timestamp),
        song: d.song || "",
        id: d.spotifyId || "",
        status: d.status || "pending",
        unit
      });
    });

    // Rellenar selector con unidades detectadas
    const current = unitSelect.value;
    const existing = new Set(Array.from(unitSelect.options).map(o=>o.value));
    unitsSeen.forEach(u => {
      if (!existing.has(u)) {
        const opt = document.createElement("option");
        opt.value = u; opt.textContent = displayName(u);
        unitSelect.appendChild(opt);
      }
    });
    if (![...unitSelect.options].some(o=>o.value===current)) unitSelect.value="__all__"; else unitSelect.value=current;

    render();
  });

  [unitSelect, statusFilter, fromDate, toDate].forEach(el => el.addEventListener("change", render));
  clearBtn.addEventListener("click", ()=>{ unitSelect.value="__all__"; statusFilter.value="all"; fromDate.value=""; toDate.value=""; render(); });
  exportBtn.addEventListener("click", exportCSV);
}

function displayName(unit){
  if (!unit || unit === "(sin)") return "(sin sucursal)";
  const map = {"santa-fe":"Santa Fe","satelite":"Satelite","cancun":"Cancun","merida":"Merida","wtc":"WTC"};
  return map[unit] || unit.replace(/-/g," ").replace(/\b\w/g, m => m.toUpperCase());
}

function getFiltered(){
  const sVal  = statusFilter.value;
  const unitV = unitSelect.value;
  const fromTs = fromDate.value ? new Date(fromDate.value).getTime() : null;
  const toTs   = toDate.value   ? new Date(toDate.value).getTime() + 24*60*60*1000 - 1 : null;

  return all.filter(r => {
    if (unitV !== "__all__" && r.unit !== unitV) return false;
    if (sVal !== "all" && r.status !== sVal) return false;
    if (fromTs && (r.ts ?? 0) < fromTs) return false;
    if (toTs && (r.ts ?? 0) > toTs) return false;
    return true;
  });
}

function groupByUnit(rows){
  const out = new Map();
  rows.forEach(r => {
    const u = r.unit || "(sin)";
    if (!out.has(u)) out.set(u, { pending:0, played:0, rejected:0, total:0, rows:[] });
    const g = out.get(u);
    g[r.status] = (g[r.status]||0) + 1;
    g.total += 1;
    g.rows.push(r);
  });
  return out;
}

function topSongs(rows, limit=10){
  const counts = new Map();
  rows.forEach(r => {
    const key = (r.id?.trim()?.toLowerCase()) || (r.song?.trim()?.toLowerCase()) || "";
    if (!key) return;
    const prev = counts.get(key) || { name: r.song, id: r.id, count: 0 };
    prev.count += 1; counts.set(key, prev);
  });
  return Array.from(counts.values()).sort((a,b)=>b.count-a.count).slice(0, limit);
}

async function readUnitBlocked(unit){
  try {
    const snap = await getDoc(doc(db, "units", unit));
    return snap.exists() && snap.data()?.blocked === true;
  } catch { return false; }
}

async function toggleUnitBlocked(unit, newVal){
  await setDoc(doc(db, "units", unit), { blocked: newVal, name: displayName(unit) }, { merge: true });
}

async function render(){
  const rows   = getFiltered();
  const byUnit = groupByUnit(rows);

  // Tabla de totales por sucursal + switch de bloqueo
  const totalsBody = document.getElementById("totalsBody");
  totalsBody.innerHTML = "";
  const sortedUnits = Array.from(byUnit.entries()).sort((a,b)=>b[1].total - a[1].total);

  for (const [unit, g] of sortedUnits){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(displayName(unit))}</td>
      <td class="small">${g.pending||0}</td>
      <td class="small">${g.played||0}</td>
      <td class="small">${g.rejected||0}</td>
      <td><strong>${g.total}</strong></td>
      <td><a class="btn secondary small" href="history.html?unit=${encodeURIComponent(unit === '(sin)' ? '' : unit)}" target="_blank" rel="noopener">Ver historial</a></td>
      <td id="cell-${unit}">—</td>
    `;
    totalsBody.appendChild(tr);

    // Colocar el toggle leyendo estado real
    const cell = document.getElementById(`cell-${unit}`);
    const isBlocked = await readUnitBlocked(unit === "(sin)" ? "general" : unit);
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!isBlocked;
    chk.title = "Bloquear panel del DJ para esta sucursal";
    chk.addEventListener("change", async () => {
      chk.disabled = true;
      try {
        await toggleUnitBlocked(unit === "(sin)" ? "general" : unit, chk.checked);
      } finally {
        chk.disabled = false;
      }
    });
    cell.textContent = "";
    cell.appendChild(chk);
  }

  // Top 10 (global o por unidad seleccionada)
  const tGlobal = topSongs(rows, 10);
  document.getElementById("topGlobal").innerHTML =
    "<h3>Top 10 " + (unitSelect.value==="__all__" ? "global" : "de "+escapeHtml(displayName(unitSelect.value))) + "</h3>" +
    (tGlobal.length ? "<ol>" + tGlobal.map(t=>`<li>${escapeHtml(t.name)} — ${t.count}</li>`).join("") + "</ol>" : "<p class='muted'>Sin datos</p>");

  // Top 5 por sucursal (si estás en “Todas”, lista todas; si no, solo la elegida)
  const topByUnit = document.getElementById("topByUnit");
  topByUnit.innerHTML = "";
  const unitsForTop = unitSelect.value==="__all__" ? sortedUnits : [[unitSelect.value, byUnit.get(unitSelect.value)||{rows:[]}]];
  unitsForTop.forEach(([unit, g]) => {
    const top5 = topSongs(g.rows || [], 5);
    const block = document.createElement("div");
    block.style.marginBottom = "8px";
    block.innerHTML =
      `<div><strong>${escapeHtml(displayName(unit))}</strong></div>` +
      (top5.length ? "<ol>" + top5.map(t=>`<li>${escapeHtml(t.name)} — ${t.count}</li>`).join("") + "</ol>" : "<p class='muted small'>Sin datos</p>");
    topByUnit.appendChild(block);
  });

  // Gráfica 3 datasets
  const labels   = sortedUnits.map(([u]) => displayName(u));
  const pendData = sortedUnits.map(([_, g]) => g.pending || 0);
  const playData = sortedUnits.map(([_, g]) => g.played  || 0);
  const rejData  = sortedUnits.map(([_, g]) => g.rejected|| 0);
  drawChart(labels, pendData, playData, rejData);
}

function drawChart(labels, pend, played, rejected){
  const ctx = document.getElementById("unitsChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [
      { label: "Pendientes",   data: pend },
      { label: "Reproducidas", data: played },
      { label: "Rechazadas",   data: rejected },
    ]},
    options: { responsive:true, scales:{ y:{ beginAtZero:true }}, plugins:{ legend:{ position:"bottom" }}}
  });
}

function exportCSV(){
  const rows = getFiltered();
  const header = ["Fecha/Hora","Canción","Spotify ID","Estado","Sucursal"];
  const lines = rows.map(r => {
    const dt = r.ts ? new Date(r.ts).toLocaleString() : "-";
    return [dt, r.song, r.id, r.status, r.unit].map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=`dashboard_${(unitSelect.value==="__all__"?"todas":unitSelect.value)}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}
