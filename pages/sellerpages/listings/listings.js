import { auth, db } from '../../../database/config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// --- Redirect for "Add New Listing" ---
document.getElementById('addListingBtn').addEventListener('click', () => {
  window.location.href = '../addnewlisting/addnewlisting.html';
});

// Global variables
let products = [];
let currentSellerId = null;

// Check authentication and retrieve seller ID from the user's document
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../../userpages/SignUp/SignUp.html';
  } else {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        currentSellerId = userData.sellerID;
        await fetchSellerListings();
      } else {
        console.error('User document not found.');
      }
    } catch (error) {
      console.error('Error retrieving user data:', error);
    }
  }
});

// --- Function to fetch seller listings from Firestore ---
async function fetchSellerListings() {
  try {
    const listingsRef = collection(db, 'listings');
    const q = query(listingsRef, where('sellerId', '==', currentSellerId));
    const snapshot = await getDocs(q);
    products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderViews();
  } catch (error) {
    console.error('Error fetching seller listings:', error);
  }
}

// --- Grid View Rendering ---
function renderGridView(filteredProducts) {
  const gridView = document.getElementById('gridView');
  gridView.innerHTML = '';
  filteredProducts.forEach((product) => {
    const card = document.createElement('div');
    card.className =
      'bg-white rounded-lg overflow-hidden transition-all duration-200 hover:shadow-xl relative';
    card.innerHTML = `
      <div class="relative h-48 bg-gray-100 flex items-center justify-center">
        <img src="${product.mainImageUrl}" alt="${
      product.name
    }" class="object-contain h-full w-full p-4" />
        <span class="absolute top-3 right-3 text-white text-xs px-2 py-1 rounded" style="background-color: ${
          product.status === 'active'
            ? 'var(--success-color)'
            : 'var(--warning-color)'
        }">
          ${product.status}
        </span>
      </div>
      <div class="p-6">
        <h2 class="text-lg font-medium">${product.name}</h2>
        <p class="text-gray-500 text-sm">${product.category || ''}</p>
        <p class="text-2xl font-semibold">$${product.price}</p>
        <p class="text-gray-500 text-sm">In Stock: ${product.quantity}</p>
      </div>
      <div class="bg-gray-50 px-6 py-3 flex items-center justify-end relative space-x-2">
        <!-- Sales Summary Button -->
        <button onclick="window.location.href='../productsummary/productsummary.html?id=${
          product.id
        }'" class="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90 text-white rounded px-3 py-1 text-sm inline-flex items-center transition-all shadow-sm">
          <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18"></path>
          </svg>
          Sales Summary
        </button>
        <!-- Actions Button -->
        <button class="action-menu-btn" data-product-id="${product.id}">
          <svg class="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v.01M12 12v.01M12 18v.01"></path>
          </svg>
        </button>
        <!-- Dropdown for Grid View Actions -->
        <div class="dropdown-menu absolute right-4 bottom-12 mt-2 w-44 bg-white border border-gray-200 rounded shadow-lg z-10" data-product-id="${
          product.id
        }">
          <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700" data-action="edit" data-product-id="${
            product.id
          }">
            <svg class="inline-block mr-1 h-4 w-4 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4h2m-1 0v16"></path>
            </svg>
            Edit
          </a>
          <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700" data-action="toggle" data-product-id="${
            product.id
          }">
            <svg class="inline-block mr-1 h-4 w-4 ${
              product.status === 'active' ? 'text-yellow-500' : 'text-green-500'
            }" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            ${product.status === 'active' ? 'Hide Product' : 'Show Product'}
          </a>
          <a href="#" class="dropdown-item block px-4 py-2 text-sm text-red-600" data-action="delete" data-product-id="${
            product.id
          }">
            <svg class="inline-block mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Delete
          </a>
        </div>
      </div>
    `;
    gridView.appendChild(card);
  });
}

