import { auth, db } from '../../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

let currentUser = null; // Authenticated user
let userCart = {}; // { listingId: quantity }
let userWishlist = []; // [listingId, ...]
let listingsData = []; // All listings loaded

document.addEventListener('DOMContentLoaded', () => {
  // Header elements
  const signupLink = document.querySelector('.signup-link');
  const accountLink = document.querySelector('.account-link');
  const logoutBtn = document.querySelector('.logout-btn');
  const cartIcon = document.querySelector('.fa-shopping-cart').parentElement;
  const wishlistIcon = document.querySelector('.fa-heart').parentElement;

  // Listen to auth state changes
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

      // Fetch the user's cart/wishlist subcollections and update counters
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

      // For guests, no cart/wishlist state
      userCart = {};
      userWishlist = [];
      fetchListings();
    }
  });

  // Logout functionality
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => location.reload())
      .catch((error) => console.error('Logout Error:', error));
  });

  // Fetch the user's cart and wishlist subcollections and update counters
  async function fetchUserData() {
    if (!currentUser) return;
    await Promise.all([fetchUserCart(), fetchUserWishlist()]);
    await updateUserCounters(); // Update cartCount & wishlistCount fields
    updateHeaderCounters();
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

  // Fetch all listings from Firestore
  async function fetchListings() {
    try {
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      listingsData = listingsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      displayListings(listingsData);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  }

  // Render the product grid
  function displayListings(listings) {
    const grid = document.querySelector('.grid');
    grid.innerHTML = ''; // Clear existing items

    listings.forEach((listing) => {
      const productItem = document.createElement('div');
      productItem.classList.add('product-item');
      productItem.dataset.id = listing.id;

      // If the item is in the cart, display the cart controls (with - , quantity, +, remove)
      let cartHTML = '';
      if (userCart.hasOwnProperty(listing.id)) {
        cartHTML = `
          <div class="cart-controls" data-id="${listing.id}">
            <button class="decrease">-</button>
            <span class="quantity">${userCart[listing.id]}</span>
            <button class="increase">+</button>
            <button class="remove"><i class="fas fa-trash"></i></button>
          </div>
        `;
      } else {
        cartHTML = `<a href="#" class="add-to-cart"><i class="fas fa-shopping-cart"></i></a>`;
      }

      // For wishlist: add the "active" class if the item is present.
      const wishlistClass = userWishlist.includes(listing.id)
        ? 'add-to-wishlist active'
        : 'add-to-wishlist';

      productItem.innerHTML = `
        <img src="${listing.mainImageUrl}" alt="Image of ${
        listing.name
      }" width="300" height="300">
        <h3>${listing.name}</h3>
        <p>${listing.description}</p>
        <p class="price">$${listing.price}</p>
        <p class="stock">In Stock: ${listing.quantity}</p>
        <div class="rating">
          ${generateStars(listing.rating)} <span class="count">(${
        listing.ratingCount || 0
      })</span>
        </div>
        <div class="buttons">
          ${cartHTML}
          <a href="#" class="${wishlistClass}"><i class="fas fa-heart"></i></a>
        </div>
      `;

      grid.appendChild(productItem);

      // Attach event listeners if user is logged in
      if (currentUser) {
        if (!userCart.hasOwnProperty(listing.id)) {
          const addToCartBtn = productItem.querySelector('.add-to-cart');
          addToCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addToCart(listing);
          });
        } else {
          const cartControls = productItem.querySelector('.cart-controls');
          cartControls
            .querySelector('.decrease')
            .addEventListener('click', (e) => {
              e.preventDefault();
              const currentQty = userCart[listing.id];
              if (currentQty <= 1) {
                removeFromCart(listing);
              } else {
                updateCartItemQuantity(listing, currentQty - 1);
              }
            });
          cartControls
            .querySelector('.increase')
            .addEventListener('click', (e) => {
              e.preventDefault();
              const currentQty = userCart[listing.id];
              updateCartItemQuantity(listing, currentQty + 1);
            });
          cartControls
            .querySelector('.remove')
            .addEventListener('click', (e) => {
              e.preventDefault();
              removeFromCart(listing);
            });
        }
        const wishlistBtn = productItem.querySelector('.add-to-wishlist');
        wishlistBtn.addEventListener('click', (e) => {
          e.preventDefault();
          toggleWishlist(listing);
        });
      } else {
        // For guests, redirect to sign-up page when clicking these buttons
        productItem
          .querySelector('.add-to-cart')
          .addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../SignUp/SignUp.html';
          });
        productItem
          .querySelector('.add-to-wishlist')
          .addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '../SignUp/SignUp.html';
          });
      }
    });
  }

  // Helper to generate rating stars
  function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) {
      starsHtml += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
      starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      starsHtml += '<i class="far fa-star"></i>';
    }
    return starsHtml;
  }

  // Update header badges with blue background
  function updateHeaderCounters() {
    // Cart badge
    const cartLink = document.querySelector('.fa-shopping-cart').parentElement;
    let cartBadge = cartLink.querySelector('.cart-badge');
    if (!cartBadge) {
      cartBadge = document.createElement('span');
      cartBadge.classList.add('cart-badge');
      cartBadge.style.background = 'rgb(29, 240, 10)';
      cartBadge.style.color = '#fff';
      cartBadge.style.borderRadius = '50%';
      cartBadge.style.padding = '0 6px';
      cartBadge.style.marginLeft = '5px';
      cartLink.appendChild(cartBadge);
    }
    const cartCount = Object.values(userCart).reduce(
      (sum, qty) => sum + qty,
      0
    );
    cartBadge.textContent = cartCount;

    // Wishlist badge
    const wishlistLink = document.querySelector('.fa-heart').parentElement;
    let wishlistBadge = wishlistLink.querySelector('.wishlist-badge');
    if (!wishlistBadge) {
      wishlistBadge = document.createElement('span');
      wishlistBadge.classList.add('wishlist-badge');
      wishlistBadge.style.background = 'rgb(29, 240, 10)';
      wishlistBadge.style.color = '#fff';
      wishlistBadge.style.borderRadius = '50%';
      wishlistBadge.style.padding = '0 6px';
      wishlistBadge.style.marginLeft = '5px';
      wishlistLink.appendChild(wishlistBadge);
    }
    wishlistBadge.textContent = userWishlist.length;
  }

  // Update the counter fields on the user's document
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

  // Add item to cart: create document in the cart subcollection and update counters
  async function addToCart(listing) {
    if (!currentUser) return;
    const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
    await setDoc(cartDocRef, { quantity: 1 });
    userCart[listing.id] = 1;
    await updateUserCounters();
    updateHeaderCounters();
    displayListings(listingsData);
  }

  // Update cart item quantity: if newQuantity is 0, remove item; otherwise, update quantity
  async function updateCartItemQuantity(listing, newQuantity) {
    if (!currentUser) return;
    const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
    if (newQuantity <= 0) {
      await deleteDoc(cartDocRef);
      delete userCart[listing.id];
    } else {
      await setDoc(cartDocRef, { quantity: newQuantity });
      userCart[listing.id] = newQuantity;
    }
    await updateUserCounters();
    updateHeaderCounters();
    displayListings(listingsData);
  }

  // Remove item from cart entirely
  async function removeFromCart(listing) {
    if (!currentUser) return;
    const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
    await deleteDoc(cartDocRef);
    delete userCart[listing.id];
    await updateUserCounters();
    updateHeaderCounters();
    displayListings(listingsData);
  }

  // Toggle wishlist: add if not present, remove if already there; then update counters
  async function toggleWishlist(listing) {
    if (!currentUser) return;
    const wishlistDocRef = doc(
      db,
      'users',
      currentUser.uid,
      'wishlist',
      listing.id
    );
    if (userWishlist.includes(listing.id)) {
      await deleteDoc(wishlistDocRef);
      userWishlist = userWishlist.filter((id) => id !== listing.id);
    } else {
      await setDoc(wishlistDocRef, { addedAt: new Date() });
      userWishlist.push(listing.id);
    }
    await updateUserCounters();
    updateHeaderCounters();
    displayListings(listingsData);
  }
});
