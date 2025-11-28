// ==============================
// DOM取得
// ==============================

// タイムライン＆ツイート
const tweetInput = document.getElementById("tweetInput");
const postTweetBtn = document.getElementById("postTweetBtn");
const charCounter = document.getElementById("charCounter");
const imageInput = document.getElementById("imageInput");
const imageSelectBtn = document.getElementById("imageSelectBtn");
const imagePreview = document.getElementById("imagePreview");

const tweetsContainer = document.getElementById("tweetsContainer");
const profileTweetsContainer = document.getElementById("profileTweetsContainer");

// モーダル用
const tweetModal = document.getElementById("tweetModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const tweetInputModal = document.getElementById("tweetInputModal");
const postTweetBtnModal = document.getElementById("postTweetBtnModal");
const charCounterModal = document.getElementById("charCounterModal");
const imageInputModal = document.getElementById("imageInputModal");
const imageSelectBtnModal = document.getElementById("imageSelectBtnModal");
const imagePreviewModal = document.getElementById("imagePreviewModal");

// ページ切り替え用
const navItems = document.querySelectorAll(".nav-item");
const homePage = document.getElementById("homePage");
const profilePage = document.getElementById("profilePage");
const messagesPage = document.getElementById("messagesPage");

// テーマ
const themeToggle = document.getElementById("themeToggle");

// DM用
const dmListEl = document.getElementById("dmList");
const dmChatHeader = document.getElementById("dmChatHeader");
const dmChatBody = document.getElementById("dmChatBody");
const dmInput = document.getElementById("dmInput");
const dmSendBtn = document.getElementById("dmSendBtn");

// ==============================
// 定数・状態
// ==============================

const MAX_LENGTH = 140;
const TWEETS_KEY = "miniTwitterTweets";
const THEME_KEY = "miniTwitterTheme";

// ツイート配列
let tweets = []; // {id, name, handle, text, createdAt, imageSrc, liked, likeCount, replyCount, rtCount}

// DMスレッド（最初から2つダミーで用意）
let dmThreads = [
  {
    id: "1",
    name: "クラスのグルチャ",
    handle: "@class_2_4",
    avatar: "👥",
    messages: [
      {
        from: "other",
        text: "明日のプリント配布よろしく〜！",
        at: new Date()
      },
      {
        from: "me",
        text: "了解、ホームルーム前に配っとく👍",
        at: new Date()
      }
    ]
  },
  {
    id: "2",
    name: "みく",
    handle: "@miku",
    avatar: "🎧",
    messages: [
      {
        from: "other",
        text: "新曲できたからあとで聞いてほしい！",
        at: new Date()
      }
    ]
  }
];

let activeThreadId = dmThreads[0]?.id || null;

// ==============================
// テーマ関連
// ==============================

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (!saved) return;
  document.body.setAttribute("data-theme", saved);
  themeToggle.textContent = saved === "light" ? "☀️" : "🌙";
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  themeToggle.textContent = next === "light" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, next);
}

themeToggle.addEventListener("click", toggleTheme);

// ==============================
// ツイート保存 / 読み込み
// ==============================

function saveTweets() {
  localStorage.setItem(TWEETS_KEY, JSON.stringify(tweets));
}

function loadTweets() {
  const raw = localStorage.getItem(TWEETS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    tweets = parsed.map((t) => ({
      ...t,
      createdAt: new Date(t.createdAt)
    }));
  } catch (e) {
    console.error("failed to parse tweets", e);
  }
}

// ==============================
// 共通：ツイート入力欄のセットアップ
// ==============================