// --- Table View Rendering ---
function renderTableView(filteredProducts) {
  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = '';
  filteredProducts.forEach((product) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 transition-all';
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
          <img src="${product.mainImageUrl}" alt="${
      product.name
    }" class="object-contain w-full h-full" />
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap font-medium">${product.name}</td>
      <td class="px-6 py-4 whitespace-nowrap">${product.category || ''}</td>
      <td class="px-6 py-4 whitespace-nowrap">$${product.price}</td>
      <td class="px-6 py-4 whitespace-nowrap">${product.quantity}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="text-white text-xs px-2 py-1 rounded" style="background-color: ${
          product.status === 'active'
            ? 'var(--success-color)'
            : 'var(--warning-color)'
        }">
          ${product.status}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-left relative">
        <button class="action-menu-btn" data-product-id="${product.id}">
          <svg class="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v.01M12 12v.01M12 18v.01"></path>
          </svg>
        </button>
        <div class="dropdown-menu absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded shadow-lg z-10" data-product-id="${
          product.id
        }">
          <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700" data-action="edit" data-product-id="${
            product.id
          }">
            <svg class="inline-block mr-1 h-4 w-4 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4h2m-1 0v16"></path>
            </svg>
            Edit
          </a>
          <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700" data-action="sales" data-product-id="${
            product.id
          }">
            <svg class="inline-block mr-1 h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18"></path>
            </svg>
            Sales Summary
          </a>
          <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700" data-action="toggle" data-product-id="${
            product.id
          }">
            <svg class="inline-block mr-1 h-4 w-4 ${
              product.status === 'active' ? 'text-yellow-500' : 'text-green-500'
            }" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            ${product.status === 'active' ? 'Hide Product' : 'Show Product'}
          </a>
          <a href="#" class="dropdown-item block px-4 py-2 text-sm text-red-600" data-action="delete" data-product-id="${
            product.id
          }">
            <svg class="inline-block mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Delete
          </a>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Attach dropdown listeners for action buttons
function attachDropdownListeners() {
  document.querySelectorAll('.action-menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prodId = btn.getAttribute('data-product-id');
      document
        .querySelectorAll(`.dropdown-menu[data-product-id="${prodId}"]`)
        .forEach((menu) => {
          menu.classList.toggle('show');
        });
    });
  });
  document.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const action = item.getAttribute('data-action');
      const prodId = item.getAttribute('data-product-id');
      document
        .querySelector(`.dropdown-menu[data-product-id="${prodId}"]`)
        .classList.remove('show');
      if (action === 'edit') {
        window.location.href = '../editlistings/editlisting.html?id=' + prodId;
      } else if (action === 'sales') {
        window.location.href = '../productsummary/productsummary.html?id=' + prodId;
      } else if (action === 'toggle') {
        currentVisibilityProductId = prodId;
        // Find the product to check its current status
        const product = products.find((p) => p.id === prodId);
        if (!product) {
          console.error('Product not found for toggling visibility.');
          return;
        }
        if (product.status === 'active') {
          document.getElementById('visibilityModalTitle').innerText =
            'Hide Product';
          document.getElementById('visibilityModalText').innerText =
            'Are you sure you want to hide this product? It will no longer be visible to customers.';
        } else {
          document.getElementById('visibilityModalTitle').innerText =
            'Show Product';
          document.getElementById('visibilityModalText').innerText =
            'Are you sure you want to show this product? It will be visible to customers.';
        }
        document.getElementById('visibilityModal').classList.remove('hidden');
      } else if (action === 'delete') {
        currentDeleteProductId = prodId;
        document.getElementById('confirmationModal').classList.remove('hidden');
      }
    });
  });
}

