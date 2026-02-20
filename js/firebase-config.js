import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCEmTvelW_l9W4Ai_RQuQx4DCQSKsJhRzc",
  authDomain: "batalla-naval-73a00.firebaseapp.com",
  databaseURL: "https://batalla-naval-73a00-default-rtdb.firebaseio.com",
  projectId: "batalla-naval-73a00",
  storageBucket: "batalla-naval-73a00.firebasestorage.app",
  messagingSenderId: "1057544411450",
  appId: "1:1057544411450:web:93f410d049e9dbe687d803"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
