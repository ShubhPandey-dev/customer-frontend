importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

// 🔥 FIREBASE INIT

firebase.initializeApp({

  apiKey:
    "AIzaSyBLwFh03Nw1UQWDjV6lzytMplMGJGP-i20",

  authDomain:
    "ecom-project-e2501.firebaseapp.com",

  projectId:
    "ecom-project-e2501",

  storageBucket:
    "ecom-project-e2501.firebasestorage.app",

  messagingSenderId:
    "697593607673",

  appId:
    "1:697593607673:web:f230b6b2eebb513272f928",

});

const messaging = firebase.messaging();

// 🔥 BACKGROUND NOTIFICATION

messaging.onBackgroundMessage(

  (payload) => {

    console.log(
      "Background Notification:",
      payload
    );

    self.registration.showNotification(

      payload?.data?.title ||

      "Shubhdeal Offer",

      {

        body:

          payload?.data?.body ||

          "New Offer Available",

        icon:

          payload?.data?.icon ||

          "/logo.png",

        badge: "/logo.png",

        requireInteraction: true,

        silent: false,

        vibrate: [200, 100, 200],

        tag:
          `offer-${payload?.data?.notificationId}`,

        data: {

          url:
            payload?.data?.url ||

            "/products",

        },

      }

    );

  }

);

// 🔥 CLICK EVENT

self.addEventListener(

  "notificationclick",

  (event) => {

    event.notification.close();

    const url =

      event.notification.data?.url ||

      "/products";

    event.waitUntil(

      clients
        .matchAll({

          type: "window",

          includeUncontrolled: true,

        })

        .then((clientList) => {

          for (const client of clientList) {

            if ("focus" in client) {

              client.navigate(url);

              return client.focus();

            }

          }

          if (clients.openWindow) {

            return clients.openWindow(url);

          }

          return null;

        })

    );

  }

);