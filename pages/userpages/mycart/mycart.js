// Add functionality for cart items
document.querySelectorAll('.cart-item-actions .btn').forEach((button) => {
  button.addEventListener('click', (e) => {
    const action = e.target.closest('button').textContent.trim();
    const item = e.target.closest('.cart-item');
    if (action.includes('Update')) {
      alert('Cart updated!');
    } else if (action.includes('Remove')) {
      item.remove();
      alert('Item removed from cart!');
    }
  });
});
