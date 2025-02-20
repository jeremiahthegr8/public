import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
 } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Query the container element (using the class from our HTML/CSS)
  const wishlistContainer = document.querySelector(".wishlist-section");

  // Helper function: Create and return a DOM element for a single wishlist item
  function renderWishlistItem(itemId, product) {
    const wishlistItemDiv = document.createElement("div");
    wishlistItemDiv.classList.add("wishlist-item");

    // Product image
    const img = document.createElement("img");
    img.src = product.imageBase64 || "https://via.placeholder.com/80";
    img.alt = product.itemName;

    // Product details container
    const detailsDiv = document.createElement("div");
    detailsDiv.classList.add("wishlist-item-details");

    const title = document.createElement("h3");
    title.textContent = product.itemName;

    const price = document.createElement("p");
    price.textContent = `$${product.price.toFixed(2)}`;

    // Display additional attributes
    const attributes = document.createElement("div");
    attributes.classList.add("wishlist-item-attributes");

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
    detailsDiv.appendChild(attributes);

    // Actions container with Remove button
    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("wishlist-item-actions");

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent navigation when clicking Remove
      const user = auth.currentUser;
      if (!user) return;
      try {
        // Delete the wishlist document for this item
        await deleteDoc(doc(db, "users", user.uid, "wishlist", itemId));
        wishlistItemDiv.remove();
        if (wishlistContainer.children.length === 0) {
          wishlistContainer.innerHTML = "<p>Your wishlist is empty.</p>";
        }
      } catch (error) {
        console.error("Error removing wishlist item:", error);
      }
    });

    actionsDiv.appendChild(removeBtn);

    // Build the final wishlist item element
    wishlistItemDiv.appendChild(img);
    wishlistItemDiv.appendChild(detailsDiv);
    wishlistItemDiv.appendChild(actionsDiv);

    return wishlistItemDiv;
  }

  // Function: Load and render the current user's wishlist items
  async function loadWishlistItems(user) {
    try {
      const wishlistRef = collection(db, "users", user.uid, "wishlist");
      const wishlistSnapshot = await getDocs(wishlistRef);
      wishlistContainer.innerHTML = ""; // Clear previous content

      if (wishlistSnapshot.empty) {
        wishlistContainer.innerHTML = "<p>Your wishlist is empty.</p>";
        return;
      }

      // For each wishlist document, fetch the corresponding product details from "items"
      for (const docSnap of wishlistSnapshot.docs) {
        const wishlistData = docSnap.data();
        const itemId = wishlistData.itemId; // Ensure this field is correctly named in Firestore
        if (!itemId) {
          console.error("Missing itemId in wishlist document", docSnap.id);
          continue;
        }
        const productDocRef = doc(db, "items", itemId);
        const productDoc = await getDoc(productDocRef);
        if (productDoc.exists()) {
          const productData = productDoc.data();
          const wishlistItemElement = renderWishlistItem(itemId, productData);
          wishlistContainer.appendChild(wishlistItemElement);
        }
      }
    } catch (error) {
      console.error("Error loading wishlist items:", error);
      wishlistContainer.innerHTML =
        "<p>Error loading wishlist items. Please try again later.</p>";
    }
  }

  // Listen for authentication changes and load wishlist items accordingly
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadWishlistItems(user);
    } else {
      wishlistContainer.innerHTML =
        "<p>Please log in to view your wishlist.</p>";
    }
  });
});

// Listen for logout button click
function logout() {
  signOut(auth)
    .then(() => {
      window.location.href = "../../index.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}  document.getElementById("logout-btn").addEventListener("click", logout);
