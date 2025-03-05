import { auth, db } from '../../../database/config.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// Utility: Mask card number (show only last 4 digits)
function maskCardNumber(cardNumber) {
  const digits = cardNumber.replace(/\s+/g, '');
  return '**** **** **** ' + digits.slice(-4);
}

// Basic Luhn algorithm to validate card number
function isValidCardNumber(number) {
  number = number.replace(/\s+/g, '');
  let sum = 0;
  let shouldDouble = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Render a single payment method item
function renderPaymentMethod(method, methodId) {
  const itemDiv = document.createElement('div');
  itemDiv.className = 'payment-method-item';
  itemDiv.dataset.methodId = methodId;

  let displayText = '';
  if (method.type === 'card') {
    displayText = `Card - ${maskCardNumber(method.cardNumber)} | Exp: ${
      method.expDate
    }`;
  } else if (method.type === 'momo') {
    displayText = `MoMo - ${method.mobileNumber}`;
  }

  itemDiv.innerHTML = `
    <p>${displayText}</p>
    <button class="btn btn-secondary remove-method">
      <i class="fas fa-trash"></i> Remove
    </button>
  `;

  // Remove button handler
  const removeBtn = itemDiv.querySelector('.remove-method');
  removeBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(
        doc(db, 'users', auth.currentUser.uid, 'paymentMethods', methodId)
      );
      alert('Payment method removed.');
      loadPaymentMethods();
    } catch (error) {
      console.error('Error removing payment method:', error);
      alert('Error removing payment method.');
    }
  });

  return itemDiv;
}

// Load saved payment methods from Firestore
async function loadPaymentMethods() {
  const container = document.getElementById('savedCards');
  if (!container) {
    console.error("Container with ID 'savedCards' not found.");
    return;
  }
  container.innerHTML = ''; // Clear container

  if (!auth.currentUser) {
    container.innerHTML = '<p>Please sign in to view your payment methods.</p>';
    return;
  }

  try {
    const methodsRef = collection(
      db,
      'users',
      auth.currentUser.uid,
      'paymentMethods'
    );
    const methodsSnapshot = await getDocs(methodsRef);

    if (methodsSnapshot.empty) {
      container.innerHTML = `
        <p>You don't have any saved payment methods.</p>
        <button class="btn btn-primary add-method-btn">Add Payment Method</button>
      `;
      const addBtn = container.querySelector('.add-method-btn');
      addBtn.addEventListener('click', () => {
        document
          .getElementById('paymentForm')
          .scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    methodsSnapshot.forEach((docSnap) => {
      const method = docSnap.data();
      const methodItem = renderPaymentMethod(method, docSnap.id);
      container.appendChild(methodItem);
    });
  } catch (error) {
    console.error('Error loading payment methods:', error);
    container.innerHTML =
      '<p>Error loading payment methods. Please try again later.</p>';
  }
}

// Toggle the display of form fields based on selected payment type
const paymentMethodRadios = document.querySelectorAll(
  'input[name="paymentMethodType"]'
);
const cardDetailsContainer = document.getElementById('cardDetails');
const momoDetailsContainer = document.getElementById('momoDetails');

paymentMethodRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    if (radio.value === 'card' && radio.checked) {
      cardDetailsContainer.style.display = 'block';
      momoDetailsContainer.style.display = 'none';
    } else if (radio.value === 'momo' && radio.checked) {
      cardDetailsContainer.style.display = 'none';
      momoDetailsContainer.style.display = 'block';
    }
  });
});

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadPaymentMethods();
  } else {
    const container = document.getElementById('savedCards');
    if (container) {
      container.innerHTML =
        '<p>Please sign in to view your payment methods.</p>';
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (auth.currentUser) {
    loadPaymentMethods();
  }
});

// --- New Payment Method Form Submission ---

// Format card number input: auto-insert a space every 4 digits
const cardNumberInput = document.getElementById('cardNumber');
if (cardNumberInput) {
  cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
    e.target.value = formattedValue;
  });
}

// Format expiry date input: auto-insert slash to achieve MM/YY format
const expiryDateInput = document.getElementById('expiryDate');
if (expiryDateInput) {
  expiryDateInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
  });
}

// Handle new payment method form submission
const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // Check if a payment method type is selected
    const paymentTypeElement = document.querySelector(
      'input[name="paymentMethodType"]:checked'
    );
    if (!paymentTypeElement) {
      alert('Please select a payment method type.');
      return;
    }
    const paymentType = paymentTypeElement.value;

    let newMethod = { type: paymentType };

    if (paymentType === 'card') {
      const cardName = document.getElementById('cardName')?.value.trim();
      const cardNumber = document.getElementById('cardNumber')?.value.trim();
      const expDate = document.getElementById('expiryDate')?.value.trim();
      const cvv = document.getElementById('cvv')?.value.trim();

      if (!cardName || !cardNumber || !expDate || !cvv) {
        alert('Please fill in all card fields.');
        return;
      }
      if (!isValidCardNumber(cardNumber)) {
        alert('Invalid card number.');
        return;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expDate)) {
        alert('Expiry date must be in MM/YY format.');
        return;
      }
      if (!/^\d{3}$/.test(cvv)) {
        alert('CVV must be exactly 3 digits.');
        return;
      }
      newMethod = {
        ...newMethod,
        type: 'card',
        cardName,
        cardNumber,
        expDate,
        cvv,
        createdAt: new Date().toISOString(),
      };
    } else if (paymentType === 'momo') {
      const momoNumber = document.getElementById('momoNumber')?.value.trim();
      if (!momoNumber) {
        alert('Please enter your Mobile Money number.');
        return;
      }
      if (!/^\d{1,10}$/.test(momoNumber)) {
        alert('Mobile Money number must be numeric and up to 10 digits.');
        return;
      }
      newMethod = {
        ...newMethod,
        type: 'momo',
        mobileNumber: momoNumber,
        createdAt: new Date().toISOString(),
      };
    } else {
      alert('Please select a valid payment method type.');
      return;
    }

    try {
      await addDoc(
        collection(db, 'users', auth.currentUser.uid, 'paymentMethods'),
        newMethod
      );
      // Show success alert only after the addDoc operation completes
      alert('Payment method saved!');
      paymentForm.reset();
      loadPaymentMethods();
    } catch (error) {
      console.error('Error saving payment method:', error);
      alert('Error saving payment method. Please try again.');
    }
  });
}
