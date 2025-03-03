// Tab switching functionality
const tabs = document.querySelectorAll('.settings-tabs .tab');
const tabContents = document.querySelectorAll('.tab-content');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((tc) => tc.classList.remove('active'));
    tab.classList.add('active');
    document
      .getElementById(tab.getAttribute('data-tab'))
      .classList.add('active');
  });
});

// Card number formatting (insert a space after every 4 digits)
const cardNumberInput = document.getElementById('cardNumber');
cardNumberInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '').slice(0, 16);
  let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
  e.target.value = formattedValue;
});

// Remove saved card functionality
document.querySelectorAll('.remove-card').forEach((button) => {
  button.addEventListener('click', (e) => {
    e.target.closest('.card-item').remove();
    alert('Card removed.');
  });
});

// Profile form submission
document.getElementById('profileForm').addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Profile changes saved!');
});

// Password change link request with 1 minute timer
const passwordButton = document.getElementById('requestPasswordChange');
const passwordTimer = document.getElementById('passwordTimer');
passwordButton.addEventListener('click', () => {
  passwordButton.disabled = true;
  alert('Password change link sent! (Valid for 1 minute)');
  let timeLeft = 60;
  passwordTimer.textContent = `(${timeLeft}s)`;
  const timerInterval = setInterval(() => {
    timeLeft--;
    passwordTimer.textContent = `(${timeLeft}s)`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      passwordTimer.textContent = '';
      passwordButton.disabled = false;
    }
  }, 1000);
});

// Recovery email update
document
  .getElementById('recoveryEmailForm')
  .addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Recovery email updated!');
  });

// Payment form submission
document.getElementById('paymentForm').addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Payment method updated!');
});

// Delete account confirmation
document.getElementById('deleteAccount').addEventListener('click', () => {
  if (
    confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )
  ) {
    alert('Account deleted.');
  }
});

// Download data action
document.getElementById('downloadData').addEventListener('click', () => {
  alert('Your data is being prepared for download.');
});

// Additional functionality (e.g., 2FA toggle, session timeout changes, active session logout) can be implemented as needed.
