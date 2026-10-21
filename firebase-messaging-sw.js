// Service worker de notificaciones push (Firebase Cloud Messaging) para Stock Scanner.
// Tiene que estar en la MISMA carpeta que index.html (raíz del repo stock-scanner).
// No guarda nada en caché: solo recibe los avisos de mensajes nuevos cuando la app está cerrada.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC4rhZK1tuhJChMrChr01ukMeGs6tM3x_8",
  authDomain: "stock-scanner-d7c67.firebaseapp.com",
  projectId: "stock-scanner-d7c67",
  storageBucket: "stock-scanner-d7c67.firebasestorage.app",
  messagingSenderId: "267705854754",
  appId: "1:267705854754:web:15c9408a27846e3954137b"
});

// Al tocar el aviso: si la app ya está abierta, la trae al frente en Mensajes; si no, la abre.
self.addEventListener('notificationclick', event => {
  event.stopImmediatePropagation(); // se registra antes que el de Firebase para que no abra dos ventanas
  event.notification.close();
  const destino = new URL('./#mensajes', self.registration.scope).href;
  event.waitUntil((async () => {
    const ventanas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of ventanas) {
      if (c.url.startsWith(self.registration.scope)) {
        try { c.postMessage({ tipo: 'abrir-mensajes' }); } catch (e) {}
        return c.focus();
      }
    }
    return clients.openWindow(destino);
  })());
});

// Los avisos llegan con "notification" armado desde el Worker, así que Firebase los muestra solo.
firebase.messaging();
