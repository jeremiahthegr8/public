import { auth, db } from '../../database/config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  setDoc, // Add setDoc for writing documents with explicit IDs
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// --- DOM Elements ---
const cartItemsContainer = document.getElementById('order-summary');
const confirmName = document.getElementById('confirm-name');
const confirmPhone = document.getElementById('confirm-phone');
const confirmAddress = document.getElementById('confirm-address');
const confirmTotal = document.getElementById('confirm-total');
const confirmPayment = document.getElementById('confirm-payment');
const savedPaymentMethodsContainer = document.getElementById(
  'saved-payment-methods'
);

// Buyer form fields
const fullNameField = document.getElementById('full-name');
const phoneField = document.getElementById('phone');
const addressField = document.getElementById('address');
const cityField = document.getElementById('city');
const stateField = document.getElementById('state');
const zipField = document.getElementById('zip');

// Payment new entry fields
const momoDetails = document.getElementById('momo-details');
const cardDetails = document.getElementById('card-details');
const momoNumberField = document.getElementById('momo-number');
const cardNameField = document.getElementById('card-name');
const cardNumberField = document.getElementById('card-number');
const expiryField = document.getElementById('expiry');
const cvvField = document.getElementById('cvv');
const rememberMomoCheckbox = document.getElementById('remember-momo');
const rememberCardCheckbox = document.getElementById('remember-card');

// Multi-step form elements
const steps = document.querySelectorAll('.form-step');
const progressSteps = document.querySelectorAll('.progress-steps .step');
let currentStep = 0;

let currentUser = null;
let cartItems = [];
let totalAmount = 0;

// --- Multi-Step Navigation Functions ---
function showStep(index) {
  if (index < 0) index = 0;
  if (index >= steps.length) index = steps.length - 1;
  currentStep = index;

  steps.forEach((step, i) => {
    step.classList.toggle('active', i === currentStep);
  });

  progressSteps.forEach((step, i) => {
    if (i < currentStep) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else if (i === currentStep) {
      step.classList.add('active');
      step.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
    }
  });

  if (currentStep === 3) {
    updateConfirmation();
  }
}

function validateStep(index) {
  const step = steps[index];
  const requiredInputs = step.querySelectorAll(
    'input[required], select[required]'
  );
  for (let input of requiredInputs) {
    if (input.offsetParent === null) continue;
    if (!input.value.trim()) {
      alert('Please fill in all required fields.');
      input.focus();
      return false;
    }
  }
  return true;
}

document.querySelectorAll('.next-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1);
    }
  });
});

document.querySelectorAll('.prev-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  });
});

// --- Update Confirmation Details ---
function updateConfirmation() {
  let paymentInfo = '';
  const selected = document.querySelector(
    "input[name='payment-method']:checked"
  );
  if (selected) {
    const val = selected.value;
    if (val === 'momo-new') {
      const momoNum = momoNumberField.value.trim();
      paymentInfo = `Mobile Money: ${momoNum}`;
    } else if (val === 'card-new') {
      const cardNum = cardNumberField.value.trim();
      const masked = '**** **** **** ' + cardNum.replace(/\s+/g, '').slice(-4);
      paymentInfo = `Card: ${masked}`;
    } else if (val === 'cash') {
      paymentInfo = 'Cash on Delivery';
    } else {
      const container = document
        .querySelector(`input[name='payment-method'][value="${val}"]`)
        .closest('label');
      paymentInfo = container
        ? container.textContent.trim()
        : 'Saved Payment Method';
    }
  }
  confirmPayment.textContent = paymentInfo;
}

// --- Authentication and Data Loading ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      await Promise.all([
        loadUserProfile(user.uid),
        loadCartItems(user.uid),
        loadSavedPaymentMethods(user.uid),
      ]);
      showStep(0);
    } catch (error) {
      console.error('Error initializing checkout:', error);
    }
  } else {
    window.location.href = '../../index.html';
  }
});

