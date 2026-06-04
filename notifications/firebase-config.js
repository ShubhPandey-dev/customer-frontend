
const firebaseConfig = {
  apiKey: "AIzaSyBLwFh03Nw1UQWDjV6lzytMplMGJGP-i20",
  authDomain: "ecom-project-e2501.firebaseapp.com",
  projectId: "ecom-project-e2501",
  storageBucket: "ecom-project-e2501.firebasestorage.app",
  messagingSenderId: "697593607673",
  appId: "1:697593607673:web:f230b6b2eebb513272f928",
  measurementId: "G-4M6NSBLTY8"
};



// INITIALIZE FIREBASE

firebase.initializeApp(firebaseConfig);



// EXPORT MESSAGING

window.messaging = firebase.messaging();
