// filters.js

// Get active filters from the sidebar and the search input.
export function getActiveFilters() {
  // Get categories (assumes inputs with name="category" and value like "electronics")
  const categories = Array.from(
    document.querySelectorAll('input[name="category"]:checked')
  ).map((el) => el.value);

  // Get price range (assumes an input with id="priceRange")
  const priceRangeElement = document.getElementById('priceRange');
  const maxPrice = priceRangeElement
    ? parseFloat(priceRangeElement.value)
    : 1000;

  // Get rating filters (assumes inputs with name="rating", values like "4stars")
  const ratings = Array.from(
    document.querySelectorAll('input[name="rating"]:checked')
  ).map((el) => parseInt(el.value));

  // Get brand filters (assumes inputs with name="brand")
  const brands = Array.from(
    document.querySelectorAll('input[name="brand"]:checked')
  ).map((el) => el.value);

  // Get availability filters (assumes inputs with name="availability" and values "inStock" or "outOfStock")
  const availabilities = Array.from(
    document.querySelectorAll('input[name="availability"]:checked')
  ).map((el) => el.value);

  return { categories, maxPrice, ratings, brands, availabilities };
}

// Filter the full listings array based on the provided filters and search term.
export function filterListings(listings, filters, searchTerm) {
  return listings.filter((listing) => {
    // Search filtering: Check if the listing name or description contains the search term.
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      if (
        !listing.name.toLowerCase().includes(lowerSearch) &&
        !listing.description.toLowerCase().includes(lowerSearch)
      ) {
        return false;
      }
    }

    // Category filter: If one or more categories are active, listing.category must match one.
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(listing.category)
    ) {
      return false;
    }

    // Price filter: listing.price (converted to a number) must be less than or equal to maxPrice.
    if (listing.price && parseFloat(listing.price) > filters.maxPrice) {
      return false;
    }

    // Rating filter: if any rating filter is active, listing.rating must be greater than or equal to the minimum.
    if (filters.ratings.length > 0) {
      const minRating = Math.min(...filters.ratings);
      if (listing.rating < minRating) {
        return false;
      }
    }

    // Brand filter: if active, listing.brand must match one of the selected brands.
    if (
      filters.brands.length > 0 &&
      listing.brand &&
      !filters.brands.includes(listing.brand)
    ) {
      return false;
    }

    // Availability filter: For "inStock", listing.quantity must be > 0; for "outOfStock", listing.quantity <= 0.
    if (filters.availabilities.length > 0) {
      // If "inStock" is checked, skip items that are out of stock.
      if (
        filters.availabilities.includes('inStock') &&
        parseInt(listing.quantity) <= 0
      ) {
        return false;
      }
      // If "outOfStock" is checked, skip items that are in stock.
      if (
        filters.availabilities.includes('outOfStock') &&
        parseInt(listing.quantity) > 0
      ) {
        return false;
      }
    }

    return true;
  });
}
