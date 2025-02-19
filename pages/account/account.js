import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

let currentUser = null;
let userData = {}; // Store user data to reference old values

// Check user authentication status
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadUserProfile(user.uid);
  } else {
    window.location.href = "../../index.html"; // Redirect if not logged in
  }
});

// Load user profile from Firestore
async function loadUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      userData = userSnap.data(); // Store user data for reference
      updateProfileDisplay(userData);
    } else {
      console.error("User data not found in Firestore.");
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
  }
}

// Update the UI with user data
function updateProfileDisplay(data) {
  document.getElementById("user-name").textContent = data.fullName || "User";
  document.getElementById("full-name").textContent = data.fullName || "User";
  document.getElementById("user-email").textContent = currentUser.email;
  document.getElementById("user-phone").textContent =
    data.phone || "Not Provided";
  document.getElementById("user-address").textContent =
    data.address || "Not Provided";
  document.getElementById("user-country").textContent =
    data.country || "Not Provided";
  document.getElementById("user-city").textContent =
    data.city || "Not Provided";
}

// Toggle Edit Mode
function toggleEditMode(enable = true) {
  const displayFields = document.querySelectorAll(".info-grid span");
  const editFields = document.querySelectorAll(".edit-input");
  const editBtn = document.getElementById("edit-profile-btn");
  const saveBtn = document.getElementById("save-profile-btn");
  const cancelBtn = document.getElementById("cancel-edit-btn");

  if (enable) {
    // Show input fields and pre-fill with current data
    editFields.forEach((input) => {
      const field = input.id.replace("edit-", ""); // Extract field name
      input.value = userData[field] || ""; // Pre-fill values
      input.style.display = "block";
    });

    // Hide spans
    displayFields.forEach((span) => (span.style.display = "none"));

    // Toggle buttons
    editBtn.style.display = "none";
    saveBtn.style.display = "inline-block";
    cancelBtn.style.display = "inline-block";
  } else {
    // Restore display mode
    editFields.forEach((input) => (input.style.display = "none"));
    displayFields.forEach((span) => (span.style.display = "block"));

    // Toggle buttons
    editBtn.style.display = "inline-block";
    saveBtn.style.display = "none";
    cancelBtn.style.display = "none";
  }
}

// Save Profile (Keep old values for empty fields)
async function saveProfile() {
  if (!currentUser) return;

  const updates = {
    fullName: getUpdatedValue("edit-name", userData.fullName), // Use the correct input ID
    phone: getUpdatedValue("edit-phone", userData.phone),
    address: getUpdatedValue("edit-address", userData.address),
    country: getUpdatedValue("edit-country", userData.country),
    city: getUpdatedValue("edit-city", userData.city),
  };

  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, updates);
    userData = { ...userData, ...updates }; // Update stored data

    updateProfileDisplay(userData);
    toggleEditMode(false);
    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Error updating profile:", error);
  }
}

// Helper function to get input value or fallback to old value
function getUpdatedValue(inputId, oldValue) {
  const input = document.getElementById(inputId);
  return input ? input.value.trim() || oldValue : oldValue; // Avoid accessing `.trim()` on `null`
}

// Logout Function
function logout() {
  signOut(auth)
    .then(() => {
      window.location.href = "../../index.html"; // Redirect after logout
    })
    .catch((error) => console.error("Error logging out:", error));
}

// Attach event listeners after the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("edit-profile-btn")
    .addEventListener("click", () => toggleEditMode(true));
  document
    .getElementById("save-profile-btn")
    .addEventListener("click", saveProfile);
  document
    .getElementById("cancel-edit-btn")
    .addEventListener("click", () => toggleEditMode(false));
  document.querySelector(".logout-button").addEventListener("click", logout);
});
