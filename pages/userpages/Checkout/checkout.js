// Import Firebase configuration and Firestore functions
import { auth, db } from '../../../database/config.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// --- Global Variables ---
let currentUser = null;
let cartProducts = [];
let totals = { subtotal: 0, shipping: 0, tax: 0, total: 0 };

// --- Utility: Format Currency ---
function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}

// --- Load User Shipping Info ---
async function loadUserInfo(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      document.getElementById('firstName').value = data.FirstName || '';
      document.getElementById('lastName').value = data.LastName || '';
      document.getElementById('email').value = data.email || '';
      document.getElementById('phone').value = data.phoneNumber || '';
      document.getElementById('address').value = data.address || '';
      document.getElementById('city').value = data.city || '';
      document.getElementById('state').value = data.state || '';
      document.getElementById('region').value = data.region || '';
    }
  } catch (error) {
    console.error('Error loading user info:', error);
  }
}

// --- Load Saved Payment Methods from Subcollection ---
async function loadSavedPaymentMethods(uid) {
  try {
    const paymentMethodsRef = collection(db, 'users', uid, 'paymentMethods');
    const paymentMethodsSnapshot = await getDocs(paymentMethodsRef);
    const container = document.getElementById('savedPaymentMethodsContainer');
    container.innerHTML = '<p><strong>Saved Payment Methods:</strong></p>';

    if (!paymentMethodsSnapshot.empty) {
      paymentMethodsSnapshot.forEach((docSnap) => {
        const method = docSnap.data();
        let displayText = '';
        if (method.type === 'card') {
          const digits = method.cardNumber.replace(/\s+/g, '');
          displayText = `Card - **** **** **** ${digits.slice(-4)}`;
        } else if (method.type === 'momo') {
          displayText = `MoMo - ${method.mobileNumber}`;
        }
        const label = document.createElement('label');
        label.innerHTML = `<input type="radio" name="paymentMethod" value="${docSnap.id}" /> ${displayText}`;
        container.appendChild(label);
        container.appendChild(document.createElement('br'));
      });
    } else {
      container.innerHTML += '<p>You don’t have saved payment methods.</p>';
    }
  } catch (error) {
    console.error('Error loading saved payment methods:', error);
  }
}

// --- Load Cart Items from Firestore ---
async function loadCartItems() {
  if (!auth.currentUser) {
    document.getElementById('orderItems').innerHTML =
      '<p>Please sign in to view your cart.</p>';
    return [];
  }
  const userId = auth.currentUser.uid;
  const cartRef = collection(db, 'users', userId, 'cart');
  const cartSnapshot = await getDocs(cartRef);
  // Each cart item: use the document id as the product id and quantity from the cart
  const cartItems = cartSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    quantity: parseInt(docSnap.data().quantity, 10),
  }));
  // Fetch product details from the "listings" collection for each cart item
  const productPromises = cartItems.map((item) =>
    getDoc(doc(db, 'listings', item.id)).then((productSnap) => {
      if (productSnap.exists()) {
        return { ...productSnap.data(), id: item.id, quantity: item.quantity };
      } else {
        return null;
      }
    })
  );
  let products = await Promise.all(productPromises);
  products = products.filter((product) => product !== null);
  cartProducts = products;
  renderOrderSummary(products);
  return products;
}

// --- Render Order Summary ---
function renderOrderSummary(products) {
  const container = document.getElementById('orderItems');
  container.innerHTML = '';
  let subtotal = 0;
  products.forEach((product) => {
    const price = parseFloat(product.price);
    const itemTotal = price * product.quantity;
    subtotal += itemTotal;
    const div = document.createElement('div');
    div.classList.add('line');
    div.innerHTML = `<span>${product.name} (x${
      product.quantity
    })</span><span>${formatCurrency(itemTotal)}</span>`;
    container.appendChild(div);
  });
  const shipping = 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  totals = { subtotal, shipping, tax, total };
  document.getElementById('subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('shipping').textContent = formatCurrency(shipping);
  document.getElementById('tax').textContent = formatCurrency(tax);
  document.getElementById('total').textContent = formatCurrency(total);
}

// --- Set Estimated Delivery Date ---
function setDeliveryDate() {
  const today = new Date();
  const deliveryStart = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);
  const deliveryEnd = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
  document.getElementById('deliveryDate').textContent =
    deliveryStart.toLocaleDateString() +
    ' - ' +
    deliveryEnd.toLocaleDateString();
}
setDeliveryDate();

