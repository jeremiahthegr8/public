// seed.js
import { db } from '../../../database/config.js';
import {
  collection,
  addDoc,
  serverTimestamp,
  increment,
  updateDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

/**
 * Returns a fake product object.
 * @param {number} index Used to vary the data.
 */
function getFakeProduct(index) {
  const categories = {
    electronics: ['Smartphones', 'Laptops', 'Cameras'],
    clothing: ['Men', 'Women'],
    home: ['Furniture', 'Kitchen'],
  };
  const keys = Object.keys(categories);
  const category = keys[index % keys.length];
  const subcats = categories[category];
  const subcategory = subcats[index % subcats.length];

  return {
    name: `Product ${index + 1}`,
    price: (20 + index * 5).toFixed(2),
    salePrice: (15 + index * 4).toFixed(2),
    quantity: Math.floor(Math.random() * 100) + 1,
    description: `This is a realistic fake description for product ${
      index + 1
    }.`,
    category,
    subcategory,
    mainImageUrl: `https://via.placeholder.com/300?text=Prod+${index + 1}`,
    additionalImageUrls: [
      `https://via.placeholder.com/300?text=Alt1+${index + 1}`,
      `https://via.placeholder.com/300?text=Alt2+${index + 1}`,
    ],
    attributes: {
      Brand: 'AcmeCorp',
      Model: `X-${index + 100}`,
      Color: index % 2 === 0 ? 'Black' : 'White',
    },
    tags: ['New Arrival', 'Best Seller'],
    createdAt: serverTimestamp(),
    status: 'active',
    salesCount: Math.floor(Math.random() * 50),
    returnsCount: Math.floor(Math.random() * 10),
    conversionRate: 0, // can be computed later
    rating: 0,
    ratingCount: 0,
    listingMonth: new Date().toISOString().slice(0, 7), // e.g. "2025-04"
    salesHistory: [], // leave empty or pre-populate if you wish
    activityLog: [], // same here
    sellerId: 'cdGnTQ0F0E1DPiKiN8UB',
  };
}

async function seedFakeData() {
  const sellerDocRef = doc(db, 'sellers', 'cdGnTQ0F0E1DPiKiN8UB');

  for (let i = 0; i < 100; i++) {
    const product = getFakeProduct(i);
    try {
      // create a new doc in listings/
      await addDoc(collection(db, 'listings'), product);

      // bump up seller counters
      await updateDoc(sellerDocRef, {
        activeListings: increment(1),
        numberInStock: increment(product.quantity),
      });

      console.log(`✅ Seeded listing #${i + 1}`);
    } catch (err) {
      console.error(`❌ Failed to seed #${i + 1}:`, err);
    }
  }

  console.log('🎉 All done!');
}

seedFakeData();
