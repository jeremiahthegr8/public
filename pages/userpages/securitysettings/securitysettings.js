
// Tab switching functionality
const tabs = document.querySelectorAll('.settings-tabs .tab');
const tabContents = document.querySelectorAll('.tab-content');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((tc) => tc.classList.remove('active'));
    tab.classList.add('active');
    document
      .getElementById(tab.getAttribute('data-tab'))
      .classList.add('active');
  });
});