// --- Multi-Step Form Navigation ---
const form = document.getElementById('checkout-form');
const formSteps = form.querySelectorAll('.form-step');
let currentStep = 1;

// Payment method field toggle
const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
const cardDetails = document.getElementById('cardDetails');
const momoDetails = document.getElementById('momoDetails');
const cardNameField = document.getElementById('cardName');
const cardNumberField = document.getElementById('cardNumber');
const expiryField = document.getElementById('expDate');
const cvvField = document.getElementById('cvv');
const momoNumberField = document.getElementById('momoNumber');

paymentRadios.forEach((radio) => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'card-new') {
      cardDetails.classList.add('active');
      momoDetails.classList.remove('active');
      cardNameField.required = true;
      cardNumberField.required = true;
      expiryField.required = true;
      cvvField.required = true;
      momoNumberField.required = false;
    } else if (e.target.value === 'momo-new') {
      momoDetails.classList.add('active');
      cardDetails.classList.remove('active');
      momoNumberField.required = true;
      cardNameField.required = false;
      cardNumberField.required = false;
      expiryField.required = false;
      cvvField.required = false;
    } else {
      cardDetails.classList.remove('active');
      momoDetails.classList.remove('active');
      cardNameField.required = false;
      cardNumberField.required = false;
      expiryField.required = false;
      cvvField.required = false;
      momoNumberField.required = false;
    }
  });
});

// Enforce numeric-only and max 10 digits for MoMo number
momoNumberField.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 10) value = value.substring(0, 10);
  e.target.value = value;
});

// Format card number input (groups of 4)
cardNumberField.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  value = value.substring(0, 16);
  value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
  e.target.value = value;
});

// Format expiry date input (MM/YY)
expiryField.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  value = value.substring(0, 4);
  if (value.length > 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4);
  }
  e.target.value = value;
});

// Basic Luhn algorithm check for card numbers
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

// --- Multi-step Navigation ---
document.getElementById('toPayment').addEventListener('click', () => {
  if (validateStep(1)) {
    currentStep = 2;
    updateFormSteps();
    updateProgress();
  }
});
document.getElementById('backToShipping').addEventListener('click', () => {
  currentStep = 1;
  updateFormSteps();
  updateProgress();
});
document.getElementById('toConfirmation').addEventListener('click', () => {
  if (validateStep(2)) {
    const selectedPayment = document.querySelector(
      'input[name="paymentMethod"]:checked'
    ).value;
    if (selectedPayment === 'card-new') {
      if (!isValidCardNumber(cardNumberField.value)) {
        alert('Please enter a valid credit card number.');
        cardNumberField.focus();
        return;
      }
    }
    document.getElementById('orderNumber').textContent = Math.floor(
      100000 + Math.random() * 900000
    );
    document.getElementById('orderEmail').textContent =
      document.getElementById('email').value;
    currentStep = 3;
    updateFormSteps();
    updateProgress();
  }
});
document.getElementById('continueShopping').addEventListener('click', () => {
  window.location.href = '../account/account.html';
});

function updateFormSteps() {
  formSteps.forEach((step) => {
    step.classList.remove('active');
    if (parseInt(step.getAttribute('data-step')) === currentStep) {
      step.classList.add('active');
    }
  });
}
function updateProgress() {
  const steps = document.querySelectorAll('.progress-container .progress-step');
  steps.forEach((step) => {
    const stepNumber = parseInt(step.getAttribute('data-step'));
    if (stepNumber < currentStep) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else if (stepNumber === currentStep) {
      step.classList.add('active');
      step.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
    }
  });
}
function validateStep(stepNumber) {
  const currentFormStep = form.querySelector(
    `.form-step[data-step="${stepNumber}"]`
  );
  const requiredInputs = currentFormStep.querySelectorAll('input[required]');
  let valid = true;
  requiredInputs.forEach((input) => {
    if (!input.value.trim()) {
      input.style.borderColor = 'red';
      valid = false;
    } else {
      input.style.borderColor = '#cccccc';
    }
  });
  if (!valid) {
    alert('Please fill in all required fields.');
  }
  return valid;
}

