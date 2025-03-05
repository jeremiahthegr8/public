// settings.js (or securitysettings.js)
import { auth, db } from '../../../database/config.js';
import {
  doc,
  getDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// Function to disable (or enable) profile form fields
function setProfileFieldsDisabled(disabled) {
  const inputs = document.querySelectorAll(
    '#profileForm input, #profileForm select, #profileForm textarea'
  );
  inputs.forEach((input) => {
    input.disabled = disabled;
  });
}

// Load profile details from Firestore and autofill the form
async function loadProfile() {
  if (!auth.currentUser) return;
  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      // Autofill the profile form fields
      document.getElementById('fullName').value = data.FullName || '';
      document.getElementById('email').value = data.email || '';
      document.getElementById('phone').value = data.phoneNumber || '';
      document.getElementById('address').value = data.address || '';
      document.getElementById('city').value = data.city || '';
      document.getElementById('region').value = data.region || '';
      document.getElementById('country').value = data.country || '';
      document.getElementById('dateOfBirth').value = data.dateOfBirth || '';
      document.getElementById('themeToggle').value = data.theme || 'light';
      // By default, show the profile in read-only mode.
      setProfileFieldsDisabled(true);
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Enable editing when the "Edit" button is clicked
document.getElementById('editProfile')?.addEventListener('click', () => {
  setProfileFieldsDisabled(false);
});

// Handle profile form submission to update Firestore
document
  .getElementById('profileForm')
  ?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    // Collect updated values from the form fields
    const updatedData = {
      FullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      phoneNumber: document.getElementById('phone').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      region: document.getElementById('region').value,
      country: document.getElementById('country').value,
      dateOfBirth: document.getElementById('dateOfBirth').value,
      theme: document.getElementById('themeToggle').value,
    };

    try {
      await updateDoc(doc(db, 'users', userId), updatedData);
      alert('Profile changes saved!');
      // After saving, disable editing again.
      setProfileFieldsDisabled(true);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error saving profile changes.');
    }
  });

// Listen for authentication state changes and load profile details
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadProfile();
  }
});

// (Optional) Also load profile details on DOMContentLoaded if the user is already signed in.
document.addEventListener('DOMContentLoaded', () => {
  if (auth.currentUser) {
    loadProfile();
  }
});

// --- Additional Tab Switching & Other Settings Functionality ---
// (Your existing tab switching, card formatting, password change, recovery email, etc. remain here.)
