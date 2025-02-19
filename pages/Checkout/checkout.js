import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// DOM elements
const cartItemsContainer = document.getElementById("order-summary");
const confirmName = document.getElementById("confirm-name");
const confirmPhone = document.getElementById("confirm-phone");
const confirmAddress = document.getElementById("confirm-address");
const confirmTotal = document.getElementById("confirm-total");
const confirmPayment = document.getElementById("confirm-payment");

let currentUser = null;
let cartItems = [];
let totalAmount = 0;

// Check authentication and load data
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      await Promise.all([loadUserProfile(user.uid), loadCartItems(user.uid)]);
    } catch (error) {
      console.error("Error initializing checkout:", error);
    }
  } else {
    window.location.href = "../../index.html"; // Redirect if not logged in
  }
});

// Load user profile
async function loadUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      document.getElementById("full-name").value = userData.fullName || "";
      document.getElementById("phone").value = userData.phone || "";
      document.getElementById("address").value = userData.address || "";
      document.getElementById("city").value = userData.city || "";
      document.getElementById("state").value = userData.state || "";
      document.getElementById("zip").value = userData.zip || "";

      confirmName.textContent = userData.fullName || "";
      confirmPhone.textContent = userData.phone || "";
      confirmAddress.textContent = userData.address || "";
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
  }
}

// Load cart items efficiently
async function loadCartItems(uid) {
  try {
    const cartRef = collection(db, "users", uid, "cart");
    const cartSnapshot = await getDocs(cartRef);
    if (cartSnapshot.empty) {
      cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
      return;
    }

    const itemIds = cartSnapshot.docs.map((doc) => ({
      id: doc.data().itemId,
      quantity: doc.data().quantity,
    }));

    // Batch fetch item details
    const itemPromises = itemIds.map(({ id }) => getDoc(doc(db, "items", id)));
    const itemDocs = await Promise.all(itemPromises);

    cartItemsContainer.innerHTML = ""; // Clear previous items
    cartItems = []; // Reset cart items array
    totalAmount = 0;

    itemDocs.forEach((itemDoc, index) => {
      if (itemDoc.exists()) {
        const itemData = itemDoc.data();
        const quantity = itemIds[index].quantity;
        const itemTotal = itemData.price * quantity;
        totalAmount += itemTotal;

        cartItems.push({
          itemId: itemIds[index].id,
          itemName: itemData.itemName,
          quantity,
          price: itemData.price,
        });

        cartItemsContainer.innerHTML += `<p>${itemData.itemName} (x${quantity}): $${itemTotal.toFixed(2)}</p>`;
      }
    });

    cartItemsContainer.innerHTML += `<p><strong>Total:</strong> $${totalAmount.toFixed(2)}</p>`;
    confirmTotal.textContent = `$${totalAmount.toFixed(2)}`;
  } catch (error) {
    console.error("Error loading cart items:", error);
    cartItemsContainer.innerHTML = "<p>Error loading cart items. Please try again.</p>";
  }
}

// Delete all cart items after order placement
async function deleteCartItems(uid) {
  try {
    const cartRef = collection(db, "users", uid, "cart");
    const cartSnapshot = await getDocs(cartRef);
    await Promise.all(cartSnapshot.docs.map((doc) => deleteDoc(doc.ref)));
  } catch (error) {
    console.error("Error deleting cart items:", error);
  }
}

// Handle checkout form submission
document.getElementById("checkout-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const paymentMethod = document.querySelector("input[name='payment-method']:checked")?.value;
  if (!paymentMethod) {
    alert("Please select a payment method.");
    return;
  }

  const rememberPayment = 
    paymentMethod === "momo" ? document.getElementById("remember-momo").checked :
    document.getElementById("remember-card").checked;

  // Save preferred payment method
  if (rememberPayment) {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { paymentMethod });
    } catch (error) {
      console.error("Error saving payment method:", error);
    }
  }

  // Place order
  try {
    const orderId = `ORD-${Date.now()}`;
    const orderDetails = {
      orderId,
      userId: currentUser.uid,
      items: cartItems,
      total: totalAmount,
      paymentMethod,
      status: "Pending",
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "users", currentUser.uid, "orders"), orderDetails);
    await addDoc(collection(db, "orders"), orderDetails); // Store order globally

    await deleteCartItems(currentUser.uid);

    alert("Order placed successfully!");
    window.location.href = "../../index.html"; // Redirect to home page
  } catch (error) {
    console.error("Error placing order:", error);
  }
});

// Step navigation
const steps = document.querySelectorAll(".form-step");
let currentStep = 0;

function showStep(stepIndex) {
  steps.forEach((step, index) => step.classList.toggle("active", index === stepIndex));
}

document.querySelectorAll(".next-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      showStep(currentStep);
    }
  });
});

document.querySelectorAll(".prev-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (currentStep > 0) {
      currentStep--;
      showStep(currentStep);
    }
  });
});

// Dynamic payment fields
document.querySelectorAll("input[name='payment-method']").forEach((method) => {
  method.addEventListener("change", (e) => {
    document.getElementById("momo-details").style.display = e.target.value === "momo" ? "block" : "none";
    document.getElementById("card-details").style.display = e.target.value === "card" ? "block" : "none";
  });
});
