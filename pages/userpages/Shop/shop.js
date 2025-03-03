// shop.js
import { auth, db } from '../../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

import { updateHeaderCounters } from './header.js';
import { addToCart, updateCartItemQuantity, removeFromCart } from './cart.js';
import { toggleWishlist } from './wishlist.js';
import { displayListings } from './listings.js';
import { getActiveFilters, filterListings } from './filters.js';

let currentUser = null;
let userCart = {}; // { listingId: quantity }
let userWishlist = []; // [listingId, ...]
let listingsData = []; // All listings loaded

document.addEventListener('DOMContentLoaded', () => {
  const signupLink = document.querySelector('.signup-link');
  const accountLink = document.querySelector('.account-link');
  const logoutBtn = document.querySelector('.logout-btn');
  const cartIcon = document.querySelector('.fa-shopping-cart').parentElement;
  const wishlistIcon = document.querySelector('.fa-heart').parentElement;
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
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
      await fetchUserData();
      fetchListings();
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
      userCart = {};
      userWishlist = [];
      fetchListings();
    }
  });

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => location.reload())
      .catch(console.error);
  });

  async function fetchUserData() {
    if (!currentUser) return;
    await Promise.all([fetchUserCart(), fetchUserWishlist()]);
    await updateUserCounters();
    updateHeaderCounters(userCart, userWishlist);
  }

  async function fetchUserCart() {
    const cartSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'cart')
    );
    userCart = {};
    cartSnapshot.forEach((docSnap) => {
      userCart[docSnap.id] = docSnap.data().quantity;
    });
  }

  async function fetchUserWishlist() {
    const wishlistSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'wishlist')
    );
    userWishlist = [];
    wishlistSnapshot.forEach((docSnap) => {
      userWishlist.push(docSnap.id);
    });
  }

  async function fetchListings() {
    try {
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      listingsData = listingsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      // When listings are first fetched, apply any active filters.
      applyFiltersAndDisplay();
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  }

  // Attach event listeners to filter inputs in the sidebar.
  const filterInputs = document.querySelectorAll('.sidebar input');
  filterInputs.forEach((input) => {
    input.addEventListener('change', () => {
      applyFiltersAndDisplay();
    });
  });

  // Attach event listener for the search button.
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      applyFiltersAndDisplay();
    });
  }

  // Function to apply search and filters to listingsData and display the filtered results.
  function applyFiltersAndDisplay() {
    const filters = getActiveFilters();
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const filteredListings = filterListings(listingsData, filters, searchTerm);
    // Use the displayListings function from listings.js (which accepts callbacks for cart/wishlist actions).
    displayListings(
      filteredListings,
      userCart,
      userWishlist,
      currentUser,
      async (listing) => {
        await addToCart(db, currentUser, listing, userCart);
        await updateUserCounters();
        updateHeaderCounters(userCart, userWishlist);
        applyFiltersAndDisplay();
      },
      async (listing, newQuantity) => {
        await updateCartItemQuantity(
          db,
          currentUser,
          listing,
          newQuantity,
          userCart
        );
        await updateUserCounters();
        updateHeaderCounters(userCart, userWishlist);
        applyFiltersAndDisplay();
      },
      async (listing) => {
        await removeFromCart(db, currentUser, listing, userCart);
        await updateUserCounters();
        updateHeaderCounters(userCart, userWishlist);
        applyFiltersAndDisplay();
      },
      async (listing) => {
        await toggleWishlist(db, currentUser, listing, userWishlist);
        await updateUserCounters();
        updateHeaderCounters(userCart, userWishlist);
        applyFiltersAndDisplay();
      }
    );
  }

  async function updateUserCounters() {
    if (!currentUser) return;
    const cartCount = Object.values(userCart).reduce(
      (sum, qty) => sum + qty,
      0
    );
    const wishlistCount = userWishlist.length;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      cartCount,
      wishlistCount,
    });
  }
});
