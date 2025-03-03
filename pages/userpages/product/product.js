// Update main image when a thumbnail is hovered or clicked
const thumbnails = document.querySelectorAll('.thumbnail');
const mainImage = document.querySelector('.main-image');

thumbnails.forEach((thumbnail) => {
  thumbnail.addEventListener('mouseenter', () => {
    const newSrc = thumbnail.getAttribute('data-large');
    if (newSrc) mainImage.src = newSrc;
  });
  thumbnail.addEventListener('click', () => {
    const newSrc = thumbnail.getAttribute('data-large');
    if (newSrc) mainImage.src = newSrc;
    thumbnails.forEach((t) => t.classList.remove('active'));
    thumbnail.classList.add('active');
  });
});
