import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// DOM element for displaying cart items
const cartItemsContainer = document.querySelector(".cart-items");

// Helper function: Create and return a DOM element for a single cart item
function renderCartItem(itemId, product, quantity) {
    const cartItemDiv = document.createElement("div");
    cartItemDiv.classList.add("cart-item");

    // Add click event listener to redirect to the product page
    cartItemDiv.addEventListener("click", () => {
        window.location.href = `../product/product.html?id=${itemId}`;
    });

    // Product image
    const img = document.createElement("img");
    img.src = product.imageBase64 || "https://via.placeholder.com/80";
    img.alt = product.itemName;

    // Product details container
    const detailsDiv = document.createElement("div");
    detailsDiv.classList.add("cart-item-details");

    const title = document.createElement("h3");
    title.textContent = product.itemName;

    const price = document.createElement("p");
    price.textContent = `$${product.price.toFixed(2)}`;

    // Optional: Display quantity (if you later decide to add quantity controls)
    const qty = document.createElement("p");
    qty.textContent = `Quantity: ${quantity}`;

    // Display additional attributes
    const attributes = document.createElement("div");
    attributes.classList.add("cart-item-attributes");

    if (product.color) {
        const color = document.createElement("p");
        color.textContent = `Color: ${product.color}`;
        attributes.appendChild(color);
    }

    if (product.size) {
        const size = document.createElement("p");
        size.textContent = `Size: ${product.size}`;
        attributes.appendChild(size);
    }

    if (product.description) {
        const description = document.createElement("p");
        description.textContent = `Description: ${product.description}`;
        attributes.appendChild(description);
    }

    detailsDiv.appendChild(title);
    detailsDiv.appendChild(price);
    detailsDiv.appendChild(qty);
    detailsDiv.appendChild(attributes);

    // Actions container with Remove button
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("cart-item-actions");

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        // Remove the cart item from Firestore
        const user = auth.currentUser;
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "cart", itemId));
            // Remove the item from the DOM
            cartItemDiv.remove();
            // If no items remain, show a message
            if (cartItemsContainer.children.length === 0) {
                cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
            }
        } catch (error) {
            console.error("Error removing cart item:", error);
        }
    });

    actionsDiv.appendChild(removeBtn);

    // Build the final cart item element
    cartItemDiv.appendChild(img);
    cartItemDiv.appendChild(detailsDiv);
    cartItemDiv.appendChild(actionsDiv);

    return cartItemDiv;
}

// Function: Load and render the current user's cart items
async function loadCartItems(user) {
  try {
    const cartRef = collection(db, "users", user.uid, "cart");
    const cartSnapshot = await getDocs(cartRef);
    cartItemsContainer.innerHTML = ""; // Clear any previous items

    if (cartSnapshot.empty) {
      cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
      return;
    }

    // For each cart item, fetch the corresponding product details
    for (const cartDoc of cartSnapshot.docs) {
      const cartData = cartDoc.data();
      const itemId = cartData.itemId;
      const quantity = cartData.quantity;

      // Ensure itemId and quantity are defined
      if (!itemId || !quantity) {
        console.error("Invalid cart item data:", cartData);
        continue;
      }

      // Fetch product details from the "items" collection
      const productDocRef = doc(db, "items", itemId);
      const productDoc = await getDoc(productDocRef);
      if (productDoc.exists()) {
        const productData = productDoc.data();
        const cartItemElement = renderCartItem(itemId, productData, quantity);
        cartItemsContainer.appendChild(cartItemElement);
      } else {
        console.error("Product not found for itemId:", itemId);
      }
    }
  } catch (error) {
    console.error("Error loading cart items:", error);
    cartItemsContainer.innerHTML =
      "<p>Error loading cart items. Please try again later.</p>";
  }
}

// Listen for authentication changes and load the cart when a user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadCartItems(user);
    } else {
        cartItemsContainer.innerHTML = "<p>Please log in to view your cart.</p>";
    }
});

// Optional: Handle the checkout button click
const checkoutButton = document.querySelector(".checkout button");
if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
        // Redirect to the checkout page
        window.location.href = "../checkout/checkout.html";
    });
}
