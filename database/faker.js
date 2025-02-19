// Import faker as ES module from CDN
import { faker } from "https://cdn.jsdelivr.net/npm/@faker-js/faker@8.0.0/+esm";

// Import Firestore
import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { db } from "./config.js";

async function generateFakeItems() {
  const categories = ["Electronics", "Fashion", "Sports", "Books", "Toys"];
  const subcategories = {
    Electronics: ["Laptop", "Smartphone", "Camera", "Tablet"],
    Fashion: ["Shoes", "Shirts", "Dresses", "Hats"],
    Sports: ["Football", "Basketball", "Tennis", "Running"],
    Books: ["Fiction", "Non-fiction", "Science", "History"],
    Toys: ["Board Games", "Dolls", "LEGO", "Cars"],
  };

  for (let i = 0; i < 50; i++) {
    const category = faker.helpers.arrayElement(categories);
    const subcategory = faker.helpers.arrayElement(subcategories[category]);

    const item = {
      userId: faker.string.uuid(),
      itemName: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price({ min: 5, max: 1000 })),
      category,
      subcategory,
      tags: [category.toLowerCase(), subcategory.toLowerCase()],
      attributes: {
        color: faker.color.human(),
        size: faker.helpers.arrayElement(["S", "M", "L", "XL"]),
        brand: faker.company.name(),
      },
      imageBase64: faker.image.url({ width: 200, height: 200 }),
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "items"), item);
      console.log(`Item ${i + 1} added: ${item.itemName}`);
    } catch (error) {
      console.error(`Error adding item ${i + 1}:`, error);
    }
  }

  alert("50 fake items added to Firestore!");
}

// Attach to window for HTML button onclick
window.generateFakeItems = generateFakeItems;
