// Tab filtering functionality
const tabs = document.querySelectorAll('.order-tabs .tab');
const orderItems = document.querySelectorAll('.order-item');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const status = tab.getAttribute('data-status');

    orderItems.forEach((item) => {
      // Show all orders if "all" tab is selected,
      // otherwise filter by data-status attribute.
      if (status === 'all' || item.getAttribute('data-status') === status) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
});

// Order actions functionality
document.querySelectorAll('.cancel-order').forEach((button) => {
  button.addEventListener('click', () => {
    alert('Order cancelled!');
  });
});

document.querySelectorAll('.request-return').forEach((button) => {
  button.addEventListener('click', () => {
    alert('Return requested!');
  });
});
document.querySelectorAll('.rate-order').forEach((button) => {
  button.addEventListener('click', () => {
    alert('Rate order functionality here!');
    window.location.href = '../rateproduct/rateproduct.html';
  });
});