// --- Load User Profile ---
async function loadUserProfile(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      fullNameField.value = userData.fullName || '';
      phoneField.value = userData.phone || '';
      addressField.value = userData.address || '';
      if (cityField) cityField.value = userData.city || '';
      if (stateField) stateField.value = userData.state || '';
      if (zipField) zipField.value = userData.zip || '';
      confirmName.textContent = userData.fullName || '';
      confirmPhone.textContent = userData.phone || '';
      confirmAddress.textContent = userData.address || '';
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

// --- Load Cart Items ---
async function loadCartItems(uid) {
  try {
    const cartRef = collection(db, 'users', uid, 'cart');
    const cartSnapshot = await getDocs(cartRef);
    if (cartSnapshot.empty) {
      cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
      return;
    }
    cartItemsContainer.innerHTML = '';
    cartItems = [];
    totalAmount = 0;

    const itemRefs = cartSnapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: data.itemId, quantity: data.quantity };
    });

    const itemPromises = itemRefs.map(({ id }) => getDoc(doc(db, 'items', id)));
    const itemDocs = await Promise.all(itemPromises);

    itemDocs.forEach((itemDoc, index) => {
      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        const quantity = itemRefs[index].quantity;
        const itemTotal = itemData.price * quantity;
        totalAmount += itemTotal;
        cartItems.push({
          itemId: itemRefs[index].id,
          itemName: itemData.itemName,
          quantity,
          price: itemData.price,
          sellerId: itemData.sellerId,
        });
        cartItemsContainer.innerHTML += `<p>${
          itemData.itemName
        } (x${quantity}): $${itemTotal.toFixed(2)}</p>`;
      }
    });
    cartItemsContainer.innerHTML += `<p><strong>Total:</strong> $${totalAmount.toFixed(
      2
    )}</p>`;
    confirmTotal.textContent = `$${totalAmount.toFixed(2)}`;
  } catch (error) {
    console.error('Error loading cart items:', error);
    cartItemsContainer.innerHTML =
      '<p>Error loading cart items. Please try again.</p>';
  }
}

// --- Load Saved Payment Methods ---
async function loadSavedPaymentMethods(uid) {
  try {
    const paymentsRef = collection(db, 'users', uid, 'payments');
    const querySnapshot = await getDocs(paymentsRef);
    savedPaymentMethodsContainer.innerHTML = '';
    if (querySnapshot.empty) {
      savedPaymentMethodsContainer.innerHTML =
        '<p>No saved payment methods.</p>';
      return;
    }
    querySnapshot.forEach((docSnapshot) => {
      const payment = docSnapshot.data();
      const methodDiv = document.createElement('div');
      methodDiv.classList.add('payment-method');
      let displayText = '';
      if (payment.type === 'card') {
        const digits = payment.cardNumber.replace(/\s+/g, '');
        displayText = `Card - **** **** **** ${digits.slice(-4)} (${
          payment.cardHolder
        })`;
      } else if (payment.type === 'momo') {
        displayText = `MoMo - ${payment.provider.toUpperCase()} - ${
          payment.mobileNumber
        }`;
      }
      methodDiv.innerHTML = `
        <label>
          <input type="radio" name="payment-method" value="${docSnapshot.id}" required>
          ${displayText}
        </label>
      `;
      methodDiv.addEventListener('click', () => {
        document
          .querySelectorAll('#saved-payment-methods .payment-method')
          .forEach((el) => el.classList.remove('selected'));
        methodDiv.classList.add('selected');
      });
      savedPaymentMethodsContainer.appendChild(methodDiv);
    });
  } catch (error) {
    console.error('Error loading payment methods:', error);
    savedPaymentMethodsContainer.innerHTML =
      '<p>Error loading payment methods.</p>';
  }
}

// --- Dynamic Payment Field Display & Required Toggle ---
document.querySelectorAll("input[name='payment-method']").forEach((radio) => {
  radio.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'momo-new') {
      momoDetails.style.display = 'block';
      cardDetails.style.display = 'none';
      momoNumberField.required = true;
      cardNameField.required = false;
      cardNumberField.required = false;
      expiryField.required = false;
      cvvField.required = false;
    } else if (val === 'card-new') {
      cardDetails.style.display = 'block';
      momoDetails.style.display = 'none';
      cardNameField.required = true;
      cardNumberField.required = true;
      expiryField.required = true;
      cvvField.required = true;
      momoNumberField.required = false;
    } else if (val === 'cash') {
      momoDetails.style.display = 'none';
      cardDetails.style.display = 'none';
      momoNumberField.required = false;
      cardNameField.required = false;
      cardNumberField.required = false;
      expiryField.required = false;
      cvvField.required = false;
    } else {
      momoDetails.style.display = 'none';
      cardDetails.style.display = 'none';
      momoNumberField.required = false;
      cardNameField.required = false;
      cardNumberField.required = false;
      expiryField.required = false;
      cvvField.required = false;
    }
    document
      .querySelectorAll('#saved-payment-methods .payment-method')
      .forEach((el) => el.classList.remove('selected'));
  });
});

