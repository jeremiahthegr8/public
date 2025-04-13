document.addEventListener('DOMContentLoaded', () => {
  const stickyHeader = document.querySelector('.sticky-header');
  const sentinel = document.querySelector('.header-sentinel');

  // Create an Intersection Observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          // When the sentinel is out of view, show the sticky header
          stickyHeader.classList.add('visible');
        } else {
          // When the sentinel is in view, hide the sticky header
          stickyHeader.classList.remove('visible');
        }
      });
    },
    { threshold: 0 }
  );

  // Start observing the sentinel element
  observer.observe(sentinel);
});
