import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

let currentUser = null;

/* ===================== LOAD RECOVERY OPTIONS ===================== */
function loadRecoveryOptions() {
  if (!currentUser) return;
  (async () => {
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().recoveryEmail) {
        const recoveryEmailEl = document.getElementById("recovery-email");
        if (recoveryEmailEl)
          recoveryEmailEl.value = userSnap.data().recoveryEmail;
      }
    } catch (error) {
      console.error("Error loading recovery options:", error);
    }
  })();
}

/* ===================== AUTH STATE ===================== */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    // Load settings only if the elements exist.
    if (document.getElementById("email-notifications"))
      loadNotificationPreferences();
    loadThemePreference();
    if (document.getElementById("language-preference"))
      loadLanguagePreference();
    if (document.getElementById("session-timeout")) loadSessionTimeout();
    if (document.getElementById("login-history")) loadLoginHistory();
    if (document.getElementById("privacy-settings")) loadPrivacySettings();
    if (document.getElementById("recovery-options")) loadRecoveryOptions();
  } else {
    window.location.href = "../../index.html";
  }
});

/* ===================== PASSWORD RESET ===================== */
const resetForm = document.getElementById("request-password-reset");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailEl = document.getElementById("reset-email");
    if (!emailEl) return;
    const email = emailEl.value;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to your email. Check your inbox.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      alert("Failed to send reset email. Please check your email address.");
    }
  });
}

/* ===================== TWO-FACTOR AUTHENTICATION ===================== */
const enable2FAButton = document.getElementById("enable-2fa");
if (enable2FAButton) {
  enable2FAButton.addEventListener("click", async () => {
    if (!currentUser) return;
    try {
      // Placeholder: generate a secret; replace with proper TOTP generation if available
      const secret = { base32: "JBSWY3DPEHPK3PXP" };
      const qrCodeUrl = `otpauth://totp/J-Commerce:${currentUser.email}?secret=${secret.base32}&issuer=J-Commerce`;
      const qrCodeImg = document.getElementById("qr-code");
      const qrContainer = document.getElementById("qr-code-container");
      if (qrCodeImg && qrContainer) {
        qrCodeImg.src = qrCodeUrl;
        qrContainer.classList.remove("hidden");
      }
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
}

const generateBackupCodesButton = document.getElementById(
  "generate-backup-codes"
);
if (generateBackupCodesButton) {
  generateBackupCodesButton.addEventListener("click", async () => {
    if (!currentUser) return;
    try {
      const backupCodes = Array.from({ length: 5 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { backupCodes });
      const codesList = document.getElementById("backup-codes-list");
      if (codesList) {
        codesList.innerHTML = "";
        backupCodes.forEach((code) => {
          const li = document.createElement("li");
          li.textContent = code;
          codesList.appendChild(li);
        });
      }
      const backupContainer = document.getElementById("backup-codes-container");
      if (backupContainer) backupContainer.classList.remove("hidden");
      alert("Backup codes generated successfully. Please store them safely.");
    } catch (error) {
      console.error("Error generating backup codes:", error);
      alert("Failed to generate backup codes.");
    }
  });
}

/* ===================== NOTIFICATION PREFERENCES ===================== */
async function loadNotificationPreferences() {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const preferences = userSnap.data().notifications || {};
      const emailNotifEl = document.getElementById("email-notifications");
      const smsNotifEl = document.getElementById("sms-notifications");
      const pushNotifEl = document.getElementById("push-notifications");
      if (emailNotifEl) emailNotifEl.checked = preferences.email || false;
      if (smsNotifEl) smsNotifEl.checked = preferences.sms || false;
      if (pushNotifEl) pushNotifEl.checked = preferences.push || false;
    }
  } catch (error) {
    console.error("Error loading notification preferences:", error);
  }
}

const notificationForm = document.getElementById("security-notifications");
if (notificationForm) {
  notificationForm.addEventListener("submit", async (e) => {
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
      console.error("Error updating notification preferences:", error);
      alert("Failed to update preferences.");
    }
  });
}

/* ===================== THEME TOGGLE ===================== */
const lightThemeBtn = document.getElementById("light-theme");
if (lightThemeBtn) {
  lightThemeBtn.addEventListener("click", () => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  });
}
const darkThemeBtn = document.getElementById("dark-theme");
if (darkThemeBtn) {
  darkThemeBtn.addEventListener("click", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  });
}
function loadThemePreference() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

/* ===================== CHANGE EMAIL ===================== */
const changeEmailForm = document.getElementById("change-email-form");
if (changeEmailForm && currentUser) {
  changeEmailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById("new-email").value;
    const currentPassword = document.getElementById(
      "current-password-email"
    ).value;
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, newEmail);
      alert("Email updated successfully. Please verify your new email.");
    } catch (error) {
      console.error("Error updating email:", error);
      alert(`Failed to update email: ${error.message}`);
    }
  });
}

