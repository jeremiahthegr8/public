import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js';
import {
  getAuth,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  getFirestore,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js';


// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBq2uLaMnzulkAhKKWIg-NfxDIlbe3dYZA',
  authDomain: 'ecommerce-d50ed.firebaseapp.com',
  projectId: 'ecommerce-d50ed',
  storageBucket: 'ecommerce-d50ed', // Updated bucket name
  messagingSenderId: '580091660083',
  appId: '1:580091660083:web:c79752f4158514c0a92046',
  measurementId: 'G-Z8HYBY4WBP',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Export Firebase services
export { app, auth, db, storage, analytics };
