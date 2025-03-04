// wishlist.js
import { auth, db } from '../../../database/config.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// Utility function to format currency
function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}

// Function to render a single wishlist item
function renderWishlistItem(product) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'wishlist-item';
  itemDiv.innerHTML = `
    <div class="wishlist-item-image">
      <img src="${product.mainImageUrl}" alt="${product.name}" />
    </div>
    <div class="wishlist-item-details">
      <h3>${product.name}</h3>
      <p class="price">${formatCurrency(parseFloat(product.price))}</p>
      <p class="description">${
        product.description || 'No description available.'
      }</p>
      <div class="wishlist-item-actions">
        <button class="btn btn-primary view-item">
          <i class="fas fa-eye"></i> View Item
        </button>
        <button class="btn btn-secondary remove-from-wishlist">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
    </div>
  `;

  // Attach event listener for "View Item" button
  const viewItemBtn = itemDiv.querySelector('.view-item');
  viewItemBtn.addEventListener('click', () => {
    // Redirect to the product page. Adjust the URL as needed.
    window.location.href = `../productpage/product.html?id=${product.id}`;
  });

  // Attach event listener for "Remove" button
  const removeBtn = itemDiv.querySelector('.remove-from-wishlist');
  removeBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    try {
      // Remove the wishlist document for this product
      await deleteDoc(
        doc(db, 'users', auth.currentUser.uid, 'wishlist', product.id)
      );
      // Decrement the aggregated wishlistCount by 1
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        wishlistCount: increment(-1),
      });
      alert('Item removed from wishlist!');
      loadWishlistItems(); // Refresh the wishlist view
    } catch (error) {
      console.error('Error removing wishlist item:', error);
      alert('Error removing item from wishlist.');
    }
  });

  return itemDiv;
}

// Function to load wishlist items from Firestore
async function loadWishlistItems() {
  const wishlistGrid = document.querySelector('.wishlist-grid');
  wishlistGrid.innerHTML = ''; // Clear current items

  if (!auth.currentUser) {
    wishlistGrid.innerHTML = '<p>Please sign in to view your wishlist.</p>';
    return;
  }

  try {
    // Query the wishlist subcollection for the current user
    const wishlistRef = collection(
      db,
      'users',
      auth.currentUser.uid,
      'wishlist'
    );
    const wishlistSnapshot = await getDocs(wishlistRef);

    if (wishlistSnapshot.empty) {
      wishlistGrid.innerHTML = `
        <p>Your wishlist is empty.</p>
        <button class="btn btn-primary shop-btn">Shop Now</button>
      `;
      // Attach event listener to the shop button
      const shopBtn = wishlistGrid.querySelector('.shop-btn');
      shopBtn.addEventListener('click', () => {
        window.location.href = '../../../index.html'; // Adjust URL as needed
      });
      return;
    }

    // For each wishlist document, fetch product details from the "listings" collection
    const wishlistItems = await Promise.all(
      wishlistSnapshot.docs.map(async (docSnap) => {
        const productId = docSnap.id;
        const productDoc = await getDoc(doc(db, 'listings', productId));
        if (productDoc.exists()) {
          return { id: productId, ...productDoc.data() };
        } else {
          return null;
        }
      })
    );

    // Filter out any null values (if a product was not found)
    const validItems = wishlistItems.filter((item) => item !== null);

    // Render each wishlist item into the grid
    validItems.forEach((product) => {
      const itemEl = renderWishlistItem(product);
      wishlistGrid.appendChild(itemEl);
    });
  } catch (error) {
    console.error('Error loading wishlist items:', error);
    wishlistGrid.innerHTML =
      '<p>Error loading wishlist items. Please try again later.</p>';
  }
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadWishlistItems();
  } else {
    const wishlistGrid = document.querySelector('.wishlist-grid');
    wishlistGrid.innerHTML = '<p>Please sign in to view your wishlist.</p>';
  }
});

// Optionally, load wishlist items on DOMContentLoaded if the user is already signed in
document.addEventListener('DOMContentLoaded', () => {
  if (auth.currentUser) {
    loadWishlistItems();
  }
});
