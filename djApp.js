import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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
const loginDiv = document.getElementById("loginDiv");
const panelDiv = document.getElementById("panelDiv");
const requestsList = document.getElementById("requests");

loginBtn.addEventListener("click", () => {
  if (djPass.value === "Dj20cantina") {
    loginDiv.style.display = "none";
    panelDiv.style.display = "block";
    listenRequests();
  } else {
    alert("Contraseña incorrecta");
  }
});

function listenRequests() {
  const q = query(collection(db, "requests"), where("status", "==", "pending"));
  onSnapshot(q, (snapshot) => {
    requestsList.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const li = document.createElement("li");
      li.textContent = `${data.song} ${data.spotifyId ? `(ID: ${data.spotifyId})` : ""}`;

      const btnPlayed = document.createElement("button");
      btnPlayed.textContent = "Reproducida";
      btnPlayed.style.marginLeft = "10px";
      btnPlayed.onclick = async () => {
        await updateDoc(doc(db, "requests", docSnap.id), { status: "played" });
      };

      const btnRejected = document.createElement("button");
      btnRejected.textContent = "Rechazada";
      btnRejected.style.marginLeft = "5px";
      btnRejected.onclick = async () => {
        await updateDoc(doc(db, "requests", docSnap.id), { status: "rejected" });
      };

      li.appendChild(btnPlayed);
      li.appendChild(btnRejected);

      requestsList.appendChild(li);
    });
  });
}
