import { auth, db } from '../../../database/config.js';
import {
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// DOM Elements for displaying seller details
const sellerNameElement = document.getElementById('seller-name');
const sellerSpecializationElement = document.getElementById(
  'seller-specialization'
);
const sellerRatingElement = document.getElementById('seller-rating');
const sellerEmailElement = document.getElementById('seller-email');
const sellerPhoneElement = document.getElementById('seller-phone');
const totalRevenueElement = document.getElementById('total-revenue');
const totalSalesElement = document.getElementById('total-sales');
const activeListingsElement = document.getElementById('active-listings');
const memberSinceElement = document.getElementById('member-since');
const returnPolicyElement = document.getElementById('return-policy');
const shippingPolicyElement = document.getElementById('shipping-policy');
const sellerAvatarImg = document.querySelector('.user-avatar img');
const businessNameElement = document.getElementById('business-name');

const editProfileBtn = document.getElementById('edit-profile-btn');
const logoutBtn = document.getElementById('logout-btn');

// Listen for authentication state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    // Retrieve user document from the "users" collection
    const userRef = doc(db, 'users', user.uid);
    getDoc(userRef)
      .then((docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          // If sellerStatus is not true or sellerID is missing, redirect to registration
          if (!userData.sellerStatus || !userData.sellerID) {
            window.location.href = '../registerseller/registerseller.html';
            return;
          }
          // Otherwise, load the seller profile using the sellerID stored in the user's document
          loadSellerProfile(userData.sellerID);
        } else {
          window.location.href = '../registerseller/registerseller.html';
        }
      })
      .catch((error) => {
        alert('Error loading user details: ' + error.message);
      });
  } else {
    window.location.href = '../../../index.html';
  }
});

// Load seller profile from Firestore's "sellers" collection using the sellerID
function loadSellerProfile(sellerID) {
  const sellerRef = doc(db, 'sellers', sellerID);
  getDoc(sellerRef)
    .then((docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // Display seller details
        sellerNameElement.textContent =
          data.fullName || 'not found';
        businessNameElement.textContent = data.businessName || 'not found';
        sellerSpecializationElement.textContent =
          data.businessType || data.storeName || 'Not set';
        sellerRatingElement.textContent = `☆☆☆☆☆ ${data.rating || 0}/5 (${
          data.reviews || 0
        } reviews)`;
        sellerEmailElement.textContent = `Email: ${data.email || 'Not set'}`;
        sellerPhoneElement.textContent = `Phone: ${data.phone || 'Not set'}`;
        totalRevenueElement.textContent = `$${data.totalRevenue || 0}`;
        totalSalesElement.textContent = data.receivedOrders || 0;
        activeListingsElement.textContent = data.activeListings || 0;
        memberSinceElement.textContent = data.memberSince || 'N/A';
        returnPolicyElement.textContent = data.returnPolicy || 'Custom';
        shippingPolicyElement.textContent = data.shippingPolicy || 'Over $30';
        // Update the seller avatar if a profile picture URL was provided
        if (data.profilePicUrl) {
          sellerAvatarImg.src = data.profilePicUrl;
        }
      } else {
        alert('Seller profile not found.');
        window.location.href = '../registerseller/registerseller.html';
      }
    })
    .catch((error) => {
      alert('Error loading seller profile: ' + error.message);
    });
}

// When the Edit button is clicked, redirect to the seller settings page
editProfileBtn.addEventListener('click', () => {
  window.location.href = '../sellersettings/sellersettings.html';
});

// Logout user: sign out and redirect to homepage
logoutBtn.addEventListener('click', () => {
  auth
    .signOut()
    .then(() => {
      window.location.href = '../../../index.html';
    })
    .catch((error) => {
      alert('Error signing out: ' + error.message);
    });
});
