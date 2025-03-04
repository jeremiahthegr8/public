// mycart.js
import { auth, db } from '../../../database/config.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Load the user's cart items, merge with product details from "listings", and render them.
async function loadCartItems() {
  if (!auth.currentUser) {
    document.querySelector('.cart-grid').innerHTML =
      '<p>Please sign in to view your cart.</p>';
    return;
  }

  const userId = auth.currentUser.uid;
  const cartRef = collection(db, 'users', userId, 'cart');
  const cartSnapshot = await getDocs(cartRef);

  // Create an array of cart items containing listing ID and quantity
  const cartItems = cartSnapshot.docs.map((docSnap) => ({
    id: docSnap.id, // This is the listing ID
    quantity: parseInt(docSnap.data().quantity, 10),
  }));

  // For each cart item, fetch the product details from the "listings" collection.
  const productPromises = cartItems.map((item) =>
    getDoc(doc(db, 'listings', item.id)).then((productSnap) => {
      if (productSnap.exists()) {
        // Merge listing details with the cart quantity.
        return {
          ...productSnap.data(),
          id: item.id,
          quantity: item.quantity,
        };
      } else {
        return null;
      }
    })
  );

  // Wait for all product fetches to complete.
  let products = await Promise.all(productPromises);
  // Filter out any items that may not exist.
  products = products.filter((product) => product !== null);

  // If no products exist, hide checkout container and display empty cart message.
  if (products.length === 0) {
    const cartGrid = document.querySelector('.cart-grid');
    cartGrid.innerHTML = `
      <p>Your cart is empty.</p>
      <button class="btn btn-primary shop-btn">Shop Now</button>
    `;
    // Hide the checkout container if present.
    const checkoutContainer = document.querySelector('.checkout-container');
    if (checkoutContainer) {
      checkoutContainer.style.display = 'none';
    }
    // Attach event listener to the shop button.
    const shopBtn = document.querySelector('.shop-btn');
    shopBtn.addEventListener('click', () => {
      window.location.href = '../../../index.html'; // Adjust URL as needed
    });
  } else {
    // Show the checkout container if products exist.
    const checkoutContainer = document.querySelector('.checkout-container');
    if (checkoutContainer) {
      checkoutContainer.style.display = 'block';
    }
    renderCartItems(products);
    attachCartActions(); // Attach event listeners for update and remove actions.
  }
}

// Render cart items into the cart grid.
function renderCartItems(products) {
  const cartGrid = document.querySelector('.cart-grid');
  cartGrid.innerHTML = ''; // Clear any previous content

  products.forEach((product) => {
    const cartItem = document.createElement('div');
    cartItem.classList.add('cart-item');
    // Save the listing ID (document ID) for later updates.
    cartItem.dataset.itemId = product.id;

    // Convert price to a number if necessary. Adjust as needed.
    const price = parseFloat(product.price);

    cartItem.innerHTML = `
      <div class="cart-item-image">
        <img src="${product.mainImageUrl || 'placeholder.png'}" alt="${
      product.name
    }" />
      </div>
      <div class="cart-item-details">
        <h3>${product.name}</h3>
        <p class="price">$${price.toFixed(2)}</p>
        <p class="description">${product.description || ''}</p>
        <div class="quantity">
          <label for="quantity-${product.id}">Quantity:</label>
          <input type="number" id="quantity-${product.id}" name="quantity-${
      product.id
    }" value="${product.quantity}" min="1" />
        </div>
        <div class="cart-item-actions">
          <button class="btn btn-primary update-btn">
            <i class="fas fa-sync-alt"></i> Update
          </button>
          <button class="btn btn-secondary remove-btn">
            <i class="fas fa-trash"></i> Remove
          </button>
        </div>
      </div>
    `;
    cartGrid.appendChild(cartItem);
  });
}

// Attach event listeners to update and remove buttons.
function attachCartActions() {
  const cartItems = document.querySelectorAll('.cart-item');
  cartItems.forEach((item) => {
    const itemId = item.dataset.itemId;
    const updateBtn = item.querySelector('.update-btn');
    const removeBtn = item.querySelector('.remove-btn');
    const quantityInput = item.querySelector('input[type="number"]');

    updateBtn.addEventListener('click', async () => {
      const newQuantity = parseInt(quantityInput.value, 10);
      if (isNaN(newQuantity) || newQuantity < 1) {
        alert('Please enter a valid quantity.');
        return;
      }
      await updateCartItemQuantity(itemId, newQuantity);
    });

    removeBtn.addEventListener('click', async () => {
      await removeCartItem(itemId);
    });
  });
}

// Update a cart item's quantity in Firestore.
async function updateCartItemQuantity(itemId, newQuantity) {
  const userId = auth.currentUser.uid;
  const itemRef = doc(db, 'users', userId, 'cart', itemId);
  // If quantity is less than or equal to zero, remove the item.
  if (newQuantity <= 0) {
    await deleteDoc(itemRef);
  } else {
    await updateDoc(itemRef, { quantity: newQuantity });
  }
  alert('Cart updated!');
  loadCartItems(); // Reload the cart items to reflect changes.
}

// Remove a cart item from Firestore and update the aggregated cartCount.
async function removeCartItem(itemId) {
  const userId = auth.currentUser.uid;
  const itemRef = doc(db, 'users', userId, 'cart', itemId);
  // Retrieve the item's quantity before deletion.
  const itemSnap = await getDoc(itemRef);
  if (itemSnap.exists()) {
    const quantity = itemSnap.data().quantity || 0;
    // Decrement the user's aggregated cartCount by the item's quantity.
    await updateDoc(doc(db, 'users', userId), {
      cartCount: increment(-quantity),
    });
  }
  await deleteDoc(itemRef);
  alert('Item removed from cart!');
  loadCartItems(); // Reload the cart items after removal.
}

// Listen for auth state changes and load cart items accordingly.
auth.onAuthStateChanged((user) => {
  if (user) {
    loadCartItems();
  } else {
    document.querySelector('.cart-grid').innerHTML =
      '<p>Please sign in to view your cart.</p>';
  }
});
