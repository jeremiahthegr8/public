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
