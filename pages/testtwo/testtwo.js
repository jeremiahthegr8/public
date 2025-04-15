// wishlist.js
import {
  doc,
  setDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

export async function toggleWishlist(db, currentUser, listing, userWishlist) {
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
    const index = userWishlist.indexOf(listing.id);
    if (index > -1) userWishlist.splice(index, 1);
  } else {
    await setDoc(wishlistDocRef, { addedAt: new Date() });
    userWishlist.push(listing.id);
  }
}
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
// listings.js
export function generateStars(rating) {
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

export function displayListings(
  listings,
  userCart,
  userWishlist,
  currentUser,
  addToCartCallback,
  updateCartItemQuantityCallback,
  removeFromCartCallback,
  toggleWishlistCallback
) {
  const grid = document.querySelector('.grid');
  grid.innerHTML = '';

  listings.forEach((listing) => {
    const productItem = document.createElement('div');
    productItem.classList.add('product-item');
    productItem.dataset.id = listing.id;

    // If the item is in the cart, show nicely styled cart controls
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

    if (currentUser) {
      if (!userCart.hasOwnProperty(listing.id)) {
        const addToCartBtn = productItem.querySelector('.add-to-cart');
        addToCartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          addToCartCallback(listing);
        });
      } else {
        const cartControls = productItem.querySelector('.cart-controls');
        cartControls
          .querySelector('.decrease')
          .addEventListener('click', (e) => {
            e.preventDefault();
            const currentQty = userCart[listing.id];
            if (currentQty <= 1) {
              removeFromCartCallback(listing);
            } else {
              updateCartItemQuantityCallback(listing, currentQty - 1);
            }
          });
        cartControls
          .querySelector('.increase')
          .addEventListener('click', (e) => {
            e.preventDefault();
            const currentQty = userCart[listing.id];
            updateCartItemQuantityCallback(listing, currentQty + 1);
          });
        cartControls.querySelector('.remove').addEventListener('click', (e) => {
          e.preventDefault();
          removeFromCartCallback(listing);
        });
      }
      const wishlistBtn = productItem.querySelector('.add-to-wishlist');
      wishlistBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleWishlistCallback(listing);
      });
    } else {
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
// filters.js

// Get active filters from the sidebar and the search input.
export function getActiveFilters() {
  // Get categories (assumes inputs with name="category" and value like "electronics")
  const categories = Array.from(
    document.querySelectorAll('input[name="category"]:checked')
  ).map((el) => el.value);

  // Get price range (assumes an input with id="priceRange")
  const priceRangeElement = document.getElementById('priceRange');
  const maxPrice = priceRangeElement
    ? parseFloat(priceRangeElement.value)
    : 1000;

  // Get rating filters (assumes inputs with name="rating", values like "4stars")
  const ratings = Array.from(
    document.querySelectorAll('input[name="rating"]:checked')
  ).map((el) => parseInt(el.value));

  // Get brand filters (assumes inputs with name="brand")
  const brands = Array.from(
    document.querySelectorAll('input[name="brand"]:checked')
  ).map((el) => el.value);

  // Get availability filters (assumes inputs with name="availability" and values "inStock" or "outOfStock")
  const availabilities = Array.from(
    document.querySelectorAll('input[name="availability"]:checked')
  ).map((el) => el.value);

  return { categories, maxPrice, ratings, brands, availabilities };
}

// Filter the full listings array based on the provided filters and search term.
export function filterListings(listings, filters, searchTerm) {
  return listings.filter((listing) => {
    // Search filtering: Check if the listing name or description contains the search term.
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      if (
        !listing.name.toLowerCase().includes(lowerSearch) &&
        !listing.description.toLowerCase().includes(lowerSearch)
      ) {
        return false;
      }
    }

    // Category filter: If one or more categories are active, listing.category must match one.
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(listing.category)
    ) {
      return false;
    }

    // Price filter: listing.price (converted to a number) must be less than or equal to maxPrice.
    if (listing.price && parseFloat(listing.price) > filters.maxPrice) {
      return false;
    }

    // Rating filter: if any rating filter is active, listing.rating must be greater than or equal to the minimum.
    if (filters.ratings.length > 0) {
      const minRating = Math.min(...filters.ratings);
      if (listing.rating < minRating) {
        return false;
      }
    }

    // Brand filter: if active, listing.brand must match one of the selected brands.
    if (
      filters.brands.length > 0 &&
      listing.brand &&
      !filters.brands.includes(listing.brand)
    ) {
      return false;
    }

    // Availability filter: For "inStock", listing.quantity must be > 0; for "outOfStock", listing.quantity <= 0.
    if (filters.availabilities.length > 0) {
      // If "inStock" is checked, skip items that are out of stock.
      if (
        filters.availabilities.includes('inStock') &&
        parseInt(listing.quantity) <= 0
      ) {
        return false;
      }
      // If "outOfStock" is checked, skip items that are in stock.
      if (
        filters.availabilities.includes('outOfStock') &&
        parseInt(listing.quantity) > 0
      ) {
        return false;
      }
    }

    return true;
  });
}
// header.js
export function updateHeaderCounters(userCart, userWishlist) {
  // Update Cart Badge
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
  const cartCount = Object.values(userCart).reduce((sum, qty) => sum + qty, 0);
  cartBadge.textContent = cartCount;

  // Update Wishlist Badge
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
// cart.js
import {
  doc,
  setDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

export async function addToCart(db, currentUser, listing, userCart) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  await setDoc(cartDocRef, { quantity: 1 });
  userCart[listing.id] = 1;
}

export async function updateCartItemQuantity(
  db,
  currentUser,
  listing,
  newQuantity,
  userCart
) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  if (newQuantity <= 0) {
    await deleteDoc(cartDocRef);
    delete userCart[listing.id];
  } else {
    await setDoc(cartDocRef, { quantity: newQuantity });
    userCart[listing.id] = newQuantity;
  }
}

export async function removeFromCart(db, currentUser, listing, userCart) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  await deleteDoc(cartDocRef);
  delete userCart[listing.id];
}
