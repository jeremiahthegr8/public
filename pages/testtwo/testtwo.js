import {
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { db } from '../../database/config.js';
document.addEventListener('DOMContentLoaded', function () {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
  const productsGrid = document.getElementById('products-grid');
  const quickViewModal = document.getElementById('quick-view-modal');
  const closeQuickViewBtn = document.getElementById('close-quick-view');

  function loadProducts() {
    db.collection('listings')
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const product = { id: doc.id, ...doc.data() };
          createProductCard(product);
        });
      });
  }

  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const cartItem = cart.find((item) => item.id === product.id);

    card.innerHTML = `
            <div class="product-image">
                <img src="${product.mainImageUrl}" alt="${product.name}">
            </div>
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <div class="product-actions">
                ${
                  cartItem
                    ? createCartControlHTML(product, cartItem.quantity)
                    : `
                    <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
                `
                }
                <button class="wishlist-btn" data-id="${product.id}">
                    <i class="far fa-heart ${
                      wishlist.some((w) => w.id === product.id)
                        ? 'fas active'
                        : ''
                    }"></i>
                </button>
            </div>
        `;

    card.querySelector('.product-image').addEventListener('click', function () {
      showQuickView(product);
    });

    const cartActionElement = card.querySelector(
      '.add-to-cart-btn, .cart-quantity-control'
    );
    if (cartActionElement) {
      cartActionElement.addEventListener('click', function (e) {
        if (e.target.classList.contains('add-to-cart-btn')) {
          addToCart(product);
        } else if (e.target.classList.contains('increment-btn')) {
          incrementCartItem(product.id);
        } else if (e.target.classList.contains('decrement-btn')) {
          decrementCartItem(product.id);
        }
      });
    }

    card.querySelector('.wishlist-btn').addEventListener('click', function (e) {
      toggleWishlist(product, e.currentTarget.querySelector('i'));
    });

    productsGrid.appendChild(card);
  }

  function createCartControlHTML(product, quantity) {
    return `
            <div class="cart-quantity-control" data-id="${product.id}">
                <button class="decrement-btn">-</button>
                <span class="quantity">${quantity}</span>
                <button class="increment-btn">+</button>
            </div>
        `;
  }

  function addToCart(product) {
    const existingProductIndex = cart.findIndex(
      (item) => item.id === product.id
    );

    if (existingProductIndex === -1) {
      cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateProductCartDisplay(product);
  }

  function incrementCartItem(productId) {
    const cartItemIndex = cart.findIndex((item) => item.id === productId);

    if (cartItemIndex > -1) {
      cart[cartItemIndex].quantity += 1;
      saveCart();
      updateProductCartDisplay(cart[cartItemIndex]);
    }
  }

  function decrementCartItem(productId) {
    const cartItemIndex = cart.findIndex((item) => item.id === productId);

    if (cartItemIndex > -1) {
      if (cart[cartItemIndex].quantity > 1) {
        cart[cartItemIndex].quantity -= 1;
      } else {
        cart.splice(cartItemIndex, 1);
      }
      saveCart();
      updateProductCartDisplay({ id: productId });
    }
  }

  function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  function updateProductCartDisplay(product) {
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach((container) => {
      const cartActionElement = container.querySelector(
        `[data-id="${product.id}"]`
      );

      if (cartActionElement) {
        const parentElement = cartActionElement.closest('.product-actions');

        if (cart.find((item) => item.id === product.id)) {
          const cartItem = cart.find((item) => item.id === product.id);
          parentElement.innerHTML = createCartControlHTML(
            product,
            cartItem.quantity
          );
        } else {
          parentElement.innerHTML = `
                        <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
                    `;
        }
      }
    });
  }

  function toggleWishlist(product, icon) {
    const existingProductIndex = wishlist.findIndex(
      (item) => item.id === product.id
    );

    if (existingProductIndex > -1) {
      wishlist.splice(existingProductIndex, 1);
      icon.classList.remove('fas', 'active');
      icon.classList.add('far');
    } else {
      wishlist.push(product);
      icon.classList.remove('far');
      icon.classList.add('fas', 'active');
    }
    saveWishlist();
  }

  function saveWishlist() {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }

  closeQuickViewBtn.addEventListener('click', function () {
    quickViewModal.style.display = 'none';
  });

  loadProducts();
});