// --- Checkout Form Submission ---
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('Checkout form submitted.');

  // Gather shipping info (prefilled from user profile)
  const shippingInfo = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    region: document.getElementById('region').value.trim(),
  };
  console.log('Shipping Info:', shippingInfo);

  // Payment info based on selected method
  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  ).value;
  let paymentInfo = {};
  if (paymentMethod === 'card-new') {
    paymentInfo = {
      type: 'card',
      cardName: document.getElementById('cardName').value.trim(),
      cardNumber: document.getElementById('cardNumber').value.trim(),
      expDate: document.getElementById('expDate').value.trim(),
      cvv: document.getElementById('cvv').value.trim(),
    };
    if (document.getElementById('rememberCard').checked) {
      console.log('Saving new card method to user info.');
      await addDoc(collection(db, 'users', currentUser.uid, 'paymentMethods'), {
        type: 'card',
        cardHolder: paymentInfo.cardName,
        cardNumber: paymentInfo.cardNumber,
        expDate: paymentInfo.expDate,
        cvv: paymentInfo.cvv,
        createdAt: new Date().toISOString(),
      });
    }
  } else if (paymentMethod === 'momo-new') {
    paymentInfo = {
      type: 'momo',
      momoNumber: document.getElementById('momoNumber').value.trim(),
    };
    if (document.getElementById('rememberMomo').checked) {
      console.log('Saving new Mobile Money method to user info.');
      await addDoc(collection(db, 'users', currentUser.uid, 'paymentMethods'), {
        type: 'momo',
        mobileNumber: paymentInfo.momoNumber,
        createdAt: new Date().toISOString(),
      });
    }
  } else {
    paymentInfo = { type: 'cash' };
  }
  console.log('Payment Info:', paymentInfo);

  // Retrieve cart items from Firestore
  const products = await loadCartItems();
  if (!products || products.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  console.log('Cart Products:', products);

  // Group items by seller so that orders can be created per seller
  const ordersBySeller = products.reduce((groups, product) => {
    const sellerId = product.sellerId;
    if (!groups[sellerId]) groups[sellerId] = [];
    groups[sellerId].push(product);
    return groups;
  }, {});
  console.log('Orders grouped by seller:', ordersBySeller);

  try {
    // For each seller, create an order
    for (const sellerId in ordersBySeller) {
      const itemsForSeller = ordersBySeller[sellerId];
      const sellerTotal = itemsForSeller.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
      );
      // Generate a unique order ID using timestamp and sellerId
      const orderId = `ORD-${Date.now()}-${sellerId}`;
      const orderData = {
        orderId,
        userId: currentUser.uid,
        sellerId,
        shippingInfo,
        paymentInfo,
        // Each order item includes its product (listing) id and quantity, among other details
        items: itemsForSeller,
        totals: totals,
        status: 'Pending',
        createdAt: serverTimestamp(),
      };
      console.log('Creating order:', orderData);

      // Write order to global orders collection
      await setDoc(doc(db, 'orders', orderId), orderData);
      // Write order under user's orders subcollection
      await setDoc(
        doc(db, 'users', currentUser.uid, 'orders', orderId),
        orderData
      );
      // Write order under seller's orders subcollection
      await setDoc(doc(db, 'sellers', sellerId, 'orders', orderId), orderData);
      console.log(`Order ${orderId} created for seller ${sellerId}`);
    }

    console.log('All orders placed successfully.');
    alert('Order placed successfully!');
    // Delete cart items after order placement and update aggregated counter
    await deleteCartItems(currentUser.uid);
    // Redirect to confirmation page
    window.location.href = '../mycart/mycart.html';
  } catch (error) {
    console.error('Error placing order:', error);
    alert('Error placing order. Please try again.');
  }
});

// --- Delete Cart Items After Order Placement ---
async function deleteCartItems(uid) {
  try {
    const cartRef = collection(db, 'users', uid, 'cart');
    const cartSnapshot = await getDocs(cartRef);
    let totalQuantity = 0;
    cartSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      totalQuantity += data.quantity || 0;
    });
    await updateDoc(doc(db, 'users', uid), {
      cartCount: increment(-totalQuantity),
    });
    await Promise.all(
      cartSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref))
    );
  } catch (error) {
    console.error('Error deleting cart items:', error);
  }
}

// --- Listen for Auth State Changes ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadUserInfo(user.uid);
    loadSavedPaymentMethods(user.uid);
    loadCartItems();
  } else {
    document.getElementById('orderItems').innerHTML =
      '<p>Please sign in to view your cart.</p>';
  }
});
