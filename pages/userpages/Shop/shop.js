import { auth, db } from '../../../database/config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Handle authentication UI
document.addEventListener('DOMContentLoaded', () => {
  const signupLink = document.querySelector('.signup-link');
  const accountLink = document.querySelector('.account-link');
  const logoutBtn = document.querySelector('.logout-btn');
  const cartIcon = document.querySelector('.fa-shopping-cart').parentElement;
  const wishlistIcon = document.querySelector('.fa-heart').parentElement;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      signupLink.style.display = 'none';
      accountLink.style.display = 'block';
      logoutBtn.style.display = 'block';

      cartIcon.addEventListener('click', () => {
        window.location.href = '../cart/mycart.html';
      });

      wishlistIcon.addEventListener('click', () => {
        window.location.href = '../wishlist/wishlist.html';
      });
    } else {
      signupLink.style.display = 'block';
      accountLink.style.display = 'none';
      logoutBtn.style.display = 'none';

      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../SignUp/SignUp.html';
      });

      wishlistIcon.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '../SignUp/SignUp.html';
      });
    }
  });

  // Logout functionality
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => location.reload())
      .catch((error) => console.error('Logout Error:', error));
  });
});
