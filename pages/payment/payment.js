import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

let currentUser = null;

// Utility: Luhn Algorithm for basic card number validation
function isValidCardNumber(number) {
  let sum = 0;
  let shouldDouble = false;
  // Process digits from right to left
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Format card number input (insert space every 4 digits)
const cardNumberInput = document.getElementById("card-number");
cardNumberInput.addEventListener("input", (e) => {
  // Remove all non-digit characters
  let digits = e.target.value.replace(/\D/g, "");
  // Limit to 16 digits maximum
  digits = digits.substring(0, 16);
  // Insert space every 4 digits
  let formatted = digits.replace(/(.{4})/g, "$1 ").trim();
  e.target.value = formatted;
});

// Format expiry date: automatically insert a slash after 2 digits
const expiryDateInput = document.getElementById("expiry-date");
expiryDateInput.addEventListener("input", (e) => {
  let value = e.target.value.replace(/[^\d]/g, "");
  if (value.length > 2) {
    value = value.substring(0, 2) + "/" + value.substring(2, 4);
  }
  e.target.value = value;
});

// Validate expiry date (MM/YY) and check if card is expired
function isExpiryValid(expiry) {
  const parts = expiry.split("/");
  if (parts.length !== 2) return false;
  let [month, year] = parts.map((str) => parseInt(str, 10));
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return false;

  // Assume 20xx for two-digit year
  year += 2000;
  const now = new Date();
  const expiryDate = new Date(year, month - 1, 1);
  // Set expiryDate to end of month
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  expiryDate.setDate(expiryDate.getDate() - 1);
  return expiryDate >= now;
}

// Check CVV: must be exactly 3 digits
function isValidCVV(cvv) {
  return /^\d{3}$/.test(cvv);
}

// Check user authentication status
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loadPaymentMethods();
  } else {
    window.location.href = "../../index.html"; // Redirect if not logged in
  }
});

// Load saved payment methods from Firestore
async function loadPaymentMethods() {
  const paymentMethodsList = document.getElementById("payment-methods-list");
  paymentMethodsList.innerHTML = ""; // Clear existing content

  try {
    const paymentsRef = collection(db, "users", currentUser.uid, "payments");
    const querySnapshot = await getDocs(paymentsRef);

    if (querySnapshot.empty) {
      paymentMethodsList.innerHTML =
        "<p class='no-payments'>No payment methods saved yet.</p>";
      return;
    }

    querySnapshot.forEach((docSnapshot) => {
      const payment = docSnapshot.data();
      const paymentMethod = document.createElement("div");
      paymentMethod.classList.add("payment-method");

      // For display, only show masked card number if type is card
      let displayText = "";
      if (payment.type === "card") {
        // Mask card number except last 4 digits
        const digits = payment.cardNumber.replace(/\s+/g, "");
        const masked = "**** **** **** " + digits.slice(-4);
        displayText = `${masked} - ${payment.cardHolder}`;
      } else if (payment.type === "momo") {
        displayText = `${payment.provider.toUpperCase()} - ${
          payment.mobileNumber
        }`;
      }

      paymentMethod.innerHTML = `
        <p>${displayText}</p>
        <button onclick="deletePaymentMethod('${docSnapshot.id}')">Delete</button>
      `;

      paymentMethodsList.appendChild(paymentMethod);
    });
  } catch (error) {
    console.error("Error loading payment methods:", error);
    alert("Failed to load payment methods.");
  }
}

// Add a new payment method with validation
document
  .getElementById("add-payment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawCardNumber = document.getElementById("card-number").value;
    const cardHolder = document.getElementById("card-holder").value;
    const expiryDate = document.getElementById("expiry-date").value;
    const cvv = document.getElementById("cvv").value;
    const msgEl = document.getElementById("form-message");
    msgEl.textContent = "";

    // Remove spaces for validation
    const cardNumber = rawCardNumber.replace(/\s+/g, "");

    // Validate card number length and Luhn algorithm
    if (cardNumber.length !== 16 || !isValidCardNumber(cardNumber)) {
      msgEl.style.color = "red";
      msgEl.textContent = "Invalid card number.";
      return;
    }

    // Validate expiry date
    if (!isExpiryValid(expiryDate)) {
      msgEl.style.color = "red";
      msgEl.textContent = "Invalid or expired expiry date.";
      return;
    }

    // Validate CVV
    if (!isValidCVV(cvv)) {
      msgEl.style.color = "red";
      msgEl.textContent = "Invalid CVV.";
      return;
    }

    // Prepare data to save (for demo purposes, storing raw details; not recommended for production)
    const cardData = {
      type: "card",
      cardNumber: rawCardNumber,
      cardHolder,
      expiryDate,
      cvv,
      createdAt: new Date().toISOString(), // or use serverTimestamp() from Firestore if needed
    };

    try {
      const paymentsRef = collection(db, "users", currentUser.uid, "payments");
      await addDoc(paymentsRef, cardData);

      msgEl.style.color = "green";
      msgEl.textContent = "Payment method saved successfully.";
      e.target.reset();
      loadPaymentMethods();
    } catch (error) {
      console.error("Error saving payment method:", error);
      msgEl.style.color = "red";
      msgEl.textContent = "Failed to save payment method.";
    }
  });

// Delete a payment method
window.deletePaymentMethod = async (paymentId) => {
  try {
    const paymentRef = doc(db, "users", currentUser.uid, "payments", paymentId);
    await deleteDoc(paymentRef);
    alert("Payment method deleted successfully.");
    loadPaymentMethods();
  } catch (error) {
    console.error("Error deleting payment method:", error);
    alert("Failed to delete payment method.");
  }
};
