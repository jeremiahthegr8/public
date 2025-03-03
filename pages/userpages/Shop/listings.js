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
