    import { auth, db } from '../../../database/config.js';
    import {
      collection,
      query,
      orderBy,
      addDoc,
      serverTimestamp,
      onSnapshot,
      doc,
      getDoc,
      setDoc,
      getDocs,
      limit,
      where,
      writeBatch
    } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
    import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

    // --- URL Parameter Processing ---
    const urlParams = new URLSearchParams(window.location.search);
    const sellerIdParam = urlParams.get('sellerId');
    const listingIdParam = urlParams.get('listingId');
    console.log('[INIT] URL parameters:', { sellerIdParam, listingIdParam });

    // --- DOM Elements ---
    const chatListEl = document.getElementById('chatList');
    const chatListLoadingEl = document.getElementById('chatListLoading');
    const chatHeaderEl = document.getElementById('chatHeader');
    const chatMessagesEl = document.getElementById('chatMessages');
    const noChatSelectedEl = document.getElementById('noChatSelected');
    const messageInputEl = document.getElementById('messageInput');
    const sendButtonEl = document.getElementById('sendMessage');
    const uploadImgBtn = document.getElementById('uploadImgBtn');
    const imgUploadEl = document.getElementById('imgUpload');
    const searchInputEl = document.getElementById('searchInput');

    const sellerAvatarEl = document.getElementById('sellerAvatar');
    const sellerNameEl = document.getElementById('sellerName');
    const sellerStatusEl = document.getElementById('sellerStatus');

    // --- Global Chat State & Product Reference ---
    let currentChatId = null;
    let lastMessageDate = null;
    let currentChatUnsubscribe = null;
    let productReferenceData = null;
    let localProductReferenceSent = false;

    // ------------------- Utility Functions -------------------

    function clearMessages() {
      console.log('[LOG] Clearing messages');
      chatMessagesEl.innerHTML = '';
      lastMessageDate = null;
    }

    function appendDateDivider(date) {
      const divider = document.createElement('div');
      divider.className = 'date-divider';
      divider.style.textAlign = 'center';
      divider.style.margin = '10px 0';
      divider.style.fontSize = '12px';
      divider.style.color = '#888';
      divider.textContent = date;
      console.log('[LOG] Adding date divider:', date);
      chatMessagesEl.appendChild(divider);
    }

    // Append a message without reply referencing.
    function appendMessage(sender, text, productReference, time, date, scroll = true) {
      console.log('[LOG] Appending message:', { sender, text, time, date });
      if (lastMessageDate !== date) {
        appendDateDivider(date);
        lastMessageDate = date;
      }
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('message', sender === 'You' ? 'sent' : 'received');

      const headerDiv = document.createElement('div');
      headerDiv.style.fontSize = '12px';
      headerDiv.style.marginBottom = '4px';
      headerDiv.innerHTML = `<strong>${sender}:</strong> <span>${time}</span>`;
      msgDiv.appendChild(headerDiv);

      if (productReference) {
        const prodRefDiv = document.createElement('div');
        prodRefDiv.className = 'product-reference';
        prodRefDiv.innerHTML = `<img src="${productReference.productImage}" alt="${productReference.productName}" style="width:40px;height:40px;object-fit:cover;" /> <span>${productReference.productName}</span>`;
        msgDiv.appendChild(prodRefDiv);
      }

      const bodyDiv = document.createElement('div');
      bodyDiv.textContent = text;
      msgDiv.appendChild(bodyDiv);

      chatMessagesEl.appendChild(msgDiv);
      if (scroll) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    // ------------------- Chat Conversation Functions -------------------

    // This function creates a new chat document (if not already present) and assigns currentChatId.
    async function createNewChat() {
      const currentUserUid = auth.currentUser.uid;
      // Use sellerIdParam from URL to form chatId.
      const chatId = `${currentUserUid}_${sellerIdParam}`;
      currentChatId = chatId;
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        console.log('[CREATE] Chat document does not exist. Creating new chat.');
        await setDoc(chatDocRef, { dummyField: currentUserUid });
      } else {
        console.log('[CREATE] Chat document already exists.');
      }
      return chatId;
    }

    async function loadConversation(sellerId) {
      console.log('[LOAD] loadConversation called with sellerId:', sellerId);
      const currentUserUid = auth.currentUser.uid;
      const chatId = `${currentUserUid}_${sellerId}`;
      currentChatId = chatId;
      console.log('[LOAD] Constructed chatId:', chatId);
      
      // Show the chat header and input area; hide the "Select a conversation" prompt.
      chatHeaderEl.style.display = 'flex';
      document.getElementById('chatInputArea').style.display = 'flex';
      noChatSelectedEl.style.display = 'none';

      // Ensure the chat document exists.
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      if (!chatDocSnap.exists()) {
        console.log('[LOAD] Chat document does not exist. Creating it.');
        await setDoc(chatDocRef, { dummyField: currentUserUid });
      } else {
        console.log('[LOAD] Chat document already exists.');
      }

      // Fetch seller info.
      try {
        const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
        if (!sellerDoc.exists()) {
          console.log('[ERROR] Seller not found for sellerId:', sellerId);
        }
        const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
        console.log('[LOAD] Seller data:', sellerData);
        sellerAvatarEl.innerHTML = `<img src="${sellerData.profilePicUrl || '../../../assets/images/new/defaultpfp.png'}" alt="Seller Avatar" />`;
        sellerNameEl.textContent = sellerData.businessName || 'Seller';
        sellerStatusEl.innerHTML = `<span class="status-indicator online"></span> Online`;
      } catch (err) {
        console.error('[ERROR] Error fetching seller info:', err);
      }

      try {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        if (currentChatUnsubscribe) {
          console.log('[LOAD] Unsubscribing from previous listener');
          currentChatUnsubscribe();
        }
        currentChatUnsubscribe = onSnapshot(
          query(messagesRef, orderBy('timestamp', 'asc')),
          async (snapshot) => {
            console.log('[SNAPSHOT] Messages updated. Count:', snapshot.size);
            clearMessages();

            // Count and mark unread messages (only those not sent by the current user).
            let unreadCountInThisChat = 0;
            snapshot.forEach((docSnap) => {
              const msg = docSnap.data();
              if (!msg.read && msg.senderId !== currentUserUid) {
                unreadCountInThisChat++;
              }
            });
            if (unreadCountInThisChat > 0) {
              const batch = writeBatch(db);
              snapshot.forEach((docSnap) => {
                const msg = docSnap.data();
                if (!msg.read && msg.senderId !== currentUserUid) {
                  batch.update(docSnap.ref, { read: true });
                }
              });
              await batch.commit();
              console.log(`[LOAD] Marked ${unreadCountInThisChat} messages as read in chat ${chatId}`);
            }

            snapshot.forEach((docSnap) => {
              const msg = docSnap.data();
              const time = msg.timestamp
                ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Now';
              const date = msg.timestamp
                ? new Date(msg.timestamp.seconds * 1000).toLocaleDateString()
                : 'Today';
              appendMessage(
                msg.senderId === currentUserUid ? 'You' : 'Seller',
                msg.text,
                msg.productReference || null,
                time,
                date,
                false
              );
            });
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
          },
          (error) => {
            console.error('[SNAPSHOT ERROR] Error in message snapshot:', error);
          }
        );
      } catch (err) {
        console.error('[ERROR] Error setting up messages listener:', err);
      }
    }

    async function renderChatList() {
      console.log('[RENDER] renderChatList called');
      const currentUserUid = auth.currentUser.uid;
      // Show loading state initially.
      chatListEl.innerHTML = '';
      chatListEl.innerHTML = `<p class="loading" id="chatListLoading">Loading chats...</p>`;

      // If sellerId is given through URL, load that conversation directly.
      if (sellerIdParam) {
        console.log('[RENDER] sellerIdParam exists:', sellerIdParam);
        try {
          const sellerDoc = await getDoc(doc(db, 'sellers', sellerIdParam));
          const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
          chatListEl.innerHTML = '';
          const convItem = document.createElement('div');
          convItem.className = 'conversation-item active';
          convItem.setAttribute('data-id', sellerIdParam);
          convItem.innerHTML = `
            <div class="conversation-header">
              <span class="seller-name">${sellerData.businessName || 'Seller'}</span>
              <span class="time">Now</span>
            </div>
            <div class="last-message">
              Tap to view conversation
            </div>
          `;
          convItem.addEventListener('click', () => {
            console.log('[RENDER] Conversation item clicked for sellerId:', sellerIdParam);
            loadConversation(sellerIdParam);
          });
          chatListEl.appendChild(convItem);
        } catch (err) {
          console.error('[RENDER ERROR] Error fetching seller for URL param:', err);
        }
      } else {
        console.log('[RENDER] No sellerIdParam provided. Querying all chats for user:', currentUserUid);
        try {
          const chatsRef = collection(db, 'chats');
          const querySnapshot = await getDocs(chatsRef);
          let userChats = [];
          querySnapshot.forEach((docSnap) => {
            if (docSnap.id.startsWith(currentUserUid + '_')) {
              userChats.push({ chatId: docSnap.id, ...docSnap.data() });
            }
          });
          console.log('[RENDER] User chats found:', userChats);
          chatListEl.innerHTML = '';
          if (userChats.length === 0) {
            console.log('[RENDER] No chats found for user.');
            chatListEl.innerHTML = `<p class="empty-state">You have no chats.</p>`;
            noChatSelectedEl.innerHTML = `<p class="empty-state">You have no chats.</p>`;
          } else {
            userChats.forEach(async (chat) => {
              const parts = chat.chatId.split('_');
              const sellerId = parts[1];
              console.log('[RENDER] Rendering chat for sellerId:', sellerId);
              try {
                const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
                const sellerData = sellerDoc.exists() ? sellerDoc.data() : {};
                const messagesRef = collection(db, 'chats', chat.chatId, 'messages');
                const lastMsgQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
                const lastMsgSnapshot = await getDocs(lastMsgQuery);
                let lastMessageText = "";
                lastMsgSnapshot.forEach((doc) => {
                  lastMessageText = doc.data().text;
                });
                const unreadQuery = query(messagesRef, where('read', '==', false), where('senderId', '!=', currentUserUid));
                const unreadSnapshot = await getDocs(unreadQuery);
                let unreadCount = unreadSnapshot.size;
                const convItem = document.createElement('div');
                convItem.className = 'conversation-item';
                convItem.setAttribute('data-id', sellerId);
                convItem.innerHTML = `
                  <div class="conversation-header">
                    <span class="seller-name">${sellerData.businessName || 'Seller'}</span>
                    <span class="time">${
                      lastMessageText
                        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })
                        : 'Now'
                    }</span>
                  </div>
                  <div class="last-message">
                    ${lastMessageText || 'No messages yet.'} ${
                      unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ""
                    }
                  </div>
                `;
                convItem.addEventListener('click', () => {
                  console.log('[RENDER] Conversation item clicked for sellerId:', sellerId);
                  document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
                  convItem.classList.add('active');
                  loadConversation(sellerId);
                });
                chatListEl.appendChild(convItem);
              } catch (err) {
                console.error('[RENDER ERROR] Error fetching seller for chat:', err);
              }
            });
          }
        } catch (err) {
          console.error('[RENDER ERROR] Error querying chats:', err);
        }
      }
    }

    // ------------------- Send Message Function -------------------

    async function sendMessage() {
      const text = messageInputEl.value.trim();
      console.log('[SEND] sendMessage called with text:', text);
      if (!text) {
        console.log('[SEND] Aborting send. No text provided.');
        return;
      }
      const currentUserUid = auth.currentUser.uid;
      // If there's no current chat, create one.
      if (!currentChatId) {
        console.log('[SEND] No currentChatId found. Creating new chat.');
        await createNewChat();
      }
      const messagesRef = collection(db, 'chats', currentChatId, 'messages');
      const messageData = {
        text,
        senderId: currentUserUid,
        timestamp: serverTimestamp(),
        read: false
      };
      if (listingIdParam && productReferenceData && !localProductReferenceSent) {
        console.log('[SEND] Attaching product reference:', productReferenceData);
        messageData.productReference = productReferenceData;
        localProductReferenceSent = true;
      }
      try {
        await addDoc(messagesRef, messageData);
        console.log('[SEND] Message sent successfully');
      } catch (error) {
        console.error('[SEND ERROR] Error sending message:', error);
      }
      messageInputEl.value = '';
    }

    sendButtonEl.addEventListener('click', sendMessage);
    messageInputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });

    // ------------------- Image Upload Functionality -------------------

    uploadImgBtn.addEventListener('click', () => {
      console.log('[UPLOAD] Upload image button clicked');
      imgUploadEl.click();
    });
    imgUploadEl.addEventListener('change', () => {
      const file = imgUploadEl.files[0];
      console.log('[UPLOAD] Image file selected:', file);
      if (file && currentChatId) {
        const reader = new FileReader();
        reader.onload = async function (ev) {
          console.log('[UPLOAD] FileReader loaded. Preparing to send image message.');
          const messagesRef = collection(db, 'chats', currentChatId, 'messages');
          try {
            await addDoc(messagesRef, {
              text: '[Image]',
              senderId: auth.currentUser.uid,
              timestamp: serverTimestamp(),
              read: false,
            });
            console.log('[UPLOAD] Image message sent successfully');
          } catch (error) {
            console.error('[UPLOAD ERROR] Error sending image message:', error);
          }
          messageInputEl.value = '';
        };
        reader.readAsDataURL(file);
      }
      imgUploadEl.value = '';
    });

    // ------------------- Search Functionality -------------------

    searchInputEl.addEventListener('input', () => {
      const queryStr = searchInputEl.value.toLowerCase();
      const items = document.querySelectorAll('.conversation-item');
      items.forEach(item => {
        if (item.innerText.toLowerCase().includes(queryStr)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });

    // ------------------- Initialization for Buyer Chat Page -------------------

    onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] onAuthStateChanged triggered. User:', user);
      if (user && user.emailVerified) {
        console.log('[AUTH] User signed in and verified:', user.uid);
        if (listingIdParam) {
          console.log('[AUTH] ListingId provided. Fetching product details for listingId:', listingIdParam);
          try {
            const productDoc = await getDoc(doc(db, 'listings', listingIdParam));
            if (productDoc.exists()) {
              const productData = productDoc.data();
              productReferenceData = {
                productName: productData.name || 'Product',
                productImage: productData.mainImageUrl || '../../../assets/images/new/defaultpfp.png',
              };
              console.log('[AUTH] Product reference data set:', productReferenceData);
            } else {
              console.log('[AUTH] No product found for listingId:', listingIdParam);
            }
          } catch (err) {
            console.error('[AUTH ERROR] Error fetching product details:', err);
          }
        }
        await renderChatList();
      } else {
        console.log('[AUTH] User not signed in or email not verified. Redirecting.');
        window.location.href = '../../index.html';
      }
    });