// Scripts for firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "gen-lang-client-0015960788",
  appId: "1:504824930330:web:d8023943339a779c02b1a3",
  apiKey: "AIzaSyCT14Y1T41WYB-vm4hlDfa3gv_oBVnO8FQ",
  authDomain: "gen-lang-client-0015960788.firebaseapp.com",
  storageBucket: "gen-lang-client-0015960788.firebasestorage.app",
  messagingSenderId: "504824930330"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