function setupComposer({
  textarea,
  postButton,
  counter,
  fileInput,
  fileButton,
  preview,
  afterPost
}) {
  // 文字数カウント
  textarea.addEventListener("input", () => {
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_LENGTH}`;
    postButton.disabled = len === 0 || len > MAX_LENGTH;
  });

  // 画像選択
  fileButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) {
      preview.style.display = "none";
      preview.innerHTML = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.style.display = "block";
      preview.innerHTML = `<img src="${e.target.result}" alt="preview" />`;
    };
    reader.readAsDataURL(file);
  });

  // ツイート投稿
  postButton.addEventListener("click", () => {
    const text = textarea.value.trim();
    if (!text || text.length > MAX_LENGTH) return;

    const file = fileInput.files[0];

    // 画像あり・なし両対応
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target.result;
        createTweet(text, imageSrc);
        finishPost();
      };
      reader.readAsDataURL(file);
    } else {
      createTweet(text, null);
      finishPost();
    }

    function finishPost() {
      textarea.value = "";
      counter.textContent = `0 / ${MAX_LENGTH}`;
      postButton.disabled = true;
      fileInput.value = "";
      preview.style.display = "none";
      preview.innerHTML = "";

      if (afterPost) afterPost();
    }
  });

  // 初期状態
  postButton.disabled = true;
  counter.textContent = `0 / ${MAX_LENGTH}`;
}

// ==============================
// ツイート生成＆描画
// ==============================

function createTweet(text, imageSrc) {
  const tweet = {
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    name: "たい",
    handle: "@tai_clone",
    text,
    imageSrc,
    createdAt: new Date(),
    liked: false,
    likeCount: 0,
    replyCount: 0,
    rtCount: 0
  };

  tweets.unshift(tweet);
  saveTweets();
  renderAllTweetLists();
}

// 時刻表示（TL / DM両方で使う）
function formatTime(date) {
  const now = new Date();
  const diffSec = (now - date) / 1000;

  if (diffSec < 60) return "今";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

// 指定コンテナにツイート一覧を描画
function renderTweetsTo(container) {
  container.innerHTML = "";

  tweets.forEach((t) => {
    const el = document.createElement("article");
    el.className = "tweet";
    el.dataset.id = t.id;

    const likeClass = t.liked
      ? "like-btn liked tweet-action-btn"
      : "like-btn tweet-action-btn";

    el.innerHTML = `
      <div class="avatar">🧑‍💻</div>
      <div class="tweet-main">
        <div class="tweet-header">
          <span class="tweet-name">${t.name}</span>
          <span class="tweet-handle">${t.handle}</span>
          <span class="tweet-time">・${formatTime(t.createdAt)}</span>
        </div>
        <div class="tweet-text"></div>
        ${
          t.imageSrc
            ? `<div class="tweet-image"><img src="${t.imageSrc}" alt="image" /></div>`
            : ""
        }
        <div class="tweet-footer">
          <button class="tweet-action-btn reply-btn">
            💬 <span class="count">${t.replyCount}</span>
          </button>
          <button class="tweet-action-btn rt-btn">
            🔁 <span class="count">${t.rtCount}</span>
          </button>
          <button class="${likeClass}">
            ❤️ <span class="count">${t.likeCount}</span>
          </button>
        </div>
      </div>
    `;

    el.querySelector(".tweet-text").textContent = t.text;
    container.appendChild(el);
  });
}

function renderAllTweetLists() {
  renderTweetsTo(tweetsContainer);
  renderTweetsTo(profileTweetsContainer);
}

// ツイートのボタン（いいね・RT・返信）クリック処理
function handleTweetActionClick(e) {
  const likeBtn = e.target.closest(".like-btn");
  const rtBtn = e.target.closest(".rt-btn");
  const replyBtn = e.target.closest(".reply-btn");
  if (!likeBtn && !rtBtn && !replyBtn) return;

  const tweetEl = e.target.closest(".tweet");
  if (!tweetEl) return;
  const id = tweetEl.dataset.id;
  const t = tweets.find((tw) => tw.id === id);
  if (!t) return;

  if (likeBtn) {
    t.liked = !t.liked;
    t.likeCount += t.liked ? 1 : -1;
  } else if (rtBtn) {
    t.rtCount += 1;
  } else if (replyBtn) {
    t.replyCount += 1;
  }

  saveTweets();
  renderAllTweetLists();
}

tweetsContainer.addEventListener("click", handleTweetActionClick);
profileTweetsContainer.addEventListener("click", handleTweetActionClick);

// ==============================
// ページ切り替え
// ==============================

function showPage(page) {
  // いったん全部隠す
  homePage.classList.add("hidden");
  profilePage.classList.add("hidden");
  messagesPage.classList.add("hidden");

  if (page === "profile") {
    profilePage.classList.remove("hidden");
  } else if (page === "messages") {
    messagesPage.classList.remove("hidden");
  } else {
    homePage.classList.remove("hidden");
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const page = item.dataset.page;

    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    showPage(page);
  });
});

// ==============================
// DM描画
// ==============================

function getLastMessage(thread) {
  if (!thread.messages.length) return "";
  return thread.messages[thread.messages.length - 1].text;
}

function renderDmList() {
  dmListEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "dm-list-header";
  header.textContent = "メッセージ";
  dmListEl.appendChild(header);

  const itemsWrapper = document.createElement("div");
  itemsWrapper.className = "dm-items";

  dmThreads.forEach((t) => {
    const item = document.createElement("div");
    item.className =
      "dm-item" + (t.id === activeThreadId ? " active" : "");
    item.dataset.id = t.id;
    item.innerHTML = `
      <div class="dm-item-avatar">${t.avatar}</div>
      <div class="dm-item-main">
        <div class="dm-item-name">${t.name}</div>
        <div class="dm-item-handle">${t.handle}</div>
        <div class="dm-item-last">${getLastMessage(t)}</div>
      </div>
    `;
    itemsWrapper.appendChild(item);
  });

  dmListEl.appendChild(itemsWrapper);
}

function renderDmChat() {
  const thread = dmThreads.find((t) => t.id === activeThreadId);
  dmChatBody.innerHTML = "";

  if (!thread) {
    dmChatHeader.textContent = "メッセージする相手を選んでね";
    dmSendBtn.disabled = true;
    return;
  }

  dmChatHeader.textContent = `${thread.name} ${thread.handle}`;
  dmSendBtn.disabled = dmInput.value.trim().length === 0;

  thread.messages.forEach((m) => {
    const row = document.createElement("div");
    row.className =
      "dm-message-row " + (m.from === "me" ? "me" : "other");

    const bubble = document.createElement("div");
    bubble.className =
      "dm-message " + (m.from === "me" ? "me" : "other");
    bubble.textContent = m.text;

    const time = document.createElement("div");
    time.className = "dm-message-time";
    time.textContent = formatTime(m.at);

    const wrapper = document.createElement("div");
    wrapper.appendChild(bubble);
    wrapper.appendChild(time);

    row.appendChild(wrapper);
    dmChatBody.appendChild(row);
  });

  // 一番下までスクロール
  dmChatBody.scrollTop = dmChatBody.scrollHeight;
}

function renderDmAll() {
  renderDmList();
  renderDmChat();
}

// DMリストクリックでスレッド切り替え
dmListEl.addEventListener("click", (e) => {
  const item = e.target.closest(".dm-item");
  if (!item) return;
  const id = item.dataset.id;
  activeThreadId = id;
  renderDmAll();
});

// 入力で送信ボタンON/OFF
dmInput.addEventListener("input", () => {
  const len = dmInput.value.trim().length;
  const thread = dmThreads.find((t) => t.id === activeThreadId);
  dmSendBtn.disabled = !thread || len === 0;
});

// DM送信
function sendDmMessage() {
  const text = dmInput.value.trim();
  if (!text) return;

  const thread = dmThreads.find((t) => t.id === activeThreadId);
  if (!thread) return;

  thread.messages.push({
    from: "me",
    text,
    at: new Date()
  });

  dmInput.value = "";
  dmSendBtn.disabled = true;

  renderDmAll();
}

// ボタンクリックで送信
dmSendBtn.addEventListener("click", sendDmMessage);

// Enterキーで送信（Shift+Enterで改行）
dmInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendDmMessage();
  }
});

// ==============================
// モーダル制御
// ==============================

function openModal() {
  tweetModal.classList.remove("hidden");
  tweetInputModal.focus();
}

function closeModal() {
  tweetModal.classList.add("hidden");
}

openModalBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

// 背景クリックで閉じる
tweetModal.addEventListener("click", (e) => {
  if (
    e.target === tweetModal ||
    e.target.classList.contains("modal-backdrop")
  ) {
    closeModal();
  }
});

// ==============================
// 初期化
// ==============================

// ツイート入力欄（メイン）
setupComposer({
  textarea: tweetInput,
  postButton: postTweetBtn,
  counter: charCounter,
  fileInput: imageInput,
  fileButton: imageSelectBtn,
  preview: imagePreview
});

// ツイート入力欄（モーダル）
setupComposer({
  textarea: tweetInputModal,
  postButton: postTweetBtnModal,
  counter: charCounterModal,
  fileInput: imageInputModal,
  fileButton: imageSelectBtnModal,
  preview: imagePreviewModal,
  afterPost: closeModal
});

// 保存済みツイート＆テーマ読み込み
loadTweets();
loadTheme();

// 描画
renderAllTweetLists();
renderDmAll();
