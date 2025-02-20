import { auth } from "../../database/config.js";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Extract the oobCode and mode from the URL
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get("oobCode");
const mode = urlParams.get("mode");

// Validate the oobCode and mode
if (mode !== "resetPassword" || !oobCode) {
  alert("Invalid reset link. Please request a new one.");
  window.location.href = "../../index.html";
}

// Handle the password reset form submission
document
  .getElementById("reset-password-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      // Verify the oobCode and reset the password
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, newPassword);
      alert(
        "Password reset successfully. You can now log in with your new password."
      );
      window.location.href = "../../index.html";
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Failed to reset password. Please try again.");
    }
  });
