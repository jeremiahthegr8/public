// main.js
import { db, auth } from '../../../database/config.js';
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  increment,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { uploadFile, getListingMonth } from './helpers.js';
import {
  form,
  populateCategories,
  setupCategoryChange,
  setupSubcategoryChange,
  setupMainImagePreview,
  setupAdditionalImagesPreview,
  setupAttributeButtons,
  setupTags,
  mainImagePreview,
  additionalImagesPreview,
  attributeButtons,
  subcategorySelect,
  selectedAttributes,
  tagsContainer,
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize product data object (with File objects initially)
  let productData = {
    name: '',
    price: '',
    salePrice: '',
    quantity: '',
    description: '',
    category: '',
    subcategory: '',
    mainImage: null, // File object initially
    additionalImages: [], // Array of File objects
    attributes: {},
    tags: [],
  };

  // Populate category dropdown
  populateCategories();

  // Set up category & subcategory change events
  setupCategoryChange(productData);
  const updateAttributeButtons = setupAttributeButtons(productData);
  setupSubcategoryChange(productData, updateAttributeButtons);

  // Set up image previews
  setupMainImagePreview(productData);
  setupAdditionalImagesPreview(productData);

  // Set up tag management
  setupTags(productData);

  // Form submission handler
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Collect text field values
    productData.name = document.getElementById('product-name').value.trim();
    productData.price = document.getElementById('product-price').value.trim();
    productData.salePrice = document
      .getElementById('product-sale-price')
      .value.trim();
    productData.quantity = document
      .getElementById('product-quantity')
      .value.trim();
    productData.description = document
      .getElementById('product-description')
      .value.trim();

    if (!validateForm(productData)) {
      alert('Please fill in all required fields.');
      return;
    }

    // --- Upload Files ---
    try {
      if (productData.mainImage instanceof File) {
        const mainUrl = await uploadFile(
          productData.mainImage,
          'productImages'
        );
        productData.mainImageUrl = mainUrl;
      }
      if (productData.additionalImages.length > 0) {
        const urls = await Promise.all(
          productData.additionalImages.map((file) =>
            uploadFile(file, 'productImages')
          )
        );
        productData.additionalImageUrls = urls;
      }
      // Remove File objects before submission
      delete productData.mainImage;
      delete productData.additionalImages;
    } catch (error) {
      alert('Image upload failed: ' + error.message);
      return;
    }

    // --- Add Analytics & Default Fields ---
    productData.createdAt = serverTimestamp();
    productData.status = 'active'; // active listing
    productData.salesCount = 0;
    productData.returnsCount = 0;
    productData.conversionRate = 0; // to be calculated later
    productData.rating = 0;
    productData.ratingCount = 0;
    productData.listingMonth = getListingMonth();
    productData.salesHistory = []; // Placeholder for monthly sales data
    productData.activityLog = []; // Placeholder for recent activity

    // --- Retrieve Seller ID from User Document ---
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userSnapshot = await getDoc(userDocRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        if (userData.sellerID) {
          // Add seller id to the listing
          productData.sellerId = userData.sellerID;
        } else {
          alert('Seller information not found. Please register as a seller.');
          return;
        }
      }
    } catch (error) {
      alert('Error retrieving seller information: ' + error.message);
      return;
    }

    try {
      // Save the product listing to the "listings" collection
      await addDoc(collection(db, 'listings'), productData);

      // --- Update Seller Data ---
      // Update the seller's document in the "sellers" collection
      const sellerDocRef = doc(db, 'sellers', productData.sellerId);
      await updateDoc(sellerDocRef, {
        activeListings: increment(1),
        numberInStock: increment(parseInt(productData.quantity)),
      });

      alert('Product listing added successfully!');
      form.reset();
      resetForm();
    } catch (error) {
      alert('Failed to add product listing: ' + error.message);
    }
  });

  function validateForm(data) {
    let isValid = true;
    if (!data.name) isValid = false;
    if (!data.price) isValid = false;
    if (!data.quantity) isValid = false;
    if (!data.description) isValid = false;
    if (!data.category) isValid = false;
    if (!data.subcategory) isValid = false;
    if (!data.mainImage) isValid = false;
    return isValid;
  }

  function resetForm() {
    productData = {
      name: '',
      price: '',
      salePrice: '',
      quantity: '',
      description: '',
      category: '',
      subcategory: '',
      mainImage: null,
      additionalImages: [],
      attributes: {},
      tags: [],
    };
    additionalImagesPreview.innerHTML = '';
    attributeButtons.innerHTML = '';
    selectedAttributes.innerHTML = '';
    selectedAttributes.style.display = 'none';
    tagsContainer.innerHTML = '';
    subcategorySelect.disabled = true;
    subcategorySelect.innerHTML =
      '<option value="">Select Subcategory</option>';
    mainImagePreview.style.display = 'none';
  }
});
