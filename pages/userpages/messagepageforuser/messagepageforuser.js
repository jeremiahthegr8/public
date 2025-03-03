// Simulated conversation data (with time and date, plus seller details)
let conversations = {
  seller1: {
    sellerName: 'Seller ABC',
    sellerAvatar: '../../assets/images/new/defaultpfp.png',
    sellerEmail: 'abc@seller.com',
    sellerContact: '123-456-7890',
    sellerSocial: 'https://facebook.com/sellerabc',
    sellerRating: 4.5,
    messages: [
      {
        sender: 'Seller',
        text: 'Thanks for your order!',
        time: '10:30 AM',
        date: 'Yesterday',
      },
      {
        sender: 'You',
        text: "You're welcome. When will it ship?",
        time: '10:34 AM',
        date: 'Yesterday',
      },
      {
        sender: 'Seller',
        text: 'It ships tomorrow.',
        time: '11:00 AM',
        date: 'Yesterday',
      },
    ],
  },
  seller2: {
    sellerName: 'Seller XYZ',
    sellerAvatar: '../../assets/images/new/defaultpfp.png',
    sellerEmail: 'xyz@seller.com',
    sellerContact: '987-654-3210',
    sellerSocial: 'https://twitter.com/sellerxyz',
    sellerRating: 4.0,
    messages: [
      {
        sender: 'Seller',
        text: 'Your item has shipped.',
        time: 'Yesterday',
        date: 'Yesterday',
      },
      {
        sender: 'You',
        text: 'Great, thanks!',
        time: '4:00 PM',
        date: 'Today',
      },
    ],
  },
};

const chatItems = document.querySelectorAll('.chat-item');
const chatHeader = document.getElementById('chatHeader');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
let currentChatId = null;
let replyingTo = null;
let lastMessageDate = null;
const replyContext = document.getElementById('replyContext');
const replyText = document.getElementById('replyText');
const cancelReply = document.getElementById('cancelReply');

// Function to append a date divider if needed
function appendDateDivider(date) {
  const dateDiv = document.createElement('div');
  dateDiv.className = 'date-divider';
  dateDiv.textContent = date;
  chatMessages.appendChild(dateDiv);
}

// Function to create and append message element with header (sender and time)
function appendMessage(sender, text, replyRef, time, date, scroll = true) {
  if (lastMessageDate !== date) {
    appendDateDivider(date);
    lastMessageDate = date;
  }
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender === 'You' ? 'you' : 'seller');
  // Message header with sender and time
  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';
  headerDiv.innerHTML = `<span class="sender-label">${sender}:</span> <span class="message-time">${time}</span>`;
  msgDiv.appendChild(headerDiv);
  // Message body
  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'message-body';
  bodyDiv.textContent = text;
  msgDiv.appendChild(bodyDiv);
  // Reply button (appears on hover)
  const replyBtn = document.createElement('span');
  replyBtn.classList.add('reply-btn');
  replyBtn.innerHTML = '<i class="fas fa-reply"></i>';
  replyBtn.title = 'Reply';
  replyBtn.addEventListener('click', () => {
    replyingTo = text;
    replyContext.style.display = 'flex';
    replyText.textContent = text;
  });
  msgDiv.appendChild(replyBtn);
  chatMessages.appendChild(msgDiv);
  if (scroll) chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Load conversation when chat item is clicked
chatItems.forEach((item) => {
  item.addEventListener('click', () => {
    chatItems.forEach((i) => i.classList.remove('active'));
    item.classList.add('active');
    const chatId = item.getAttribute('data-id');
    currentChatId = chatId;
    const conv = conversations[chatId];
    // Update chat header with seller details
    chatHeader.querySelector('.chat-avatar').src = conv.sellerAvatar;
    document.getElementById('chatSellerName').textContent = conv.sellerName;
    // Reset messages and lastMessageDate
    chatMessages.innerHTML = '';
    lastMessageDate = null;
    conv.messages.forEach((msg) => {
      appendMessage(
        msg.sender,
        msg.text,
        msg.reply || null,
        msg.time,
        msg.date,
        false
      );
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
    // For mobile: slide conversation to full screen
    if (window.innerWidth < 768) {
      document.getElementById('chatContainer').classList.add('mobile-active');
    }
  });
});

// Back button for mobile: show chat list again
document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('chatContainer').classList.remove('mobile-active');
});

// Close chat for PC: clear conversation panel
document.getElementById('closeChat').addEventListener('click', () => {
  currentChatId = null;
  chatMessages.innerHTML = "<p class='no-chat'>No conversation selected.</p>";
  document.getElementById('chatSellerName').textContent = 'Select a chat';
  chatItems.forEach((i) => i.classList.remove('active'));
});

// Send text message
const sendButton = document.getElementById('sendMessage');
sendButton.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (text !== '' && currentChatId) {
    // Use placeholder time/date for new messages
    appendMessage('You', text, replyingTo, 'Now', 'Today', true);
    conversations[currentChatId].messages.push({
      sender: 'You',
      text: text,
      reply: replyingTo,
      time: 'Now',
      date: 'Today',
    });
    messageInput.value = '';
    replyingTo = null;
    replyContext.style.display = 'none';
  }
});
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendButton.click();
});

// Image upload functionality
const uploadImgBtn = document.getElementById('uploadImgBtn');
const imgUpload = document.getElementById('imgUpload');
uploadImgBtn.addEventListener('click', () => {
  imgUpload.click();
});
imgUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && currentChatId) {
    const reader = new FileReader();
    reader.onload = function (ev) {
      const imgHTML = `<img src="${ev.target.result}" style="max-width:100%; border-radius: var(--radius-sm);" />`;
      appendMessage('You', '[Image]', replyingTo, 'Now', 'Today', true);
      const lastMsg = chatMessages.lastElementChild;
      lastMsg.innerHTML =
        (replyingTo
          ? `<div class="reply-ref">Replying to: ${replyingTo}</div>`
          : '') +
        imgHTML +
        `<span class="reply-btn" title="Reply"><i class="fas fa-reply"></i></span>`;
      conversations[currentChatId].messages.push({
        sender: 'You',
        text: '[Image]',
        reply: replyingTo,
        time: 'Now',
        date: 'Today',
      });
      messageInput.value = '';
      replyingTo = null;
      replyContext.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
  imgUpload.value = '';
});

// Seller details modal functionality with slide-in animation
const sellerModal = document.getElementById('sellerModal');
const closeSellerModal = document.getElementById('closeSellerModal');
document.getElementById('chatSellerName').addEventListener('click', () => {
  if (currentChatId) {
    const conv = conversations[currentChatId];
    document.getElementById('sellerModalPfp').src = conv.sellerAvatar;
    document.getElementById('sellerModalName').textContent = conv.sellerName;
    document.getElementById('sellerModalEmail').textContent = conv.sellerEmail;
    document.getElementById('sellerModalContact').textContent =
      conv.sellerContact;
    document.getElementById('sellerModalSocial').href = conv.sellerSocial;
    document.getElementById('sellerModalRating').textContent =
      conv.sellerRating;
    sellerModal.style.display = 'flex';
  }
});
closeSellerModal.addEventListener('click', () => {
  sellerModal.style.display = 'none';
});
