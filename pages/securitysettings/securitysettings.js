import e from "express";
import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  updateEmail,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

let currentUser = null;

// Check user authentication status
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
      loadNotificationPreferences();
       loadThemePreference();
       loadLanguagePreference();
       loadSessionTimeout();
  } else {
    window.location.href = "../../index.html"; // Redirect if not logged in
  }
});

// Request Password Reset
document
  .getElementById("request-password-reset")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to your email. Check your inbox.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Failed to send reset email. Please check your email address.");
    }
  });

// Enable 2FA
document.getElementById("enable-2fa").addEventListener("click", async () => {
  try {
    const secret = speakeasy.generateSecret({ length: 20 });
    const qrCodeUrl = `otpauth://totp/YourApp:${currentUser.email}?secret=${secret.base32}&issuer=YourApp`;
    document.getElementById("qr-code").src = qrCodeUrl;
    document.getElementById("qr-code-container").classList.remove("hidden");

    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, { twoFASecret: secret });
    alert(
      "2FA enabled successfully. Scan the QR code with your authenticator app."
    );
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    alert("Failed to enable 2FA.");
  }
});

// Load Notification Preferences
async function loadNotificationPreferences() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const preferences = userSnap.data().notifications || {};
      document.getElementById("email-notifications").checked =
        preferences.email || false;
      document.getElementById("sms-notifications").checked =
        preferences.sms || false;
      document.getElementById("push-notifications").checked =
        preferences.push || false;
      }
    else {
        console.error("User notifications not found in Firestore.");
        }
  } catch (error) {
    console.error("Error loading preferences:", error);
  }
}

// Update Notification Preferences
document
  .getElementById("notification-preferences")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailNotifications = document.getElementById(
      "email-notifications"
    ).checked;
    const smsNotifications =
      document.getElementById("sms-notifications").checked;
    const pushNotifications =
      document.getElementById("push-notifications").checked;

    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        notifications: {
          email: emailNotifications,
          sms: smsNotifications,
          push: pushNotifications,
        },
      });
      alert("Notification preferences updated successfully.");
    } catch (error) {
      console.error("Error updating preferences:", error);
      alert("Failed to update preferences.");
    }
  });

// Delete Account
document
  .getElementById("delete-account-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("delete-account-password").value;
const confirmed = confirm(
  "Are you sure you want to delete your account? This action cannot be undone."
);
if (!confirmed) return;
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);

      const userRef = doc(db, "users", currentUser.uid);
      await deleteDoc(userRef);

      await deleteUser(currentUser);
      alert("Account deleted successfully.");
      window.location.href = "../../index.html";
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Please check your password.");
    }
  });


  // Theme Toggle
  document.getElementById("light-theme").addEventListener("click", () => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  });

  document.getElementById("dark-theme").addEventListener("click", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  });

  // Load Theme Preference
  function loadThemePreference() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  // Change Email
  document
    .getElementById("change-email-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const newEmail = document.getElementById("new-email").value;
      const currentPassword = document.getElementById(
        "current-password-email"
      ).value;

      try {
  await updateEmail(currentUser, newEmail);
  alert("Email updated successfully. Please verify your new email.");
} catch (error) {
  console.error("Error updating email:", error);
  alert(`Failed to update email: ${error.message}`);
}
    });

  // Language Preference
  document
    .getElementById("save-language")
    .addEventListener("click", async () => {
      const language = document.getElementById("language-preference").value;
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, { language });
        alert("Language preference updated successfully.");
      } catch (error) {
        console.error("Error updating language preference:", error);
        alert("Failed to update language preference.");
      }
    });

  // Load Language Preference
  async function loadLanguagePreference() {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const language = userSnap.data().language || "en";
        document.getElementById("language-preference").value = language;
      }
    } catch (error) {
      console.error("Error loading language preference:", error);
    }
  }

  // Download Data
  document
    .getElementById("download-data")
    .addEventListener("click", async () => {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const blob = new Blob([JSON.stringify(userData, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "user-data.json";
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("Error downloading data:", error);
        alert("Failed to download data.");
      }
    });

  // Session Timeout
  document
    .getElementById("save-timeout")
    .addEventListener("click", async () => {
      const timeout = document.getElementById("session-timeout").value;
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, { sessionTimeout: timeout });
        alert("Session timeout updated successfully.");
      } catch (error) {
        console.error("Error updating session timeout:", error);
        alert("Failed to update session timeout.");
      }
    });

  // Load Session Timeout
  async function loadSessionTimeout() {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const timeout = userSnap.data().sessionTimeout || "15";
        document.getElementById("session-timeout").value = timeout;
      }
    } catch (error) {
      console.error("Error loading session timeout:", error);
    }
}
  
let timeoutId;
function startSessionTimeout(timeout) {
  timeoutId = setTimeout(() => {
    alert("Your session has expired. Please log in again.");
    auth.signOut();
  }, timeout * 60 * 1000);
}

function resetSessionTimeout() {
  clearTimeout(timeoutId);
  startSessionTimeout(timeout);
}

// Reset timeout on user activity
window.addEventListener("mousemove", resetSessionTimeout);
window.addEventListener("keydown", resetSessionTimeout);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(newEmail)) {
  alert("Please enter a valid email address.");
  return;
}