/* ===================== LANGUAGE PREFERENCE ===================== */
const saveLanguageBtn = document.getElementById("save-language");
if (saveLanguageBtn && currentUser) {
  saveLanguageBtn.addEventListener("click", async () => {
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
}
async function loadLanguagePreference() {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const language = userSnap.data().language || "en";
      const langEl = document.getElementById("language-preference");
      if (langEl) langEl.value = language;
    }
  } catch (error) {
    console.error("Error loading language preference:", error);
  }
}

/* ===================== DOWNLOAD DATA ===================== */
const downloadDataBtn = document.getElementById("download-data");
if (downloadDataBtn && currentUser) {
  downloadDataBtn.addEventListener("click", async () => {
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
}

/* ===================== SESSION TIMEOUT ===================== */
const saveTimeoutBtn = document.getElementById("save-timeout");
if (saveTimeoutBtn && currentUser) {
  saveTimeoutBtn.addEventListener("click", async () => {
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
}
async function loadSessionTimeout() {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const timeout = userSnap.data().sessionTimeout || "15";
      const timeoutEl = document.getElementById("session-timeout");
      if (timeoutEl) timeoutEl.value = timeout;
    }
  } catch (error) {
    console.error("Error loading session timeout:", error);
  }
}

// Auto logout after session timeout
let timeoutId;
function startSessionTimeout(timeout) {
  timeoutId = setTimeout(() => {
    alert("Your session has expired. Please log in again.");
    signOut(auth);
  }, timeout * 60 * 1000);
}

/* ===================== ACTIVE SESSIONS / LOGIN HISTORY ===================== */
async function loadLoginHistory() {
  if (!currentUser) return;
  try {
    const historyRef = collection(db, "users", currentUser.uid, "loginHistory");
    const snapshot = await getDocs(historyRef);
    const historyContainer = document.getElementById("login-history");
    if (!historyContainer) return;
    historyContainer.innerHTML = "";
    if (snapshot.empty) {
      historyContainer.innerHTML =
        "<p class='no-sessions'>No recent sessions found.</p>";
      return;
    }
    snapshot.forEach((docSnapshot) => {
      const session = docSnapshot.data();
      const sessionDiv = document.createElement("div");
      sessionDiv.classList.add("session-entry");
      sessionDiv.innerHTML = `
        <p><strong>Time:</strong> ${new Date(
          session.loginTimestamp
        ).toLocaleString()}</p>
        <p><strong>Device:</strong> ${session.deviceInfo.platform} / ${
        session.deviceInfo.userAgent
      }</p>
        <p><strong>IP:</strong> ${session.ipAddress} (${
        session.geolocation.city
      }, ${session.geolocation.country})</p>
        <p><strong>Session Token:</strong> ${session.sessionToken}</p>
      `;
      historyContainer.appendChild(sessionDiv);
    });
  } catch (error) {
    console.error("Error loading login history:", error);
  }
}

/* ===================== PROFILE PRIVACY SETTINGS ===================== */
async function loadPrivacySettings() {
  if (!currentUser) return;
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const privacy = userSnap.data().privacySettings || {
        showEmail: false,
        showPhone: false,
      };
      const showEmailEl = document.getElementById("show-email");
      const showPhoneEl = document.getElementById("show-phone");
      if (showEmailEl) showEmailEl.checked = privacy.showEmail;
      if (showPhoneEl) showPhoneEl.checked = privacy.showPhone;
    }
  } catch (error) {
    console.error("Error loading privacy settings:", error);
  }
}

const privacyForm = document.getElementById("privacy-settings");
if (privacyForm) {
  privacyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const showEmail = document.getElementById("show-email").checked;
    const showPhone = document.getElementById("show-phone").checked;
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { privacySettings: { showEmail, showPhone } });
      alert("Privacy settings updated successfully.");
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      alert("Failed to update privacy settings.");
    }
  });
}

/* ===================== ACCOUNT RECOVERY OPTIONS ===================== */
const recoveryForm = document.getElementById("recovery-options");
if (recoveryForm) {
  recoveryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const recoveryEmail = document
      .getElementById("recovery-email")
      .value.trim();
    if (!recoveryEmail || !isValidEmail(recoveryEmail)) {
      alert("Please enter a valid recovery email.");
      return;
    }
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { recoveryEmail });
      alert("Recovery email updated successfully.");
    } catch (error) {
      console.error("Error updating recovery email:", error);
      alert("Failed to update recovery email.");
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ===================== DELETE ACCOUNT ===================== */
const deleteAccountForm = document.getElementById("delete-account-form");
if (deleteAccountForm) {
  deleteAccountForm.addEventListener("submit", async (e) => {
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
}

/* ===================== INITIALIZATION ===================== */
loadThemePreference();
loadLanguagePreference();
loadSessionTimeout();
loadLoginHistory();
loadPrivacySettings();
loadRecoveryOptions();
// Optionally, start session timeout timer, e.g.:
// startSessionTimeout(15); // 15 minutes

// Listen for logout button click
function logout() {
  signOut(auth)
    .then(() => {
      window.location.href = "../../index.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}  document.getElementById("logout-btn").addEventListener("click", logout);
