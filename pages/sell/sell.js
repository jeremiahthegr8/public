import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  collection,
  addDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  updateDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";


// Ensure user is logged in before allowing them to sell
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You must be logged in to sell an item.");
    window.location.href = "../Login/Login.html";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const sellForm = document.querySelector(".sell-form");
  const categorySelect = document.getElementById("category");
  const subcategoryContainer = document.getElementById("subcategory-container");
  const subcategorySelect = document.getElementById("subcategory");
  const attributesContainer = document.getElementById("attributes-container");

  if (!sellForm) {
    console.error("Sell form not found.");
    return;
  }

  // Expanded category, subcategory, and attributes data
  const categoryData = {
    electronics: {
      subcategories: [
        "Laptop",
        "Phone",
        "TV",
        "Tablet",
        "Camera",
        "Accessories",
        "HardDrives",
        "Mouse",
        "Keyboard",
        "Gadgets",
      ],
      attributes: {
        Laptop: [
          { name: "RAM (GB)", type: "text" },
          {
            name: "RAM Type",
            type: "select",
            options: ["DDR2", "DDR3", "DDR4", "DDR5"],
          },
          { name: "Storage (GB)", type: "text" },
          {
            name: "Storage Type",
            type: "select",
            options: ["SSD", "HDD", "NVMe"],
          },
          { name: "Processor", type: "text" },
          { name: "Processor Generation", type: "text" },
          { name: "Graphics", type: "text" },
          { name: "Screen Size", type: "text" },
          {
            name: "Condition",
            type: "select",
            options: ["New", "Used", "Refurbished"],
          },
          { name: "Brand", type: "text" },
        ],
      },
    },
    fashion: {
      subcategories: [
        "Clothing",
        "Shoes",
        "Accessories",
        "Jewelry",
        "Watches",
        "Bracelets",
        "Bathing Suits",
      ],
      attributes: {
        Clothing: [
          {
            name: "Size",
            type: "select",
            options: ["Small", "Medium", "Large", "XL", "XXL", "XXXL"],
          },
          { name: "Material", type: "text" },
          { name: "Brand", type: "text" },
          { name: "Color", type: "text" },
          {
            name: "Condition",
            type: "select",
            options: ["New", "Used", "Refurbished"],
          },
        ],
      },
    },
    // Add additional categories as needed.
  };

  // Handle category selection
  categorySelect.addEventListener("change", function () {
    const selectedCategory = categorySelect.value;
    if (!selectedCategory || !categoryData[selectedCategory]) {
      subcategoryContainer.style.display = "none";
      attributesContainer.innerHTML = "";
      return;
    }
    // Populate subcategories
    subcategorySelect.innerHTML = `<option value="">Select subcategory</option>`;
    categoryData[selectedCategory].subcategories.forEach((sub) => {
      const option = document.createElement("option");
      option.value = sub;
      option.textContent = sub;
      subcategorySelect.appendChild(option);
    });
    subcategoryContainer.style.display = "block";
    attributesContainer.innerHTML = "";
  });

  // Handle subcategory selection
  subcategorySelect.addEventListener("change", function () {
    const selectedCategory = categorySelect.value;
    const selectedSubcategory = subcategorySelect.value;
    if (
      !selectedSubcategory ||
      !categoryData[selectedCategory].attributes[selectedSubcategory]
    ) {
      attributesContainer.innerHTML = "";
      return;
    }
    // Populate attributes dynamically
    attributesContainer.innerHTML = "";
    categoryData[selectedCategory].attributes[selectedSubcategory].forEach(
      (attr) => {
        const label = document.createElement("label");
        label.textContent = attr.name;
        let input;
        if (attr.type === "select") {
          input = document.createElement("select");
          input.name = attr.name.toLowerCase().replace(/\s+/g, "-");
          attr.options.forEach((option) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            input.appendChild(optionElement);
          });
        } else {
          input = document.createElement("input");
          input.type = attr.type;
          input.name = attr.name.toLowerCase().replace(/\s+/g, "-");
          input.placeholder = `Enter ${attr.name}`;
        }
        attributesContainer.appendChild(label);
        attributesContainer.appendChild(input);
      }
    );
  });

  // Handle form submission
  sellForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const itemName = document.getElementById("item-name").value.trim();
    const description = document.getElementById("description").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const quantity = parseInt(document.getElementById("quantity").value);
    const category = categorySelect.value;
    const subcategory = subcategorySelect.value;
    const imageFile = document.getElementById("image").files[0];

    // Collect dynamic attributes
    const attributeInputs =
      attributesContainer.querySelectorAll("input, select");
    const attributes = {};
    attributeInputs.forEach((input) => {
      if (input.value.trim()) {
        attributes[input.name] = input.value.trim();
      }
    });

    // Validate required fields
    if (
      !itemName ||
      !description ||
      isNaN(price) ||
      price <= 0 ||
      isNaN(quantity) ||
      quantity <= 0 ||
      !category ||
      !subcategory ||
      !imageFile
    ) {
      alert("Please fill in all required fields correctly.");
      return;
    }

    // Convert image to Base64
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = async () => {
      const base64Image = reader.result;
      try {
        const sellerId = auth.currentUser ? auth.currentUser.uid : "guest";

        // Generate search-friendly tags from item name, category, and subcategory
        const tags = [
          ...itemName.toLowerCase().split(" "),
          category.toLowerCase(),
          subcategory.toLowerCase(),
        ];

        // Construct item data including quantity (inventory)
        const itemData = {
          sellerId,
          itemName,
          description,
          price,
          category,
          subcategory,
          tags,
          attributes,
          imageBase64: base64Image,
          status: "active", // active, pending, etc.
          inventory: quantity, // Number of items available
          ratings: [],
          reviews: [],
          createdAt: serverTimestamp(),
        };

        // Save the item to the "items" collection
        const docRef = await addDoc(collection(db, "items"), itemData);
        alert("Item posted successfully! ID: " + docRef.id);

        // Update seller's active listings count by incrementing the activeListings field by 1
        await updateDoc(doc(db, "sellers", sellerId), {
          activeListings: increment(1),
        });

        // Reset the form and clear dynamic sections
        sellForm.reset();
        subcategoryContainer.style.display = "none";
        attributesContainer.innerHTML = "";
      } catch (error) {
        console.error("Error saving item:", error);
        alert("Failed to post item. Please try again.");
      }
    };
  });
});

// Logout Handler
function logout() {
  signOut(auth)
    .then(() => {
      window.location.href = "../../index.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}
document.getElementById("logout-btn").addEventListener("click", logout);
