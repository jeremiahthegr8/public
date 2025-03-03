import { auth, db } from '../../../database/config.js';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// DOM Elements
const userNameElement = document.getElementById('user-name');
const userFullNameElement = document.getElementById('user-fullname');
const userEmailElement = document.getElementById('user-email');
const userPhoneElement = document.getElementById('user-phone');
const userAddressElement = document.getElementById('user-address');
const userCountryElement = document.getElementById('user-country');
const userCityElement = document.getElementById('user-city');

const editProfileBtn = document.getElementById('edit-profile-btn');
const saveChangesBtn = document.getElementById('save-changes-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const logoutBtn = document.getElementById('logout-btn');
const viewOrdersBtn = document.getElementById('view-orders-btn');
const securitySettingsBtn = document.getElementById('security-settings-btn');
const paymentMethodsBtn = document.getElementById('payment-methods-btn');
const hamburgerMenu = document.querySelector('.hamburger-menu');
const editActions = document.getElementById('edit-actions');

// Global store for user data (used when editing)
let currentUserData = {};

// Listen for authentication state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    loadUserProfile(user.uid);
    userEmailElement.textContent = user.email;
  } else {
    window.location.href = '../../index.html';
  }
});

// Load user profile from Firestore using modular syntax
function loadUserProfile(uid) {
  const userRef = doc(db, 'users', uid);
  getDoc(userRef)
    .then((docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        currentUserData = data; // Store the retrieved data

        // Update UI using the same keys as stored in Firestore
        userNameElement.textContent = data.FullName || 'User';
        userFullNameElement.textContent = data.FullName || 'Not set';
        userEmailElement.textContent = data.email || 'Not set';
        userPhoneElement.textContent = data.phoneNumber || 'Not set';
        userAddressElement.textContent = data.address || 'Not set';
        userCountryElement.textContent = data.country || 'Not set';
        userCityElement.textContent = data.city || 'Not set';
      } else {
        // If the document doesn't exist, create one using available auth data
        setDoc(userRef, {
          fullName: auth.currentUser.displayName || 'User',
          email: auth.currentUser.email,
          phoneNumber: '',
          address: '',
          country: '',
          city: '',
        })
          .then(() => {
            loadUserProfile(uid);
          })
          .catch((error) => {
            console.error('Error creating user document:', error);
          });
      }
    })
    .catch((error) => {
      console.error('Error loading user profile:', error);
      showToast('Error loading profile data', 'error');
    });
}

// Toggle edit mode: replace each editable span with an input field
function toggleEditMode() {
  const profileItems = document.querySelectorAll('.profile-item');
  profileItems.forEach((item) => {
    const label = item.querySelector('label').textContent;
    const span = item.querySelector('span');
    // Skip non-editable field (Email Address)
    if (label === 'Email Address') return;
    const currentValue = span.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue === 'Not set' ? '' : currentValue;
    input.id = span.id + '-input';
    input.placeholder = `Enter ${label.toLowerCase()}...`;
    item.replaceChild(input, span);
  });
  editProfileBtn.classList.add('hidden');
  editActions.classList.remove('hidden');
}

// Save profile changes to Firestore using modular syntax
function saveChanges() {
  showLoading(true);
  const uid = auth.currentUser.uid;
  // Retrieve updated values from the input fields
  const fullNameInput = document.getElementById('user-fullname-input');
  const phoneInput = document.getElementById('user-phone-input');
  const addressInput = document.getElementById('user-address-input');
  const countryInput = document.getElementById('user-country-input');
  const cityInput = document.getElementById('user-city-input');

  const updates = {
    fullName: fullNameInput.value.trim() || currentUserData.fullName,
    phoneNumber: phoneInput.value.trim() || currentUserData.phoneNumber,
    address: addressInput.value.trim() || currentUserData.address,
    country: countryInput.value.trim() || currentUserData.country,
    city: cityInput.value.trim() || currentUserData.city,
  };

  const userRef = doc(db, 'users', uid);
  updateDoc(userRef, updates)
    .then(() => {
      showToast('Profile updated successfully', 'success');
      loadUserProfile(uid);
      exitEditMode();
      showLoading(false);
    })
    .catch((error) => {
      console.error('Error updating profile:', error);
      showToast('Error updating profile', 'error');
      showLoading(false);
    });
}

// Exit edit mode and revert inputs back to spans
function exitEditMode() {
  const profileItems = document.querySelectorAll('.profile-item');
  profileItems.forEach((item) => {
    const input = item.querySelector('input');
    if (!input) return;
    const span = document.createElement('span');
    span.id = input.id.replace('-input', '');
    span.textContent = input.value.trim() || 'Not set';
    item.replaceChild(span, input);
  });
  editProfileBtn.classList.remove('hidden');
  editActions.classList.add('hidden');
}

// Toggle mobile sidebar visibility
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('active');
}

// Show/hide loading state for the Save button
function showLoading(isLoading) {
  if (isLoading) {
    saveChangesBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveChangesBtn.disabled = true;
  } else {
    saveChangesBtn.innerHTML = 'Save Changes';
    saveChangesBtn.disabled = false;
  }
}

// Toast notification function
function showToast(message, type = 'info') {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
    const style = document.createElement('style');
    style.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
      }
      .toast {
        margin-bottom: 10px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        animation: toast-in 0.3s ease, toast-out 0.3s ease 2.7s forwards;
        max-width: 300px;
      }
      .toast.success { background-color: #10b981; }
      .toast.error { background-color: #ef4444; }
      .toast.info { background-color: #3b82f6; }
      .toast i { margin-right: 8px; }
      @keyframes toast-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes toast-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Logout user and redirect to homepage
function logout() {
  auth
    .signOut()
    .then(() => {
      window.location.href = '../../index.html';
    })
    .catch((error) => {
      console.error('Error signing out:', error);
      showToast('Error signing out', 'error');
    });
}

// Event Listeners
editProfileBtn.addEventListener('click', toggleEditMode);
saveChangesBtn.addEventListener('click', saveChanges);
cancelEditBtn.addEventListener('click', exitEditMode);
logoutBtn.addEventListener('click', logout);
hamburgerMenu.addEventListener('click', toggleSidebar);

viewOrdersBtn.addEventListener('click', () => {
  window.location.href = '../OrderHistory/Orderhistory.html';
});
securitySettingsBtn.addEventListener('click', () => {
  window.location.href = '../securitysettings/securitysettings.html';
});
paymentMethodsBtn.addEventListener('click', () => {
  window.location.href = '../securitysettings/securitysettings.html';
});
