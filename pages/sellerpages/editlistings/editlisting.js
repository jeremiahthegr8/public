import { db, auth } from '../../../database/config.js';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import {
  populateCategories,
  setupCategoryChange,
  setupSubcategoryChange,
  setupMainImagePreview,
  setupAdditionalImagesPreview,
  setupAttributeButtons,
  setupTags,
  renderAttributes,
  renderTags,
} from './editui.js';


// Get the product ID from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
  alert('No product ID provided.');
  window.location.href = '../listings/listings.html';
}

// Global productData object for edit mode
let productData = {
  name: '',
  price: '',
  salePrice: '',
  quantity: '',
  description: '',
  category: '',
  subcategory: '',
  mainImage: null, // File object if changed
  additionalImages: [], // Array of File objects if changed
  attributes: {},
  tags: [],
  mainImageUrl: '', // Current URL
  additionalImageUrls: [], // Current URLs
  sellerId: '',
};

// Save the original quantity for later calculation
let originalQuantity = 0;

// Set up UI helpers
populateCategories();
setupCategoryChange(productData);
const updateAttrButtons = setupAttributeButtons(productData);
setupSubcategoryChange(productData, updateAttrButtons);
setupMainImagePreview(productData);
setupAdditionalImagesPreview(productData);
setupTags(productData);

// When the DOM is loaded, fetch the product details and prefill the form
// ... (imports and initial code remain the same)

// When the DOM is loaded, fetch the product details and prefill the form
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const productDocRef = doc(db, 'listings', productId);
    const productSnap = await getDoc(productDocRef);
    if (productSnap.exists()) {
      const data = productSnap.data();
      productData = { ...productData, ...data, id: productId };
      originalQuantity = Number(data.quantity);
      prefillForm(productData);
    } else {
      alert('Product not found.');
      window.location.href = '../listings/listings.html';
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    alert('Error fetching product data.');
  }
});

// Function to prefill form fields and trigger attribute rendering
function prefillForm(data) {
  document.getElementById('product-name').value = data.name || '';
  document.getElementById('product-price').value = data.price || '';
  document.getElementById('product-sale-price').value = data.salePrice || '';
  document.getElementById('product-quantity').value = data.quantity || '';
  document.getElementById('product-description').value = data.description || '';

  // Set category and trigger change to populate subcategories
  const categorySelect = document.getElementById('product-category');
  categorySelect.value = data.category || '';
  categorySelect.dispatchEvent(new Event('change'));

  // After a short delay (to allow subcategory options to populate), set the subcategory value
  setTimeout(() => {
    const subcategorySelect = document.getElementById('product-subcategory');
    subcategorySelect.value = data.subcategory || '';
    // Now call the updateAttributeButtons function to auto-render saved attributes
    // (Assuming updateAttrButtons was obtained during initial UI setup)
    updateAttrButtons(data.subcategory);
    // Also, render the attribute input rows with the saved attribute values.
    renderAttributes(data.attributes);
  }, 300);

  // Set main image preview if URL exists
  if (data.mainImageUrl) {
    const mainPreview = document.getElementById('main-image-preview');
    const mainPreviewImg = document.getElementById('main-image-preview-img');
    mainPreviewImg.src = data.mainImageUrl;
    mainPreview.style.display = 'block';
  }

  // Set additional images preview if URLs exist
  if (data.additionalImageUrls && data.additionalImageUrls.length > 0) {
    const additionalPreview = document.getElementById('additional-images-preview');
    additionalPreview.innerHTML = '';
    data.additionalImageUrls.forEach(url => {
      const imgElem = document.createElement('img');
      imgElem.src = url;
      imgElem.style.maxWidth = '100px';
      imgElem.style.border = '1px solid var(--border-color)';
      imgElem.style.borderRadius = '4px';
      additionalPreview.appendChild(imgElem);
    });
  }

  // (Optional) If you have saved tags/attributes in data, they are already in productData.
  // You can also call renderTags(data.tags) here if needed.
}


// Form submission handler for updating the product
const form = document.getElementById('product-edit-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Collect updated data from the form
  const updatedData = {
    name: document.getElementById('product-name').value.trim(),
    price: document.getElementById('product-price').value.trim(),
    salePrice: document.getElementById('product-sale-price').value.trim(),
    quantity: document.getElementById('product-quantity').value.trim(),
    description: document.getElementById('product-description').value.trim(),
    category: document.getElementById('product-category').value,
    subcategory: document.getElementById('product-subcategory').value,
    attributes: productData.attributes, // managed via UI helper
    tags: productData.tags,             // managed via UI helper
    updatedAt: serverTimestamp(),
  };

  // Optionally: Handle image updates if new files were selected.
  // (e.g., upload new images using uploadFile helper and update mainImageUrl/additionalImageUrls)

  try {
    // Update the product listing in Firestore and wait for completion.
    await updateDoc(doc(db, 'listings', productId), updatedData);

    // Calculate the difference in quantity (new - original)
    const newQuantity = Number(updatedData.quantity);
    const quantityDiff = newQuantity - originalQuantity;
    if (quantityDiff !== 0) {
      // Update the seller's numberInStock by the difference
      const sellerDocRef = doc(db, 'sellers', productData.sellerId);
      await updateDoc(sellerDocRef, {
        numberInStock: increment(quantityDiff),
      });
    }

    // Once everything is updated, show a success notification and then redirect.
    Swal.fire('Success', 'Product updated successfully.', 'success')
      .then(() => {
        window.location.href = '../listings/listings.html';
      });
  } catch (error) {
    console.error('Error updating product:', error);
    Swal.fire('Error', 'Error updating product. Please try again.', 'error');
  }
});

