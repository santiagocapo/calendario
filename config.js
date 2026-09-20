// Configuración de «La compra». Este archivo solo se sube una vez:
// las futuras versiones de index.html no lo tocan.

// 1) Copia aquí los valores de firebaseConfig que ya pegaste en tu index.html anterior.
export const firebaseConfig = {
  apiKey: "AIzaSyDWeQwDQQKeDEtxUGiPQN-N_Ge3HzAJY0o",
  authDomain: "lista-de-la-compra-fd066.firebaseapp.com",
  projectId: "lista-de-la-compra-fd066",
  storageBucket: "lista-de-la-compra-fd066.firebasestorage.app",
  messagingSenderId: "841838013657",
  appId: "1:841838013657:web:8cadb0867555de9daf22c8"
};

// 2) Los dos correos (los mismos que en las reglas de Firestore) y el nombre que se muestra.
export const USUARIOS = {
  "santiagocapo@gmail.com": "Santi",
  "olimpiamadridtaverner@gmail.com": "Olimpia"
};
// Direcciones de las dos apps, para saltar de una a otra con un botón.
export const APPS = {
  compra: "https://santiagocapo.github.io/NOMBRE-DEL-REPO-DE-LA-LISTA/",
  calendario: "https://santiagocapo.github.io/calendario/"
};
