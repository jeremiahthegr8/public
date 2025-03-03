import { db, storage, auth } from '../../../database/config.js';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js';

document.addEventListener('DOMContentLoaded', () => {
  // Product data object with analytics fields
  let productData = {
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

  // --- Helper Functions ---

  // Basic sanitization to prevent XSS
  function sanitizeInput(input) {
    return input.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Upload a file to Firebase Storage and return the download URL
  async function uploadFile(file, folder) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB.');
    }
    const fileName = Date.now() + '_' + file.name;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  // Get current month/year in "mm/yyyy" format for analytics grouping
  function getListingMonth() {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
  }

  // --- DOM Elements ---
  const form = document.getElementById('product-upload-form');
  const categorySelect = document.getElementById('product-category');
  const subcategorySelect = document.getElementById('product-subcategory');
  const mainImageInput = document.getElementById('main-image');
  const mainImagePreview = document.getElementById('main-image-preview');
  const mainImagePreviewImg = document.getElementById('main-image-preview-img');
  const additionalImagesInput = document.getElementById('additional-images');
  const additionalImagesPreview = document.getElementById(
    'additional-images-preview'
  );
  const attributeButtons = document.getElementById('attribute-buttons');
  const selectedAttributes = document.getElementById('selected-attributes');
  const tagInput = document.getElementById('product-tag');
  const tagsContainer = document.getElementById('tags-container');

  // Data for categories & subcategories (can be loaded externally)
  const categoriesData = {
    electronics: ['Smartphones', 'Laptops', 'Tablets', 'Cameras', 'Audio'],
    clothing: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear'],
    home: ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Bathroom'],
    beauty: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Bath & Body'],
    sports: [
      'Fitness',
      'Outdoor',
      'Team Sports',
      'Water Sports',
      'Accessories',
    ],
  };

  // Attributes for each subcategory
  const subcategoryAttributes = {
    Smartphones: [
      'Brand',
      'Model',
      'Color',
      'Storage',
      'Screen Size',
      'Battery',
    ],
    Laptops: ['Brand', 'Model', 'Processor', 'RAM', 'Storage', 'Screen Size'],
    Tablets: ['Brand', 'Model', 'Screen Size', 'Battery', 'Storage'],
    Cameras: ['Brand', 'Model', 'Resolution', 'Zoom', 'Lens Type'],
    Audio: ['Brand', 'Type', 'Connectivity', 'Battery Life'],
    Men: ['Brand', 'Size', 'Material', 'Color'],
    Women: ['Brand', 'Size', 'Material', 'Color', 'Fit'],
    Kids: ['Brand', 'Size', 'Material', 'Color'],
    Accessories: ['Brand', 'Type', 'Color'],
    Footwear: ['Brand', 'Size', 'Material', 'Color'],
    Furniture: ['Brand', 'Material', 'Dimensions', 'Color'],
    Decor: ['Brand', 'Material', 'Dimensions', 'Color'],
    Kitchen: ['Brand', 'Material', 'Capacity'],
    Bedding: ['Brand', 'Material', 'Size'],
    Bathroom: ['Brand', 'Material', 'Dimensions'],
    Skincare: ['Brand', 'Skin Type', 'Volume', 'Ingredients'],
    Makeup: ['Brand', 'Shade', 'Volume'],
    Haircare: ['Brand', 'Type', 'Volume'],
    'Bath & Body': ['Brand', 'Volume', 'Ingredients'],
    Fragrance: ['Brand', 'Scent', 'Volume'],
    Fitness: ['Brand', 'Type', 'Capacity'],
    Outdoor: ['Brand', 'Type', 'Material'],
    'Team Sports': ['Brand', 'Type', 'Size'],
    'Water Sports': ['Brand', 'Type', 'Material'],
  };

  // Suggested Tags for tag input
  const suggestedTags = [
    'New Arrival',
    'Best Seller',
    'Discount',
    'Limited Edition',
    'Trending',
    'Exclusive',
  ];

  // --- Populate Category Dropdown ---
  Object.keys(categoriesData).forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categorySelect.appendChild(option);
  });

  // --- Category Change Event ---
  categorySelect.addEventListener('change', function () {
    const selectedCategory = this.value;
    productData.category = selectedCategory;
    productData.subcategory = '';
    productData.attributes = {};
    subcategorySelect.innerHTML =
      '<option value="">Select Subcategory</option>';
    if (selectedCategory) {
      subcategorySelect.disabled = false;
      categoriesData[selectedCategory].forEach((sub) => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        subcategorySelect.appendChild(option);
      });
      attributeButtons.innerHTML = '';
      selectedAttributes.innerHTML = '';
      selectedAttributes.style.display = 'none';
    } else {
      subcategorySelect.disabled = true;
      attributeButtons.innerHTML = '';
      selectedAttributes.innerHTML = '';
      selectedAttributes.style.display = 'none';
    }
  });

  // --- Subcategory Change Event (update attributes) ---
  subcategorySelect.addEventListener('change', function () {
    productData.subcategory = this.value;
    updateAttributeButtons(productData.subcategory);
  });

  // --- Main Image Upload & Preview ---
  mainImageInput.addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
      productData.mainImage = file;
      const reader = new FileReader();
      reader.onload = function (e) {
        mainImagePreviewImg.src = e.target.result;
        mainImagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  // --- Additional Images Upload & Preview ---
  additionalImagesInput.addEventListener('change', function () {
    const files = Array.from(this.files);
    if (files.length > 0) {
      const selectedFiles = files.slice(0, 4);
      productData.additionalImages = selectedFiles;
      additionalImagesPreview.innerHTML = '';
      selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
          const previewDiv = document.createElement('div');
          previewDiv.style.position = 'relative';
          previewDiv.innerHTML = `<img src="${e.target.result}" alt="Image ${
            index + 1
          }" style="max-width:100px; border: 1px solid #e2e8f0; border-radius: 4px;"> <span style="position:absolute; top:-5px; right:-5px; background:#3ccfcf; color:#fff; border-radius:50%; padding:2px 6px; cursor:pointer;" data-index="${index}">×</span>`;
          additionalImagesPreview.appendChild(previewDiv);
          previewDiv
            .querySelector('span')
            .addEventListener('click', function () {
              const idx = parseInt(this.getAttribute('data-index'));
              removeAdditionalImage(idx);
            });
        };
        reader.readAsDataURL(file);
      });
    }
  });

  function removeAdditionalImage(index) {
    productData.additionalImages = productData.additionalImages.filter(
      (_, i) => i !== index
    );
    additionalImagesPreview.innerHTML = '';
    productData.additionalImages.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const previewDiv = document.createElement('div');
        previewDiv.style.position = 'relative';
        previewDiv.innerHTML = `<img src="${e.target.result}" alt="Image ${
          idx + 1
        }" style="max-width:100px; border: 1px solid #e2e8f0; border-radius: 4px;"> <span style="position:absolute; top:-5px; right:-5px; background:#3ccfcf; color:#fff; border-radius:50%; padding:2px 6px; cursor:pointer;" data-index="${idx}">×</span>`;
        additionalImagesPreview.appendChild(previewDiv);
        previewDiv.querySelector('span').addEventListener('click', function () {
          removeAdditionalImage(parseInt(this.getAttribute('data-index')));
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Attribute Buttons & Selection ---
  function updateAttributeButtons(subcat) {
    attributeButtons.innerHTML = '';
    selectedAttributes.innerHTML = '';
    selectedAttributes.style.display = 'none';
    if (!subcat || !subcategoryAttributes[subcat]) return;
    subcategoryAttributes[subcat].forEach((attr) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'attribute-btn';
      button.textContent = '+ ' + attr;
      button.setAttribute('data-attribute', attr);
      button.addEventListener('click', function () {
        if (productData.attributes.hasOwnProperty(attr)) {
          removeAttribute(attr);
          button.classList.remove('selected');
        } else {
          addAttribute(attr);
          button.classList.add('selected');
        }
      });
      attributeButtons.appendChild(button);
    });
  }

  function addAttribute(attr) {
    if (!productData.attributes.hasOwnProperty(attr)) {
      productData.attributes[attr] = '';
      if (Object.keys(productData.attributes).length === 1) {
        selectedAttributes.style.display = 'block';
      }
      const attributeRow = document.createElement('div');
      attributeRow.className = 'attribute-row';
      attributeRow.setAttribute('data-attribute', attr);
      attributeRow.innerHTML = `<div class="attribute-name">${attr}:</div>
        <input type="text" class="attribute-value" placeholder="Enter ${attr.toLowerCase()}">
        <button type="button" class="remove-attribute" title="Remove">×</button>`;
      selectedAttributes.appendChild(attributeRow);
      attributeRow
        .querySelector('.attribute-value')
        .addEventListener('input', function () {
          productData.attributes[attr] = this.value;
        });
      attributeRow
        .querySelector('.remove-attribute')
        .addEventListener('click', function () {
          removeAttribute(attr);
          const btn = attributeButtons.querySelector(
            `[data-attribute="${attr}"]`
          );
          if (btn) btn.classList.remove('selected');
        });
    }
  }

  function removeAttribute(attr) {
    delete productData.attributes[attr];
    const row = selectedAttributes.querySelector(`[data-attribute="${attr}"]`);
    if (row) row.remove();
    if (Object.keys(productData.attributes).length === 0) {
      selectedAttributes.style.display = 'none';
    }
  }

  // --- Tag Management ---
  const tagSuggestions = document.createElement('div');
  tagSuggestions.className = 'tag-suggestions';
  tagInput.parentNode.appendChild(tagSuggestions);

  tagInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = tagInput.value.trim();
      if (tag && !productData.tags.includes(tag)) {
        productData.tags.push(tag);
        renderTags();
      }
      tagInput.value = '';
      tagSuggestions.innerHTML = '';
    }
  });

  tagInput.addEventListener('input', function () {
    const query = tagInput.value.trim().toLowerCase();
    tagSuggestions.innerHTML = '';
    if (query.length > 0) {
      const matches = suggestedTags.filter((tag) =>
        tag.toLowerCase().includes(query)
      );
      matches.forEach((match) => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion';
        suggestionDiv.textContent = match;
        suggestionDiv.addEventListener('click', function () {
          if (!productData.tags.includes(match)) {
            productData.tags.push(match);
            renderTags();
          }
          tagInput.value = '';
          tagSuggestions.innerHTML = '';
        });
        tagSuggestions.appendChild(suggestionDiv);
      });
    }
  });

  document.addEventListener('click', function (e) {
    if (!tagInput.contains(e.target) && !tagSuggestions.contains(e.target)) {
      tagSuggestions.innerHTML = '';
    }
  });

  function renderTags() {
    tagsContainer.innerHTML = '';
    productData.tags.forEach((tag) => {
      const tagElem = document.createElement('div');
      tagElem.className = 'tag';
      tagElem.innerHTML = `${tag} <button type="button" data-tag="${tag}">×</button>`;
      tagsContainer.appendChild(tagElem);
      tagElem.querySelector('button').addEventListener('click', function () {
        const tagToRemove = this.getAttribute('data-tag');
        productData.tags = productData.tags.filter((t) => t !== tagToRemove);
        renderTags();
      });
    });
  }

  // --- Form Submission & Validation ---
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
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
    if (!validateForm()) {
      alert('Please fill in all required fields.');
      return;
    }

    // --- Add Analytics Fields ---
    productData.createdAt = serverTimestamp();
    productData.status = 'active'; // active listing
    productData.salesCount = 0;
    productData.returnsCount = 0;
    productData.conversionRate = 0; // to be calculated later
    productData.rating = 0;
    productData.ratingCount = 0;
    productData.listingMonth = getListingMonth();
    productData.salesHistory = []; // for monthly sales data
    productData.activityLog = []; // for tracking recent activity

    try {
      await addDoc(collection(db, 'listings'), productData);
      alert('Product listing added successfully!');
      form.reset();
      resetForm();
    } catch (error) {
      alert('Failed to add product listing: ' + error.message);
    }
  });

  function validateForm() {
    let isValid = true;
    if (!productData.name) isValid = false;
    if (!productData.price) isValid = false;
    if (!productData.quantity) isValid = false;
    if (!productData.description) isValid = false;
    if (!productData.category) isValid = false;
    if (!productData.subcategory) isValid = false;
    if (!productData.mainImage) isValid = false;
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
