import { db } from './config.js';
import {
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  const productsContainer = document.getElementById('products-container'); // Main container to hold all categories

  try {
    const querySnapshot = await getDocs(collection(db, 'items'));
    const itemsByCategory = {};

    querySnapshot.forEach((doc) => {
      const item = doc.data();
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      if (itemsByCategory[item.category].length < 5) {
        itemsByCategory[item.category].push(item);
      }
    });

    // Loop through categories and create sections dynamically
    for (const category in itemsByCategory) {
      const section = document.createElement('section');
      section.classList.add('category-section');
      section.id = `category-${category.replace(/\s+/g, '-').toLowerCase()}`; // Unique ID

      section.innerHTML = `
        <h2>${category}</h2>
        <div class="category-products">
          ${itemsByCategory[category]
            .map(
              (item) => `
            <div class="product-card">
              <img src="${item.imageBase64}" alt="${item.itemName}">
              <h3>${item.itemName}</h3>
              <p>${item.description.substring(0, 50)}...</p>
              <span class="price">$${item.price}</span>
              <button class="buy-now">Buy Now</button>
              <span class="wishlist-heart">❤️</span>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      productsContainer.appendChild(section);
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
});
