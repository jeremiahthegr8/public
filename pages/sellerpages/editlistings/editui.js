// editui.js

// Data for categories & subcategories
export const categoriesData = {
  electronics: ['Smartphones', 'Laptops', 'Tablets', 'Cameras', 'Audio'],
  clothing: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear'],
  home: ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Bathroom'],
  beauty: ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Bath & Body'],
  sports: ['Fitness', 'Outdoor', 'Team Sports', 'Water Sports', 'Accessories'],
};

// Attributes for each subcategory
export const subcategoryAttributes = {
  Smartphones: ['Brand', 'Model', 'Color', 'Storage', 'Screen Size', 'Battery'],
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

// Suggested tags for tag input
export const suggestedTags = [
  'New Arrival',
  'Best Seller',
  'Discount',
  'Limited Edition',
  'Trending',
  'Exclusive',
];

/**
 * Populates the category dropdown.
 */
export function populateCategories() {
  const categorySelect = document.getElementById('product-category');
  categorySelect.innerHTML = '<option value="">Select Category</option>';
  Object.keys(categoriesData).forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    categorySelect.appendChild(option);
  });
}

/**
 * Sets up the category change event.
 * @param {object} productData
 */
export function setupCategoryChange(productData) {
  const categorySelect = document.getElementById('product-category');
  const subcategorySelect = document.getElementById('product-subcategory');
  categorySelect.addEventListener('change', function () {
    const selectedCategory = this.value;
    productData.category = selectedCategory;
    productData.subcategory = '';
    productData.attributes = {};
    subcategorySelect.innerHTML =
      '<option value="">Select Subcategory</option>';
    if (selectedCategory) {
      subcategorySelect.disabled = false;
      categoriesData[selectedCategory].forEach((subcat) => {
        const option = document.createElement('option');
        option.value = subcat;
        option.textContent = subcat;
        subcategorySelect.appendChild(option);
      });
      // Clear previous attributes UI
      document.getElementById('attribute-buttons').innerHTML = '';
      document.getElementById('selected-attributes').innerHTML = '';
      document.getElementById('selected-attributes').style.display = 'none';
    } else {
      subcategorySelect.disabled = true;
      document.getElementById('attribute-buttons').innerHTML = '';
      document.getElementById('selected-attributes').innerHTML = '';
      document.getElementById('selected-attributes').style.display = 'none';
    }
  });
}

/**
 * Sets up subcategory change event to update attributes.
 * @param {object} productData
 * @param {Function} updateAttributeButtons
 */
export function setupSubcategoryChange(productData, updateAttributeButtons) {
  const subcategorySelect = document.getElementById('product-subcategory');
  subcategorySelect.addEventListener('change', function () {
    productData.subcategory = this.value;
    updateAttributeButtons(productData.subcategory);
  });
}

/**
 * Sets up main image preview.
 * @param {object} productData
 */
export function setupMainImagePreview(productData) {
  const mainImageInput = document.getElementById('main-image');
  const mainImagePreview = document.getElementById('main-image-preview');
  const mainImagePreviewImg = document.getElementById('main-image-preview-img');
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
}

/**
 * Sets up additional images preview.
 * @param {object} productData
 */
export function setupAdditionalImagesPreview(productData) {
  const additionalImagesInput = document.getElementById('additional-images');
  const additionalImagesPreview = document.getElementById(
    'additional-images-preview'
  );
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
          }" style="max-width:100px; border: 1px solid var(--border-color); border-radius: 4px;"> <span style="position:absolute; top:-5px; right:-5px; background:var(--accent-color); color:#fff; border-radius:50%; padding:2px 6px; cursor:pointer;" data-index="${index}">×</span>`;
          additionalImagesPreview.appendChild(previewDiv);
          previewDiv
            .querySelector('span')
            .addEventListener('click', function () {
              const idx = parseInt(this.getAttribute('data-index'));
              removeAdditionalImage(productData, idx);
            });
        };
        reader.readAsDataURL(file);
      });
    }
  });
}

