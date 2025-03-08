import { auth, db } from '../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  limit,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// DOM Elements
const chatListEl = document.getElementById('chat-list');
const chatInterfaceSection = document.getElementById('chat-interface-section');
const chatMessagesEl = document.getElementById('chat-messages');
const messageInputEl = document.getElementById('message-input');
const sendButtonEl = document.getElementById('send-button');
const partnerNameEl = document.getElementById('partner-name');
const partnerPhotoEl = document.getElementById('partner-photo');
const backButtonEl = document.getElementById('back-button');
const productReferenceContainer = document.getElementById('product-reference');

// Global Variables
let currentChatId = null;
let productReferenceData = null;
let localProductReferenceSent = false;

// Fetch chat details for the normal user
async function fetchChatDetails(chatDoc, currentUserUid) {
  const chatData = chatDoc.data();
  const chatId = chatDoc.id;

  const sellerId = chatData.sellerId;

  // Fetch seller details
  const sellerDoc = await getDoc(doc(db, 'users', sellerId));
  const businessName = sellerDoc.exists()
    ? sellerDoc.data().businessName || 'Unknown Business'
    : 'Unknown Business';
  const sellerPhoto = sellerDoc.exists()
    ? sellerDoc.data().photoURL || '../../assets/images/new/defaultpfp.png'
    : '../../assets/images/new/defaultpfp.png';

  // Fetch product details
  const productDoc = await getDoc(doc(db, 'items', chatData.productId));
  const productName = productDoc.exists()
    ? productDoc.data().itemName || 'Product'
    : 'Product';

  // Fetch the last message
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const messagesQuery = query(
    messagesRef,
    orderBy('timestamp', 'desc'),
    limit(1)
  );
  const messagesSnapshot = await getDocs(messagesQuery);
  const lastMessageData = messagesSnapshot.docs[0]?.data();
  const lastMessage = lastMessageData?.text || 'No messages yet';
  const lastMessageSender = lastMessageData?.senderId || null;

  // Format the updatedAt timestamp
  const updatedAt =
    chatData.updatedAt && chatData.updatedAt.seconds
      ? new Date(chatData.updatedAt.seconds * 1000).toLocaleString()
      : '';

  // Fetch unread message count
  const unreadQuery = query(
    messagesRef,
    where('read', '==', false),
    where('senderId', '==', sellerId)
  );
  const unreadSnapshot = await getDocs(unreadQuery);
  const unreadCount = unreadSnapshot.size;

  return {
    chatId,
    businessName,
    sellerPhoto,
    productName,
    lastMessage,
    lastMessageSender,
    updatedAt,
    unreadCount,
  };
}

// Render the chat list
function renderChatList(chats) {
  chatListEl.innerHTML = '';
  if (chats.length === 0) {
    chatListEl.innerHTML = '<p>No chats available.</p>';
    return;
  }

  const currentUserId = auth.currentUser.uid;
  chats.forEach((chat) => {
    const chatCard = document.createElement('div');
    chatCard.classList.add('chat-card');

    let prefix =
      chat.lastMessageSender === currentUserId ? 'You: ' : 'Seller: ';

    chatCard.innerHTML = `
      <img src="${chat.sellerPhoto}" alt="${chat.businessName}">
      <div class="chat-info">
        <h3>${chat.businessName}</h3>
        <p>${prefix}${chat.lastMessage}</p>
        <p class="chat-timestamp">${chat.updatedAt}</p>
      </div>
      ${
        chat.unreadCount > 0
          ? `<span class="unread-count">${chat.unreadCount}</span>`
          : ''
      }
    `;

    chatCard.addEventListener('click', () => {
      currentChatId = chat.chatId;
      loadChat(chat.chatId);
      chatInterfaceSection.style.display = 'block';
    });

    chatListEl.appendChild(chatCard);
  });
}

// Load chat details and messages
async function loadChat(chatId) {
  const chatDoc = await getDoc(doc(db, 'chats', chatId));
  if (!chatDoc.exists()) return;

  const chatData = chatDoc.data();
  const sellerId = chatData.sellerId;

  // Fetch seller details
  const sellerDoc = await getDoc(doc(db, 'users', sellerId));
  if (sellerDoc.exists()) {
    const sellerData = sellerDoc.data();
    partnerNameEl.textContent = sellerData.businessName || 'Seller';
    partnerPhotoEl.src =
      sellerData.photoURL || '../../assets/images/new/defaultpfp.png';
  }

  // Fetch and render messages
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
  onSnapshot(messagesQuery, (snapshot) => {
    chatMessagesEl.innerHTML = '';
    snapshot.forEach((doc) => {
      const message = doc.data();
      const messageEl = document.createElement('div');
      messageEl.classList.add(
        'message',
        message.senderId === auth.currentUser.uid ? 'sent' : 'received'
      );
      messageEl.textContent = message.text;
      chatMessagesEl.appendChild(messageEl);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  });
}

// Send message handler
sendButtonEl.addEventListener('click', async () => {
  const text = messageInputEl.value.trim();
  if (!text || !currentChatId) return;

  const messagesRef = collection(db, 'chats', currentChatId, 'messages');
  await addDoc(messagesRef, {
    text,
    senderId: auth.currentUser.uid,
    timestamp: serverTimestamp(),
    read: false,
  });

  messageInputEl.value = '';
});

// Back button functionality
backButtonEl.addEventListener('click', () => {
  chatInterfaceSection.style.display = 'none';
  currentChatId = null;
});

// Logout Handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth)
      .then(() => (window.location.href = '../../index.html'))
      .catch((error) => console.error('Error signing out:', error));
  });
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) {
      userNameEl.textContent = user.displayName || 'User';
    }

    // Query chats for the current user
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(
      chatsRef,
      where('buyerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    onSnapshot(chatsQuery, async (snapshot) => {
      const chatDetailsPromises = snapshot.docs.map((doc) =>
        fetchChatDetails(doc, user.uid)
      );
      const chatDetails = await Promise.all(chatDetailsPromises);
      renderChatList(chatDetails);
    });
  } else {
    window.location.href = '../../index.html';
  }
});