// --- Render Views with Filtering ---
function renderViews() {
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  const categoryFilter = document.getElementById('categoryFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const sortOption = document.getElementById('sortFilter').value;

  let filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchText)
  );

  if (categoryFilter !== 'All Categories') {
    filteredProducts = filteredProducts.filter(
      (p) => (p.category || '').toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  if (statusFilter !== 'Status') {
    filteredProducts = filteredProducts.filter(
      (p) => p.status.toLowerCase() === statusFilter.toLowerCase()
    );
  }

  if (sortOption === 'Price Low to High') {
    filteredProducts.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortOption === 'Price High to Low') {
    filteredProducts.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortOption === 'Name A-Z') {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOption === 'Name Z-A') {
    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
  }

  renderGridView(filteredProducts);
  renderTableView(filteredProducts);
  attachDropdownListeners();
}

// Event Listeners for Search and Filters
document
  .getElementById('searchInput')
  .addEventListener('input', () => renderViews());
document
  .getElementById('categoryFilter')
  .addEventListener('change', () => renderViews());
document
  .getElementById('statusFilter')
  .addEventListener('change', () => renderViews());
document
  .getElementById('sortFilter')
  .addEventListener('change', () => renderViews());

// Hide dropdown menus when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-menu').forEach((menu) => {
    menu.classList.remove('show');
  });
});

// Toggle Between Grid and Table Views
document.getElementById('gridToggle').addEventListener('click', () => {
  document.getElementById('gridToggle').classList.add('active-toggle');
  document.getElementById('tableToggle').classList.remove('active-toggle');
  document.getElementById('gridView').classList.remove('hidden');
  document.getElementById('tableView').classList.add('hidden');
});
document.getElementById('tableToggle').addEventListener('click', () => {
  document.getElementById('tableToggle').classList.add('active-toggle');
  document.getElementById('gridToggle').classList.remove('active-toggle');
  document.getElementById('tableView').classList.remove('hidden');
  document.getElementById('gridView').classList.add('hidden');
});

// --- Modal Dialogs ---
let currentDeleteProductId = null;
let currentVisibilityProductId = null;

const confirmationModal = document.getElementById('confirmationModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

cancelDeleteBtn.addEventListener('click', () => {
  confirmationModal.classList.add('hidden');
});
confirmDeleteBtn.addEventListener('click', async () => {
  confirmationModal.classList.add('hidden');

  // Find the product to delete from the products array
  const productToDelete = products.find((p) => p.id === currentDeleteProductId);
  if (!productToDelete) {
    console.error('Product not found.');
    return;
  }

  try {
    // Delete the product document from the global listings collection
    await deleteDoc(doc(db, 'listings', currentDeleteProductId));

    // Update the seller's document in the "sellers" collection:
    // Always decrement the seller's inventory stock by the product's quantity.
    // Decrement activeListings by 1 only if the product was active.
    const updateData = {
      numberInStock: increment(-Number(productToDelete.quantity)),
    };

    if (productToDelete.status === 'active') {
      updateData.activeListings = increment(-1);
    }

    await updateDoc(doc(db, 'sellers', currentSellerId), updateData);

    alert('Product deleted successfully.');
    // Refresh the listings
    await fetchSellerListings();
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Error deleting product. Please try again.');
  }
});


const visibilityModal = document.getElementById('visibilityModal');
const cancelVisibilityBtn = document.getElementById('cancelVisibilityBtn');
const confirmVisibilityBtn = document.getElementById('confirmVisibilityBtn');

confirmVisibilityBtn.addEventListener('click', async () => {
  visibilityModal.classList.add('hidden');
  try {
    const productToToggle = products.find(
      (p) => p.id === currentVisibilityProductId
    );
    if (!productToToggle) {
      console.error('Product not found.');
      return;
    }
    if (productToToggle.status === 'active') {
      // Hide product: set status to 'inactive' and decrement activeListings by 1.
      await updateDoc(doc(db, 'listings', currentVisibilityProductId), {
        status: 'inactive',
      });
      await updateDoc(doc(db, 'sellers', currentSellerId), {
        activeListings: increment(-1),
      });
      alert('Product hidden successfully.');
    } else {
      // Show product: set status to 'active' and increment activeListings by 1.
      await updateDoc(doc(db, 'listings', currentVisibilityProductId), {
        status: 'active',
      });
      await updateDoc(doc(db, 'sellers', currentSellerId), {
        activeListings: increment(1),
      });
      alert('Product is now visible.');
    }
    // Refresh the listings to reflect the changes.
    await fetchSellerListings();
  } catch (error) {
    console.error('Error toggling product visibility:', error);
    alert('Error toggling product visibility. Please try again.');
  }
});
