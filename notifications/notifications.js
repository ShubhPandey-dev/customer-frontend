const SHUBHDEAL_VAPID_KEY =
  "BG1iwDl84lcFl8OfSdkRPnZuF3jYnph2nJx5shl63OMSsbxQpYhp3tPUIS6B8_IWsCgtvdp0DGqdp-CrmOQO8o0";

const SEEN_BROWSER_KEY = "shubhdeal_browser_notifications_seen";
let isInitialized = false;
const messageListeners = [];

function getSeenNotificationIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_BROWSER_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function markBrowserNotificationSeen(notificationId) {
  if (!notificationId) return;

  const seenIds = new Set(getSeenNotificationIds());
  seenIds.add(String(notificationId));
  localStorage.setItem(SEEN_BROWSER_KEY, JSON.stringify(Array.from(seenIds)));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration?.getNotifications) return;

      registration
        .getNotifications({ tag: `shubhdeal-offer-${notificationId}` })
        .then((notifications) => {
          notifications.forEach((notification) => notification.close());
        });
    });
  }
}

async function saveToken(token, customerToken) {
  const response = await fetch(
    "https://ecom-common-backend.onrender.com/api/notification/save-fcm-token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ token }),
    }
  );

  return response.json();
}

function showBrowserNotification(payload) {

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const notificationId =
    payload?.data?.notificationId ||
    payload?.notification?.tag ||
    `${payload?.notification?.title}-${payload?.notification?.body}`;

  const seenIds = getSeenNotificationIds();

  if (seenIds.includes(String(notificationId))) {
    return;
  }

  markBrowserNotificationSeen(notificationId);

  const notification = new Notification(
    payload?.notification?.title || "Shubhdeal Offer",
    {
      body: payload?.notification?.body || "A new Shubhdeal offer is live.",
      icon: "/logo.png",
      tag: `shubhdeal-offer-${notificationId}`,
      renotify: false,
    }
  );

  notification.onclick = () => {
    notification.close();
    window.focus();
    window.location.href = payload?.data?.url || "/products";
  };

  setTimeout(() => notification.close(), 8000);
}

async function initNotification(customerToken, onMessageReceived) {
  if (!customerToken || !window.messaging || !("Notification" in window)) {
    return;
  }

  if (typeof onMessageReceived === "function") {
    messageListeners.push(onMessageReceived);
  }

  if (isInitialized) {
    return;
  }

  isInitialized = true;

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return;
    }

    const fcmToken = await window.messaging.getToken({
      vapidKey: SHUBHDEAL_VAPID_KEY,
    });

    if (fcmToken) {
      await saveToken(fcmToken, customerToken);
    }

    window.messaging.onMessage((payload) => {
      showBrowserNotification(payload);

      messageListeners.forEach((listener) => listener(payload));
    });
  } catch (error) {
    isInitialized = false;
    console.log(error);
  }
}

window.shubhdealNotifications = {
  init: initNotification,
  markBrowserNotificationSeen,
};
