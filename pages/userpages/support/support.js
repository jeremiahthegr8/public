// Support tab switching
const supportTabs = document.querySelectorAll('.support-tabs .tab');
const supportTabContents = document.querySelectorAll('.tab-content');
supportTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    supportTabs.forEach((t) => t.classList.remove('active'));
    supportTabContents.forEach((tc) => tc.classList.remove('active'));
    tab.classList.add('active');
    document
      .getElementById(tab.getAttribute('data-tab'))
      .classList.add('active');
  });
});

// FAQ accordion functionality
const faqQuestions = document.querySelectorAll('.faq-question');
faqQuestions.forEach((question) => {
  question.addEventListener('click', () => {
    const answer = question.nextElementSibling;
    const icon = question.querySelector('i');
    if (answer.style.display === 'block') {
      answer.style.display = 'none';
      icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    } else {
      answer.style.display = 'block';
      icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
  });
});

// Support form submission
document.getElementById('supportForm').addEventListener('submit', function (e) {
  e.preventDefault();
  alert(
    'Your support request has been submitted. We will contact you shortly.'
  );
  this.reset();
});

// Chat Bot functionality
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotContainer = document.getElementById('chatbotContainer');
const closeChat = document.getElementById('closeChat');
const chatbotSend = document.getElementById('chatbotSend');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotMessages = document.getElementById('chatbotMessages');

// Toggle chat window
chatbotToggle.addEventListener('click', () => {
  chatbotContainer.style.display = 'flex';
  chatbotToggle.style.display = 'none';
});
closeChat.addEventListener('click', () => {
  chatbotContainer.style.display = 'none';
  chatbotToggle.style.display = 'flex';
});

// Function to add message to chat
function addMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.style.marginBottom = '10px';
  msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatbotMessages.appendChild(msgDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Simulated bot response
function botResponse(userText) {
  // Simple response logic - can be expanded
  let response = "I'm here to help!";
  if (userText.toLowerCase().includes('hello')) {
    response = 'Hi there! How can I assist you today?';
  } else if (userText.toLowerCase().includes('order')) {
    response =
      'You can track your order from the Orders section on your dashboard.';
  }
  // Add bot message after a delay
  setTimeout(() => addMessage('Bot', response), 500);
}

// Handle sending message
chatbotSend.addEventListener('click', () => {
  const text = chatbotInput.value.trim();
  if (text !== '') {
    addMessage('You', text);
    chatbotInput.value = '';
    botResponse(text);
  }
});
chatbotInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    chatbotSend.click();
  }
});
