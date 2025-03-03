import { auth, db } from '../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  doc,
  getDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// --- Account Settings Section ---
const editAccountBtn = document.getElementById('edit-account-btn');
const accountActions = document.getElementById('accountActions');
const accountInfo = document.getElementById('accountInfo');

// Elements for account info display and input
const businessNameDisplay = document.getElementById('businessNameDisplay');
const businessNameInput = document.getElementById('businessNameInput');
const emailDisplay = document.getElementById('emailDisplay');
const emailInput = document.getElementById('emailInput');
const phoneDisplay = document.getElementById('phoneDisplay');
const phoneInput = document.getElementById('phoneInput');
const addressDisplay = document.getElementById('addressDisplay');
const addressInput = document.getElementById('addressInput');

const saveAccountBtn = document.getElementById('save-account-btn');
const cancelAccountBtn = document.getElementById('cancel-account-btn');

// Toggle edit mode for account info
editAccountBtn.addEventListener('click', () => {
  toggleAccountEdit(true);
});

cancelAccountBtn.addEventListener('click', () => {
  toggleAccountEdit(false);
});

// Save changes for account info
saveAccountBtn.addEventListener('click', async () => {
  // For demo, simply update display values.
  businessNameDisplay.textContent = businessNameInput.value;
  emailDisplay.textContent = emailInput.value;
  phoneDisplay.textContent = phoneInput.value;
  addressDisplay.textContent = addressInput.value;
  // Here, update Firestore as needed:
  // await updateDoc(doc(db, "sellers", auth.currentUser.uid), { ...updatedData });
  toggleAccountEdit(false);
});

function toggleAccountEdit(editing) {
  // Toggle visibility between spans and inputs
  const fields = [
    { display: businessNameDisplay, input: businessNameInput },
    { display: emailDisplay, input: emailInput },
    { display: phoneDisplay, input: phoneInput },
    { display: addressDisplay, input: addressInput },
  ];
  fields.forEach((field) => {
    if (editing) {
      field.input.classList.remove('hidden');
      field.display.classList.add('hidden');
    } else {
      field.input.classList.add('hidden');
      field.display.classList.remove('hidden');
    }
  });
  if (editing) {
    accountActions.classList.remove('hidden');
    editAccountBtn.classList.add('hidden');
  } else {
    accountActions.classList.add('hidden');
    editAccountBtn.classList.remove('hidden');
  }
}

// --- Security Settings ---
// (Implement change password functionality as needed)
// For demo, we assume the password change button simply alerts success.
const changePasswordBtn = document.getElementById('changePasswordBtn');
changePasswordBtn.addEventListener('click', () => {
  // Validate fields and call Firebase change password API here.
  alert('Password changed successfully.');
});

// --- Notification Settings ---
// (For demo, we simply log the checkbox values when changed)
const emailNotifications = document.getElementById('emailNotifications');
const smsNotifications = document.getElementById('smsNotifications');
emailNotifications.addEventListener('change', () => {
  console.log('Email Notifications:', emailNotifications.checked);
});
smsNotifications.addEventListener('change', () => {
  console.log('SMS Notifications:', smsNotifications.checked);
});

// --- Social Media Settings ---
// (For demo, just log when inputs change)
const twitterInput = document.getElementById('twitter');
const instagramInput = document.getElementById('instagram');
const facebookInput = document.getElementById('facebook');
[twitterInput, instagramInput, facebookInput].forEach((input) => {
  input.addEventListener('change', () => {
    console.log(`${input.id} set to:`, input.value);
  });
});

// --- Firebase Authentication ---
const logoutBtn = document.getElementById('logout-btn');
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '../../index.html';
  } else {
    // Optionally, load current settings from Firestore
    // e.g. getDoc(doc(db, "sellers", user.uid)).then( ... );
  }
});
logoutBtn.addEventListener('click', () => {
  signOut(auth)
    .then(() => (window.location.href = '../../index.html'))
    .catch((err) => console.error('Error signing out:', err));
});
