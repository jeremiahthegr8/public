// Tab controls functionality
const tabs = document.querySelectorAll('.tab');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    // Here would go logic to filter reviews by star rating
  });
});

// Filter modal
const filterToggle = document.getElementById('filter-toggle');
const filterModal = document.getElementById('filter-modal');
const closeFilter = document.getElementById('close-filter');

filterToggle.addEventListener('click', () => {
  filterModal.classList.add('visible');
});

closeFilter.addEventListener('click', () => {
  filterModal.classList.remove('visible');
});

// Close modal when clicking outside
filterModal.addEventListener('click', (e) => {
  if (e.target === filterModal) {
    filterModal.classList.remove('visible');
  }
});

// Pagination functionality
const pageButtons = document.querySelectorAll(
  '.page-button:not(.prev):not(.next)'
);
pageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    pageButtons.forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    // Here would go logic to load the appropriate page of reviews
  });
});
