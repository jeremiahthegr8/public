import { auth, db } from "../../database/config.js";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

window.addEventListener("load", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");
  const oobCode = urlParams.get("oobCode");

  if (mode === "verifyEmail" && oobCode) {
    try {
      await applyActionCode(auth, oobCode);
      // Optionally, update Firestore to mark email as verified
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          emailVerified: true,
          lastLogin: new Date().toISOString(),
        });
      }
      // Redirect to login page after verification
      window.location.href = "../Login/Login.html";
    } catch (error) {
      console.error("Error during email verification:", error);
      document.body.innerHTML =
        "<p>There was an error verifying your email. Please try again.</p>";
    }
  } else if (mode === "resetPassword" && oobCode) {
    try {
      // Verify the oobCode; this also returns the email associated with the reset request.
      const email = await verifyPasswordResetCode(auth, oobCode);
      // Build a simple password reset form
      document.body.innerHTML = `
        <h2>Reset Your Password</h2>
        <p>Reset password for: ${email}</p>
        <input type="password" id="new-password" placeholder="Enter new password" required>
        <input type="password" id="confirm-password" placeholder="Confirm new password" required>
        <button id="reset-btn">Reset Password</button>
        <p id="message"></p>
      `;
      document
        .getElementById("reset-btn")
        .addEventListener("click", async () => {
          const newPassword = document.getElementById("new-password").value;
          const confirmPassword =
            document.getElementById("confirm-password").value;
          const messageEl = document.getElementById("message");
          if (newPassword !== confirmPassword) {
            messageEl.textContent = "Passwords do not match!";
            messageEl.style.color = "red";
            return;
          }
          try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            messageEl.textContent =
              "Password reset successfully! Redirecting to login...";
            messageEl.style.color = "green";
            setTimeout(() => {
              window.location.href = "../Login/Login.html";
            }, 3000);
          } catch (error) {
            console.error("Error resetting password:", error);
            messageEl.textContent =
              "Error resetting password. Please try again.";
            messageEl.style.color = "red";
          }
        });
    } catch (error) {
      console.error("Invalid or expired password reset code:", error);
      document.body.innerHTML =
        "<p>Invalid or expired password reset link.</p>";
    }
  } else {
    document.body.innerHTML = "<p>Invalid or expired action link.</p>";
  }
});
