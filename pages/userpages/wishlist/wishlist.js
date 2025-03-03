// Add functionality for wishlist items
document.querySelectorAll('.wishlist-item-actions .btn').forEach((button) => {
  button.addEventListener('click', (e) => {
    const action = e.target.closest('button').textContent.trim();
    const item = e.target.closest('.wishlist-item');
    if (action.includes('Add to Cart')) {
      alert('Item added to cart!');
    } else if (action.includes('Remove')) {
      item.remove();
      alert('Item removed from wishlist!');
    }
  });
});
