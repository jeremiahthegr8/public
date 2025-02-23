import { auth, db } from "../../database/config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Utility: Get user's IP and geolocation from ipapi.co
async function getUserIPAndLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
    };
  } catch (error) {
    console.error("Error fetching IP and location:", error);
    return {
      ip: "Unknown",
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
    };
  }
}

// Utility: Get device and browser information
function getDeviceAndBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}

// Utility: Generate a simple session token
function generateSessionToken() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Auto login: if user is already signed in and verified, redirect to home page
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    window.location.href = "../../index.html";
  }
});

// Handle login form submission
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorMessageEl = document.getElementById("error-message");

  try {
    // Attempt sign in
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Prevent login if email is not verified
    if (!user.emailVerified) {
      errorMessageEl.textContent =
        "Your email is not verified. Please verify your email before logging in.";
      await signOut(auth);
      return;
    }

    // Generate login data
    const loginTimestamp = new Date().toISOString();
    const deviceInfo = getDeviceAndBrowserInfo();
    const ipAndLocation = await getUserIPAndLocation();
    const sessionToken = generateSessionToken();
    const authMethod = "email/password"; // adjust if using other methods

    // Update Firestore user document with verified status and last login
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      emailVerified: true, // update Firestore if not already set
      lastLogin: loginTimestamp,
      currentSessionToken: sessionToken,
      // Optionally, set a session expiration timestamp (here, 30 minutes from now)
      currentSessionExpires: new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString(),
    });

    // Append a login history entry in a subcollection
    const loginHistoryRef = collection(db, "users", user.uid, "loginHistory");
    await addDoc(loginHistoryRef, {
      loginTimestamp,
      deviceInfo,
      ipAddress: ipAndLocation.ip,
      geolocation: {
        city: ipAndLocation.city,
        region: ipAndLocation.region,
        country: ipAndLocation.country,
      },
      sessionToken,
      authMethod,
      // Additional flags (e.g., suspiciousActivity) can be added here.
    });

    // Redirect user to home page after successful login
    window.location.href = "../../index.html";
  } catch (error) {
    console.error("Login error:", error);
    errorMessageEl.textContent = error.message;
  }
});
