import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

const statusFilter = document.getElementById("statusFilter");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const applyBtn = document.getElementById("applyFilters");
const tbody = document.getElementById("historyBody");

applyBtn.addEventListener("click", loadHistory);
loadHistory(); // carga inicial

async function loadHistory() {
  tbody.innerHTML = "";

  // Construimos query base
  let q = query(collection(db, "requests"), orderBy("timestamp", "desc"));

  // NOTA: Firestore no permite componer libremente múltiples where + orderBy sin índices;
  // si luego agregas filtros de fecha combinados con status, puede pedirte crear un índice automático (síguele el enlace que muestra).

  // Para filtrar por status, haremos fetch completo y filtramos en cliente (simple y suficiente aquí).
  const snap = await getDocs(q);

  const sVal = statusFilter.value;
  const fromTs = fromDate.value ? new Date(fromDate.value).getTime() : null;
  const toTs = toDate.value ? new Date(toDate.value).getTime() + 24*60*60*1000 - 1 : null; // fin del día

  const rows = [];
  snap.forEach(doc => {
    const d = doc.data();
    const ts = typeof d.timestamp === "number" ? d.timestamp : (d.timestamp?.toMillis?.() ?? null);

    // Filtros en cliente
    if (sVal !== "all" && d.status !== sVal) return;
    if (fromTs && ts < fromTs) return;
    if (toTs && ts > toTs) return;

    rows.push({
      ts,
      song: d.song || "",
      id: d.spotifyId || "",
      status: d.status || "pending"
    });
  });

  // Render
  for (const r of rows) {
    const tr = document.createElement("tr");
    const dt = r.ts ? new Date(r.ts).toLocaleString() : "-";
    tr.innerHTML = `
      <td>${dt}</td>
      <td>${escapeHtml(r.song)}</td>
      <td>${escapeHtml(r.id)}</td>
      <td>${escapeHtml(r.status)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[s]));
}