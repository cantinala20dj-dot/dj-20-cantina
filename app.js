import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

const songsBase = [
  "Shape of You",
  "Despacito",
  "Bohemian Rhapsody",
  "Imagine",
  "Billie Jean",
  "Let It Be",
  "Smells Like Teen Spirit",
  "Rolling in the Deep",
  "Happy",
  "Uptown Funk"
];

const input = document.getElementById("songSearch");
const suggestions = document.getElementById("suggestions");
const sendBtn = document.getElementById("sendSong");
const status = document.getElementById("status");

input.addEventListener("input", () => {
  const query = input.value.toLowerCase().trim();
  suggestions.innerHTML = "";
  if (query.length === 0) return;

  const filtered = songsBase.filter(s => s.toLowerCase().includes(query)).slice(0, 5);
  filtered.forEach(song => {
    const li = document.createElement("li");
    li.textContent = song;
    li.addEventListener("click", () => {
      input.value = song;
      suggestions.innerHTML = "";
    });
    suggestions.appendChild(li);
  });
});

sendBtn.addEventListener("click", async () => {
  const song = input.value.trim();
  if (!song) return;

  try {
    await addDoc(collection(db, "requests"), { song, status: "pending", timestamp: Date.now() });
    status.textContent = "✅ Se ha enviado con éxito. ¡Dale like a nuestro Instagram!";
    input.value = "";
    suggestions.innerHTML = "";
  } catch (error) {
    status.textContent = "❌ Error al enviar, intenta de nuevo.";
    console.error(error);
  }
});