// Star rating functionality
const stars = document.querySelectorAll('.star');
const issueSelection = document.querySelector('.issue-selection');
let currentRating = 0;

stars.forEach((star) => {
  star.addEventListener('click', () => {
    const value = parseInt(star.getAttribute('data-value'));
    currentRating = value;

    // Reset all stars
    stars.forEach((s) => s.classList.remove('active'));

    // Activate stars up to selected one
    stars.forEach((s) => {
      if (parseInt(s.getAttribute('data-value')) <= value) {
        s.classList.add('active');
      }
    });

    // Show issue selection for low ratings (1-2 stars)
    if (value <= 2) {
      issueSelection.classList.add('visible');
    } else {
      issueSelection.classList.remove('visible');
    }
  });
});

// Report modal functionality
const reportButton = document.querySelector('.report-button');
const reportModal = document.querySelector('.report-modal');
const closeModal = document.querySelector('.close-modal');
const reportOptions = document.querySelectorAll('.report-option');

reportButton.addEventListener('click', () => {
  reportModal.classList.add('visible');
});

closeModal.addEventListener('click', () => {
  reportModal.classList.remove('visible');
});

reportOptions.forEach((option) => {
  option.addEventListener('click', () => {
    reportOptions.forEach((o) => o.classList.remove('selected'));
    option.classList.add('selected');
  });
});

// Close modal when clicking outside
reportModal.addEventListener('click', (e) => {
  if (e.target === reportModal) {
    reportModal.classList.remove('visible');
  }
});
