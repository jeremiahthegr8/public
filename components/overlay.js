// ---------------------------
// OVERLAY TOGGLE FUNCTIONALITY
// ---------------------------
const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signUpButtonSmall = document.getElementById('signUpButtonSmall');
const signInButtonSmall = document.getElementById('signInButtonSmall');
const container = document.getElementById('container');

if (
  signUpButton &&
  signInButton &&
  signUpButtonSmall &&
  signInButtonSmall &&
  container
) {
  signUpButton.addEventListener('click', () => {
    container.classList.add('right-panel-active');
  });
  signUpButtonSmall.addEventListener('click', (e) => {
    e.preventDefault();
    container.classList.add('right-panel-active');
  });
  signInButton.addEventListener('click', () => {
    container.classList.remove('right-panel-active');
  });
  signInButtonSmall.addEventListener('click', (e) => {
    e.preventDefault();
    container.classList.remove('right-panel-active');
  });

  // Toggle forms display based on overlay state
  function toggleForms() {
    const signInFormContainer = document.querySelector('.sign-in-container');
    const signUpFormContainer = document.querySelector('.sign-up-container');
    if (container.classList.contains('right-panel-active')) {
      signInFormContainer.style.display = 'none';
      signUpFormContainer.style.display = 'block';
    } else {
      signInFormContainer.style.display = 'block';
      signUpFormContainer.style.display = 'none';
    }
  }

  signUpButton.addEventListener('click', toggleForms);
  signInButton.addEventListener('click', toggleForms);
  signUpButtonSmall.addEventListener('click', toggleForms);
  signInButtonSmall.addEventListener('click', toggleForms);

  // Initial call to set the correct form display
  toggleForms();
}