function removeAdditionalImage(productData, index) {
  productData.additionalImages = productData.additionalImages.filter(
    (_, i) => i !== index
  );
  const additionalImagesPreview = document.getElementById(
    'additional-images-preview'
  );
  additionalImagesPreview.innerHTML = '';
  productData.additionalImages.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const previewDiv = document.createElement('div');
      previewDiv.style.position = 'relative';
      previewDiv.innerHTML = `<img src="${e.target.result}" alt="Image ${
        idx + 1
      }" style="max-width:100px; border: 1px solid var(--border-color); border-radius: 4px;"> <span style="position:absolute; top:-5px; right:-5px; background:var(--accent-color); color:#fff; border-radius:50%; padding:2px 6px; cursor:pointer;" data-index="${idx}">×</span>`;
      additionalImagesPreview.appendChild(previewDiv);
      previewDiv.querySelector('span').addEventListener('click', function () {
        removeAdditionalImage(
          productData,
          parseInt(this.getAttribute('data-index'))
        );
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sets up attribute buttons and returns an update function.
 * When a subcategory is selected, it creates buttons for each attribute.
 * It also auto-checks and renders any attributes already in productData.attributes.
 * @param {object} productData
 * @returns {Function} updateAttributeButtons
 */
export function setupAttributeButtons(productData) {
  const attributeButtons = document.getElementById('attribute-buttons');
  return function updateAttributeButtons(subcat) {
    attributeButtons.innerHTML = '';
    // Build attribute buttons based on subcategoryAttributes
    if (!subcat || !subcategoryAttributes[subcat]) return;
    subcategoryAttributes[subcat].forEach((attr) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'attribute-btn';
      button.textContent = '+ ' + attr;
      button.setAttribute('data-attribute', attr);
      // If the attribute is already saved, mark as selected
      if (productData.attributes.hasOwnProperty(attr)) {
        button.classList.add('selected');
      }
      button.addEventListener('click', function () {
        if (productData.attributes.hasOwnProperty(attr)) {
          delete productData.attributes[attr];
          button.classList.remove('selected');
        } else {
          productData.attributes[attr] = ''; // initialize with empty value
          button.classList.add('selected');
        }
        // Always re-render the attribute inputs after a change.
        renderAttributes(productData.attributes);
      });
      attributeButtons.appendChild(button);
    });
    // Auto-render any saved attributes.
    renderAttributes(productData.attributes);
  };
}

/**
 * Renders the attribute input rows based on the provided attributes.
 * This auto-fills inputs with saved values so the seller can update them.
 * @param {object} attributes
 */
export function renderAttributes(attributes) {
  const selectedAttributes = document.getElementById('selected-attributes');
  selectedAttributes.innerHTML = '';
  const keys = Object.keys(attributes);
  if (keys.length > 0) {
    selectedAttributes.style.display = 'block';
  } else {
    selectedAttributes.style.display = 'none';
  }
  keys.forEach((attr) => {
    const attributeRow = document.createElement('div');
    attributeRow.className = 'attribute-row';
    attributeRow.setAttribute('data-attribute', attr);
    attributeRow.innerHTML = `<div class="attribute-name">${attr}:</div>
      <input type="text" class="attribute-value" placeholder="Enter ${attr.toLowerCase()}" value="${
      attributes[attr] || ''
    }">
      <button type="button" class="remove-attribute" title="Remove">×</button>`;
    selectedAttributes.appendChild(attributeRow);
    attributeRow
      .querySelector('.attribute-value')
      .addEventListener('input', function () {
        attributes[attr] = this.value;
      });
    attributeRow
      .querySelector('.remove-attribute')
      .addEventListener('click', function () {
        delete attributes[attr];
        renderAttributes(attributes);
      });
  });
}

/**
 * Sets up tag input functionality.
 * @param {object} productData
 */
export function setupTags(productData) {
  const tagInput = document.getElementById('product-tag');
  const tagsContainer = document.getElementById('tags-container');
  const tagSuggestions = document.createElement('div');
  tagSuggestions.className = 'tag-suggestions';
  tagInput.parentNode.appendChild(tagSuggestions);

  tagInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = tagInput.value.trim();
      if (tag && !productData.tags.includes(tag)) {
        productData.tags.push(tag);
        renderTags(productData);
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
            renderTags(productData);
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
}

/**
 * Renders the tags from productData.tags.
 * @param {object} productData
 */
export function renderTags(productData) {
  const tagsContainer = document.getElementById('tags-container');
  tagsContainer.innerHTML = '';
  productData.tags.forEach((tag) => {
    const tagElem = document.createElement('div');
    tagElem.className = 'tag';
    tagElem.innerHTML = `${tag} <button type="button" data-tag="${tag}">×</button>`;
    tagsContainer.appendChild(tagElem);
    tagElem.querySelector('button').addEventListener('click', function () {
      const tagToRemove = this.getAttribute('data-tag');
      productData.tags = productData.tags.filter((t) => t !== tagToRemove);
      renderTags(productData);
    });
  });
}