// --- Format Card Number Input ---
cardNumberField.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  value = value.substring(0, 16);
  value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
  e.target.value = value;
});

// --- Format Expiry Date Input ---
expiryField.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  value = value.substring(0, 4);
  if (value.length > 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4);
  }
  e.target.value = value;
});

// --- Limit CVV Input ---
cvvField.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  e.target.value = value.substring(0, 3);
});

// --- Delete Cart Items After Order Placement ---
async function deleteCartItems(uid) {
  try {
    const cartRef = collection(db, 'users', uid, 'cart');
    const cartSnapshot = await getDocs(cartRef);
    await Promise.all(cartSnapshot.docs.map((doc) => deleteDoc(doc.ref)));
  } catch (error) {
    console.error('Error deleting cart items:', error);
  }
}

// --- Handle Checkout Form Submission ---
document
  .getElementById('checkout-form')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    const selectedRadio = document.querySelector(
      "input[name='payment-method']:checked"
    );
    if (!selectedRadio) {
      alert('Please select a payment method.');
      return;
    }
    const paymentValue = selectedRadio.value;
    let finalPaymentMethod = paymentValue;

    if (paymentValue === 'momo-new') {
      const momoNumber = momoNumberField.value.trim();
      if (!momoNumber) return alert('Please enter your Mobile Money number.');
      finalPaymentMethod = { type: 'momo', mobileNumber: momoNumber };
      if (document.getElementById('remember-momo').checked) {
        try {
          await addDoc(collection(db, 'users', currentUser.uid, 'payments'), {
            type: 'momo',
            provider: 'MoMo',
            mobileNumber: momoNumber,
            createdAt: new Date().toISOString(),
          });
          loadSavedPaymentMethods(currentUser.uid);
        } catch (error) {
          console.error('Error saving new MoMo method:', error);
        }
      }
    } else if (paymentValue === 'card-new') {
      const cardName = cardNameField.value.trim();
      const cardNumber = cardNumberField.value.trim();
      const expiry = expiryField.value.trim();
      const cvv = cvvField.value.trim();
      if (!cardName || !cardNumber || !expiry || !cvv) {
        return alert('Please fill in all card details.');
      }
      finalPaymentMethod = {
        type: 'card',
        cardHolder: cardName,
        cardNumber,
        expiry,
        cvv,
      };
      if (document.getElementById('remember-card').checked) {
        try {
          await addDoc(collection(db, 'users', currentUser.uid, 'payments'), {
            type: 'card',
            cardHolder: cardName,
            cardNumber,
            expiry,
            cvv,
            createdAt: new Date().toISOString(),
          });
          loadSavedPaymentMethods(currentUser.uid);
        } catch (error) {
          console.error('Error saving new card method:', error);
        }
      }
    }

    try {
      const ordersBySeller = cartItems.reduce((groups, item) => {
        if (!groups[item.sellerId]) groups[item.sellerId] = [];
        groups[item.sellerId].push(item);
        return groups;
      }, {});

      const orderPromises = Object.keys(ordersBySeller).map(
        async (sellerId) => {
          const itemsForSeller = ordersBySeller[sellerId];
          const sellerTotal = itemsForSeller.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          // Generate a unique order ID
          const orderId = `ORD-${Date.now()}-${sellerId}`;

          const orderDetails = {
            orderId, // Include the orderId in the order details
            userId: currentUser.uid,
            sellerId,
            buyerInfo: {
              fullName: fullNameField.value.trim(),
              phone: phoneField.value.trim(),
              address: addressField.value.trim(),
              city: cityField ? cityField.value.trim() : '',
              state: stateField ? stateField.value.trim() : '',
              zip: zipField ? zipField.value.trim() : '',
            },
            items: itemsForSeller,
            total: sellerTotal,
            paymentMethod: finalPaymentMethod,
            status: 'Pending',
            createdAt: serverTimestamp(),
          };

          // Write to the global orders collection
          const globalOrderRef = doc(db, 'orders', orderId);
          await setDoc(globalOrderRef, orderDetails);

          // Write to the user-specific orders subcollection
          const userOrderRef = doc(
            db,
            'users',
            currentUser.uid,
            'orders',
            orderId
          );
          await setDoc(userOrderRef, orderDetails);
        }
      );

      await Promise.all(orderPromises);
      await deleteCartItems(currentUser.uid);
      alert('Orders placed successfully!');
      window.location.href = '../../index.html';
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    }
  });
