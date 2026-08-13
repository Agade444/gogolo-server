const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE =
  path.join(__dirname, "users.json");

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// =====================================================
// HTML GÜVENLİĞİ
// =====================================================

function escapeHTML(text) {

  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// TARİH
// =====================================================

function messageDate(message) {

  const raw =
    message.createdAt ||
    message.date;

  if (!raw) {
    return "";
  }

  const date =
    new Date(raw);

  if (
    isNaN(
      date.getTime()
    )
  ) {
    return String(raw);
  }

  return date.toLocaleString(
    "tr-TR"
  );
}


// =====================================================
// KULLANICILARI DÜZENLE
// =====================================================

function normalizeUsers(list) {

  if (!Array.isArray(list)) {
    return [];
  }

  list.forEach(user => {

    if (!Array.isArray(user.inbox)) {
      user.inbox = [];
    }

    if (!Array.isArray(user.sent)) {
      user.sent = [];
    }
// AI SOHBETLERİ
if (!Array.isArray(user.aiChats)) {
  user.aiChats = [];
}

// AI GENEL HAFIZA
if (!Array.isArray(user.aiMemory)) {
  user.aiMemory = [];
}    user.inbox.forEach(message => {

      if (!message.id) {
        message.id =
          crypto.randomUUID();
      }

      if (
        typeof message.read !==
        "boolean"
      ) {
        message.read = false;
      }

      if (
        typeof message.starred !==
        "boolean"
      ) {
        message.starred = false;
      }

    });


    user.sent.forEach(message => {

      if (!message.id) {
        message.id =
          crypto.randomUUID();
      }

      if (
        typeof message.starred !==
        "boolean"
      ) {
        message.starred = false;
      }

    });


    user.aiChats.forEach(chat => {

      if (!chat.id) {
        chat.id =
          crypto.randomUUID();
      }

      if (!chat.title) {
        chat.title =
          "Yeni Sohbet";
      }

      if (!chat.createdAt) {
        chat.createdAt =
          new Date()
            .toISOString();
      }

      if (!chat.updatedAt) {
        chat.updatedAt =
          chat.createdAt;
      }

      if (
        !Array.isArray(
          chat.messages
        )
      ) {
        chat.messages = [];
      }

    });

  });


  return list;
}


// =====================================================
// USERS.JSON OKU
// =====================================================

function loadUsers() {

  try {

    if (
      !fs.existsSync(
        USERS_FILE
      )
    ) {

      fs.writeFileSync(
        USERS_FILE,
        "[]",
        "utf8"
      );
    }


    const data =
      fs.readFileSync(
        USERS_FILE,
        "utf8"
      );


    return normalizeUsers(
      JSON.parse(data)
    );

  }

  catch(error) {

    console.error(
      "users.json okunamadı:",
      error
    );

    return [];
  }
}


// =====================================================
// VERİLER
// =====================================================

let users =
  loadUsers();

const sessions = {};


// =====================================================
// KAYDET
// =====================================================

function saveUsers() {

  fs.writeFileSync(
    USERS_FILE,

    JSON.stringify(
      users,
      null,
      2
    ),

    "utf8"
  );
}


// =====================================================
// COOKIE
// =====================================================

function getCookies(req) {

  const cookies = {};

  const cookieHeader =
    req.headers.cookie || "";


  cookieHeader
    .split(";")
    .forEach(cookie => {

      const index =
        cookie.indexOf("=");

      if (index === -1) {
        return;
      }


      const key =
        cookie
          .slice(0, index)
          .trim();


      const value =
        cookie
          .slice(index + 1)
          .trim();


      cookies[key] =
        decodeURIComponent(
          value
        );

    });


  return cookies;
}


// =====================================================
// GİRİŞ YAPMIŞ KULLANICI
// =====================================================

function getLoggedInUser(req) {

  const cookies =
    getCookies(req);


  const sessionId =
    cookies.gogolo_session;


  if (!sessionId) {
    return null;
  }


  const username =
    sessions[sessionId];


  if (!username) {
    return null;
  }


  return users.find(
    user =>
      user.username === username
  ) || null;
}


// =====================================================
// API İÇİN GİRİŞ KONTROLÜ
// =====================================================

function requireApiLogin(
  req,
  res
) {

  const user =
    getLoggedInUser(req);


  if (!user) {

    res.status(401)
      .json({
        ok: false,
        error:
          "Go Go Lo hesabına giriş yapmalısın."
      });

    return null;
  }


  return user;
}


// =====================================================
// MAIL ORTAK SAYFA
// =====================================================

function mailPage(
  user,
  title,
  content
) {

  const unreadCount =
    user.inbox.filter(
      message =>
        !message.read
    ).length;


  return `

<!DOCTYPE html>

<html lang="tr">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
${escapeHTML(title)} - Go Go Lo Mail
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f6f8fc;
  color: #202124;
}

header {
  height: 72px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  box-shadow:
    0 2px 8px
    rgba(0,0,0,.08);
}

.logo {
  font-size: 24px;
  font-weight: bold;
}

.account {
  font-size: 14px;
}

.logout {
  color: #ea4335;
  text-decoration: none;
  margin-left: 15px;
}

.layout {
  display: flex;
  min-height:
    calc(100vh - 72px);
}

.sidebar {
  width: 230px;
  padding: 25px 15px;
}

.compose {
  display: block;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 16px;
  background: #c2e7ff;
  color: #001d35;
  text-decoration: none;
  text-align: center;
  font-weight: bold;
}

.menu {
  display: block;
  padding: 12px 15px;
  border-radius: 20px;
  color: #333;
  text-decoration: none;
  margin: 4px 0;
}

.menu:hover {
  background: #e8eaed;
}

.badge {
  display: inline-block;
  min-width: 20px;
  padding: 2px 6px;
  margin-left: 5px;
  border-radius: 12px;
  background: #ea4335;
  color: white;
  font-size: 12px;
}

main {
  flex: 1;
  padding: 25px;
}

.card {
  background: white;
  border-radius: 18px;
  padding: 30px;
  box-shadow:
    0 3px 15px
    rgba(0,0,0,.08);
  min-height: 400px;
}

.message-row {
  display: flex;
  align-items: center;
  border-bottom:
    1px solid #eee;
}

.message-row.unread {
  background: #eaf2ff;
  font-weight: bold;
}

.message-link {
  flex: 1;
  display: block;
  padding: 18px 12px;
  color: inherit;
  text-decoration: none;
  min-width: 0;
}

.message-title {
  font-size: 17px;
  margin-bottom: 7px;
}

.message-meta {
  color: #777;
  font-size: 13px;
  margin-bottom: 7px;
}

.preview {
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow:
    ellipsis;
}

.star-form {
  padding: 0 15px;
}

.star-button {
  background: transparent;
  border: none;
  font-size: 25px;
  cursor: pointer;
}

.open-subject {
  font-size: 28px;
  margin-bottom: 20px;
}

.open-meta {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 25px;
  line-height: 1.7;
}

.open-body {
  min-height: 150px;
  white-space: pre-wrap;
  line-height: 1.7;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 30px;
}

.action-button {
  display: inline-block;
  border: none;
  border-radius: 22px;
  padding: 12px 22px;
  font-size: 15px;
  cursor: pointer;
  text-decoration: none;
}

.reply {
  background: #0b57d0;
  color: white;
}

.star-action {
  background: #fbbc04;
  color: #222;
}

.delete-action {
  background: #ea4335;
  color: white;
}

input,
textarea {
  width: 100%;
  border:
    1px solid #ccc;
  border-radius: 10px;
  padding: 13px;
  font-size: 15px;
  margin:
    7px 0 17px;
}

textarea {
  height: 220px;
}

.send-button {
  border: none;
  background: #0b57d0;
  color: white;
  border-radius: 22px;
  padding: 12px 25px;
  cursor: pointer;
}

.empty {
  text-align: center;
  padding: 70px 20px;
  color: #777;
}

.success {
  background: #e6f4ea;
  padding: 15px;
  border-radius: 12px;
}

.error {
  background: #fce8e6;
  padding: 15px;
  border-radius: 12px;
}

.normal-link {
  color: #4285f4;
  text-decoration: none;
}

</style>

</head>

<body>

<header>

<div class="logo">
📨 Go Go Lo Mail
</div>

<div class="account">

<b>
${escapeHTML(user.address)}
</b>

<a
  class="logout"
  href="/logout"
>
Çıkış Yap
</a>

</div>

</header>


<div class="layout">

<div class="sidebar">

<a
  class="compose"
  href="/compose"
>
✏️ Yeni Mesaj
</a>

<a
  class="menu"
  href="/inbox"
>
📥 Gelen Kutusu

${
  unreadCount > 0
    ? `<span class="badge">${unreadCount}</span>`
    : ""
}

</a>

<a
  class="menu"
  href="/starred"
>
⭐ Yıldızlılar
</a>

<a
  class="menu"
  href="/sent"
>
📤 Gönderilenler
</a>

<a
  class="menu"
  href="/"
>
🏠 Go Go Lo
</a>

</div>


<main>

<div class="card">

${content}

</div>

</main>

</div>

</body>

</html>

`;
}


// =====================================================
// BASİT SAYFA
// =====================================================

function simplePage(
  title,
  body
) {

  return `

<!DOCTYPE html>

<html lang="tr">

<head>

<meta charset="UTF-8">

<title>
${escapeHTML(title)}
</title>

<style>

body {
  font-family: Arial;
  background: #f6f8fc;
}

.box {
  width: 420px;
  max-width: 90%;
  margin: 80px auto;
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow:
    0 5px 25px
    rgba(0,0,0,.15);
}

h1,
h2,
p {
  text-align: center;
}

input {
  box-sizing: border-box;
  width: 100%;
  height: 48px;
  margin-top: 12px;
  padding: 0 15px;
  border:
    1px solid #ccc;
  border-radius: 10px;
}

button {
  width: 100%;
  height: 48px;
  margin-top: 20px;
  border: none;
  border-radius: 10px;
  background: #111;
  color: white;
}

a {
  display: block;
  text-align: center;
  margin-top: 20px;
  color: #4285f4;
  text-decoration: none;
}

</style>

</head>

<body>

<div class="box">

${body}

</div>

</body>

</html>

`;
}


// =====================================================
// HESAP OLUŞTURMA SAYFASI
// =====================================================

app.get("/mail", (req, res) => {

  const user =
    getLoggedInUser(req);


  if (user) {
    return res.redirect(
      "/inbox"
    );
  }


  res.send(

    simplePage(

      "Go Go Lo Mail",

      `

<h1>
📨 Go Go Lo Mail
</h1>

<p>
Yeni hesabını oluştur
</p>

<form
  method="POST"
  action="/register"
>

<input
  name="username"
  placeholder="Kullanıcı adı"
  required
>

<input
  name="password"
  type="password"
  placeholder="Şifre"
  required
>

<button type="submit">
🚀 Hesap Oluştur
</button>

</form>

<a href="/login">
🔐 Zaten hesabım var
</a>

<a href="/">
← Go Go Lo
</a>

`
    )
  );
});


// =====================================================
// HESAP OLUŞTUR
// =====================================================

app.post("/register", (req, res) => {

  const username =
    String(
      req.body.username || ""
    )
    .trim()
    .toLowerCase();


  const password =
    String(
      req.body.password || ""
    );


  if (
    !/^[a-z0-9._-]+$/.test(
      username
    )
  ) {

    return res.send(

      simplePage(

        "Hata",

        `

<h1>
❌ Kullanıcı adı geçersiz
</h1>

<a href="/mail">
Geri dön
</a>

`
      )
    );
  }


  if (
    password.length < 4
  ) {

    return res.send(

      simplePage(

        "Hata",

        `

<h1>
🔐 Şifre çok kısa
</h1>

<a href="/mail">
Geri dön
</a>

`
      )
    );
  }


  const existing =
    users.find(
      user =>
        user.username === username
    );


  if (existing) {

    return res.send(

      simplePage(

        "Hata",

        `

<h1>
⚠️ Bu kullanıcı adı alınmış
</h1>

<a href="/mail">
Geri dön
</a>

`
      )
    );
  }


  users.push({

    username,

    password,

    address:
      username + "@gogolo",

    inbox: [],

    sent: [],

    aiChats: [],

aiMemory: []

  });


  saveUsers();


  res.send(

    simplePage(

      "Hesap oluşturuldu",

      `

<h1>
🎉 Hesabın oluşturuldu!
</h1>

<h2>
${escapeHTML(username)}@gogolo
</h2>

<a href="/login">
🔐 Giriş Yap
</a>

`
    )
  );
});


// =====================================================
// GİRİŞ SAYFASI
// =====================================================

app.get("/login", (req, res) => {

  const user =
    getLoggedInUser(req);


  if (user) {
    return res.redirect(
      "/inbox"
    );
  }


  res.send(

    simplePage(

      "Giriş",

      `

<h1>
📨 Go Go Lo Mail
</h1>

<p>
Hesabına giriş yap
</p>

<form
  method="POST"
  action="/login"
>

<input
  name="username"
  placeholder="Kullanıcı adı"
  required
>

<input
  name="password"
  type="password"
  placeholder="Şifre"
  required
>

<button type="submit">
🔐 Giriş Yap
</button>

</form>

<a href="/mail">
Yeni hesap oluştur
</a>

<a href="/">
← Go Go Lo
</a>

`
    )
  );
});


// =====================================================
// GİRİŞ
// =====================================================

app.post("/login", (req, res) => {

  const username =
    String(
      req.body.username || ""
    )
    .trim()
    .toLowerCase();


  const password =
    String(
      req.body.password || ""
    );


  const user =
    users.find(

      account =>
        account.username === username &&
        account.password === password

    );


  if (!user) {

    return res.send(

      simplePage(

        "Hata",

        `

<h1>
❌ Giriş yapılamadı
</h1>

<a href="/login">
Tekrar dene
</a>

`
      )
    );
  }


  const sessionId =
    crypto.randomUUID();


  sessions[sessionId] =
    user.username;


  res.setHeader(

    "Set-Cookie",

    "gogolo_session=" +
    sessionId +
    "; Path=/; HttpOnly; SameSite=Lax"

  );


  res.redirect(
    "/inbox"
  );
});


// =====================================================
// MESAJ SATIRI
// =====================================================

function messageRow(
  message,
  box
) {

  const preview =
    String(
      message.body || ""
    )
    .replace(/\s+/g, " ")
    .slice(0, 100);


  const unreadClass =
    box === "inbox" &&
    !message.read
      ? "unread"
      : "";


  const person =
    box === "inbox"
      ? "Kimden: " + message.from
      : "Kime: " + message.to;


  return `

<div class="message-row ${unreadClass}">

<a
  class="message-link"
  href="/message/${box}/${encodeURIComponent(message.id)}"
>

<div class="message-title">

${
  box === "inbox" &&
  !message.read
    ? "● "
    : ""
}

${escapeHTML(
  message.subject ||
  "(Konu yok)"
)}

</div>

<div class="message-meta">

${escapeHTML(person)}

&nbsp; • &nbsp;

${escapeHTML(
  messageDate(message)
)}

</div>

<div class="preview">

${escapeHTML(preview)}

</div>

</a>


<form
  class="star-form"
  method="POST"
  action="/toggle-star"
>

<input
  type="hidden"
  name="box"
  value="${box}"
>

<input
  type="hidden"
  name="id"
  value="${escapeHTML(message.id)}"
>

<input
  type="hidden"
  name="returnTo"
  value="/${box === "inbox" ? "inbox" : "sent"}"
>

<button
  class="star-button"
  type="submit"
>

${message.starred ? "⭐" : "☆"}

</button>

</form>

</div>

`;
}


// =====================================================
// GELEN KUTUSU
// =====================================================

app.get("/inbox", (req, res) => {

  const user =
    getLoggedInUser(req);


  if (!user) {
    return res.redirect(
      "/login"
    );
  }


  const html =
    user.inbox.length

      ? [...user.inbox]
          .reverse()
          .map(
            message =>
              messageRow(
                message,
                "inbox"
              )
          )
          .join("")

      : `
        <div class="empty">
        📭 Henüz mesajın yok.
        </div>
      `;


  res.send(

    mailPage(

      user,

      "Gelen Kutusu",

      `

<h1>
📥 Gelen Kutusu
</h1>

${html}

`
    )
  );
});


// =====================================================
// GÖNDERİLENLER
// =====================================================

app.get("/sent", (req, res) => {

  const user =
    getLoggedInUser(req);


  if (!user) {
    return res.redirect(
      "/login"
    );
  }


  const html =
    user.sent.length

      ? [...user.sent]
          .reverse()
          .map(
            message =>
              messageRow(
                message,
                "sent"
              )
          )
          .join("")

      : `
        <div class="empty">
        📤 Henüz mesaj göndermedin.
        </div>
      `;


  res.send(

    mailPage(

      user,

      "Gönderilenler",

      `

<h1>
📤 Gönderilenler
</h1>

${html}

`
    )
  );
});


// =====================================================
// YILDIZLILAR
// =====================================================

app.get("/starred", (req, res) => {

  const user =
    getLoggedInUser(req);


  if (!user) {
    return res.redirect(
      "/login"
    );
  }


  const all = [

    ...user.inbox
      .filter(
        message =>
          message.starred
      )
      .map(
        message => ({
          ...message,
          box: "inbox"
        })
      ),

    ...user.sent
      .filter(
        message =>
          message.starred
      )
      .map(
        message => ({
          ...message,
          box: "sent"
        })
      )

  ];


  const html =
    all.length

      ? all
          .reverse()
          .map(
            message =>
              messageRow(
                message,
                message.box
              )
          )
          .join("")

      : `
        <div class="empty">
        ☆ Henüz yıldızlı mesajın yok.
        </div>
      `;


  res.send(

    mailPage(

      user,

      "Yıldızlılar",

      `

<h1>
⭐ Yıldızlılar
</h1>

${html}

`
    )
  );
});


// =====================================================
// MESAJ AÇ
// =====================================================

app.get(
  "/message/:box/:id",
  (req, res) => {

    const user =
      getLoggedInUser(req);


    if (!user) {
      return res.redirect(
        "/login"
      );
    }


    const box =
      req.params.box;


    const id =
      req.params.id;


    const list =
      box === "inbox"
        ? user.inbox
        : user.sent;


    const message =
      list.find(
        item =>
          item.id === id
      );


    if (!message) {

      return res.send(
        "Mesaj bulunamadı."
      );
    }


    if (
      box === "inbox"
    ) {

      message.read = true;

      saveUsers();
    }


    const replyTo =
      box === "inbox"
        ? message.from
        : message.to;


    let replySubject =
      message.subject || "";


    if (
      !/^re:/i.test(
        replySubject
      )
    ) {

      replySubject =
        "Re: " +
        replySubject;
    }


    const replyURL =

      "/compose?to=" +

      encodeURIComponent(
        replyTo
      ) +

      "&subject=" +

      encodeURIComponent(
        replySubject
      );


    res.send(

      mailPage(

        user,

        message.subject,

        `

<div class="open-subject">

${message.starred ? "⭐ " : ""}

${escapeHTML(message.subject)}

</div>


<div class="open-meta">

<b>Kimden:</b>
${escapeHTML(message.from)}

<br>

<b>Kime:</b>
${escapeHTML(message.to)}

<br>

<b>Tarih:</b>
${escapeHTML(
  messageDate(message)
)}

</div>


<div class="open-body">

${escapeHTML(message.body)}

</div>


<div class="actions">

<a
  class="action-button reply"
  href="${replyURL}"
>
↩️ Cevapla
</a>


<form
  method="POST"
  action="/toggle-star"
>

<input
  type="hidden"
  name="box"
  value="${box}"
>

<input
  type="hidden"
  name="id"
  value="${message.id}"
>

<input
  type="hidden"
  name="returnTo"
  value="/message/${box}/${message.id}"
>

<button
  class="action-button star-action"
>

${message.starred
  ? "☆ Yıldızı Kaldır"
  : "⭐ Yıldızla"}

</button>

</form>


<form
  method="POST"
  action="/delete-message"
>

<input
  type="hidden"
  name="box"
  value="${box}"
>

<input
  type="hidden"
  name="id"
  value="${message.id}"
>

<button
  class="action-button delete-action"
>

🗑️ Sil

</button>

</form>

</div>

`
      )
    );
  }
);


// =====================================================
// YILDIZLA
// =====================================================

app.post(
  "/toggle-star",
  (req, res) => {

    const user =
      getLoggedInUser(req);


    if (!user) {
      return res.redirect(
        "/login"
      );
    }


    const box =
      req.body.box;


    const id =
      req.body.id;


    const list =
      box === "inbox"
        ? user.inbox
        : user.sent;


    const message =
      list.find(
        item =>
          item.id === id
      );


    if (message) {

      message.starred =
        !message.starred;

      saveUsers();
    }


    const returnTo =
      String(
        req.body.returnTo ||
        "/inbox"
      );


    res.redirect(
      returnTo
    );
  }
);


// =====================================================
// MESAJ SİL
// =====================================================

app.post(
  "/delete-message",
  (req, res) => {

    const user =
      getLoggedInUser(req);


    if (!user) {
      return res.redirect(
        "/login"
      );
    }


    const box =
      req.body.box;


    const id =
      req.body.id;


    if (
      box === "inbox"
    ) {

      user.inbox =
        user.inbox.filter(
          message =>
            message.id !== id
        );

      saveUsers();

      return res.redirect(
        "/inbox"
      );
    }


    user.sent =
      user.sent.filter(
        message =>
          message.id !== id
      );


    saveUsers();


    res.redirect(
      "/sent"
    );
  }
);


// =====================================================
// YENİ MESAJ
// =====================================================

app.get("/compose", (req, res) => {

  const user =
    getLoggedInUser(req);


  if (!user) {
    return res.redirect(
      "/login"
    );
  }


  const to =
    String(
      req.query.to || ""
    );


  const subject =
    String(
      req.query.subject || ""
    );


  res.send(

    mailPage(

      user,

      "Yeni Mesaj",

      `

<h1>
✏️ Yeni Mesaj
</h1>

<form
  method="POST"
  action="/send"
>

<label>
Kime:
</label>

<input
  name="to"
  value="${escapeHTML(to)}"
  placeholder="ornek@gogolo"
  required
>

<label>
Konu:
</label>

<input
  name="subject"
  value="${escapeHTML(subject)}"
  required
>

<label>
Mesaj:
</label>

<textarea
  name="body"
  required
></textarea>

<button
  class="send-button"
>

📨 Gönder

</button>

</form>

`
    )
  );
});


// =====================================================
// MESAJ GÖNDER
// =====================================================

app.post("/send", (req, res) => {

  const sender =
    getLoggedInUser(req);


  if (!sender) {
    return res.redirect(
      "/login"
    );
  }


  let to =
    String(
      req.body.to || ""
    )
    .trim()
    .toLowerCase();


  const subject =
    String(
      req.body.subject || ""
    )
    .trim();


  const body =
    String(
      req.body.body || ""
    )
    .trim();


  if (!to.includes("@")) {
    to += "@gogolo";
  }


  const receiver =
    users.find(

      user =>
        user.address
          .toLowerCase() === to

    );


  if (!receiver) {

    return res.send(

      mailPage(

        sender,

        "Hata",

        `

<h1>
❌ Kullanıcı bulunamadı
</h1>

`
      )
    );
  }


  const id =
    crypto.randomUUID();


  const createdAt =
    new Date()
      .toISOString();


  receiver.inbox.push({

    id,

    from:
      sender.address,

    to:
      receiver.address,

    subject,

    body,

    createdAt,

    read: false,

    starred: false

  });


  sender.sent.push({

    id,

    from:
      sender.address,

    to:
      receiver.address,

    subject,

    body,

    createdAt,

    starred: false

  });


  saveUsers();


  res.send(

    mailPage(

      sender,

      "Gönderildi",

      `

<h1>
✅ Mesaj gönderildi!
</h1>

<div class="success">

Mesajın
<b>
${escapeHTML(receiver.address)}
</b>
hesabına ulaştı. 📨

</div>

`
    )
  );
});


// =====================================================
// GO GO LO AI — KİM GİRİŞ YAPMIŞ?
// =====================================================

app.get(
  "/api/me",
  (req, res) => {

    const user =
      getLoggedInUser(req);


    if (!user) {

      return res.json({
        loggedIn: false
      });
    }


    res.json({

      loggedIn: true,

      username:
        user.username,

      address:
        user.address

    });
  }
);


// =====================================================
// AI SOHBETLERİNİ GETİR
// =====================================================

app.get(
  "/api/ai/chats",
  (req, res) => {

    const user =
      requireApiLogin(
        req,
        res
      );


    if (!user) {
      return;
    }


    const chats =

      [...user.aiChats]

        .sort(

          (a, b) =>

            new Date(b.updatedAt) -
            new Date(a.updatedAt)

        )

        .map(chat => ({

          id:
            chat.id,

          title:
            chat.title,

          createdAt:
            chat.createdAt,

          updatedAt:
            chat.updatedAt,

          messageCount:
            chat.messages.length

        }));


    res.json({
      ok: true,
      chats
    });
  }
);


// =====================================================
// YENİ AI SOHBETİ
// =====================================================

app.post(
  "/api/ai/chats",
  (req, res) => {

    const user =
      requireApiLogin(
        req,
        res
      );


    if (!user) {
      return;
    }


    const now =
      new Date()
        .toISOString();


    const chat = {

      id:
        crypto.randomUUID(),

      title:
        "Yeni Sohbet",

      createdAt:
        now,

      updatedAt:
        now,

      messages: []

    };


    user.aiChats.push(
      chat
    );


    saveUsers();


    res.json({
      ok: true,
      chat
    });
  }
);


// =====================================================
// BİR AI SOHBETİNİ AÇ
// =====================================================

app.get(
  "/api/ai/chats/:id",
  (req, res) => {

    const user =
      requireApiLogin(
        req,
        res
      );


    if (!user) {
      return;
    }


    const chat =
      user.aiChats.find(

        item =>
          item.id ===
          req.params.id

      );


    if (!chat) {

      return res
        .status(404)
        .json({

          ok: false,

          error:
            "Sohbet bulunamadı."

        });
    }


    res.json({
      ok: true,
      chat
    });
  }
);


// =====================================================
// AI SOHBETİNE MESAJ EKLE
// =====================================================

app.post(
  "/api/ai/chats/:id/messages",
  (req, res) => {

    const user =
      requireApiLogin(
        req,
        res
      );


    if (!user) {
      return;
    }


    const chat =
      user.aiChats.find(

        item =>
          item.id ===
          req.params.id

      );


    if (!chat) {

      return res
        .status(404)
        .json({

          ok: false,

          error:
            "Sohbet bulunamadı."

        });
    }


    const role =
      String(
        req.body.role || ""
      );


    const text =
      String(
        req.body.text || ""
      )
      .trim();


    if (
      role !== "user" &&
      role !== "model"
    ) {

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Mesaj türü geçersiz."

        });
    }


    if (!text) {

      return res
        .status(400)
        .json({

          ok: false,

          error:
            "Mesaj boş olamaz."

        });
    }


    const message = {

      id:
        crypto.randomUUID(),

      role,

      text,

      createdAt:
        new Date()
          .toISOString()

    };


    chat.messages.push(
      message
    );


    chat.updatedAt =
      message.createdAt;


    // İlk mesajdan sohbet başlığı oluştur
    if (
      role === "user" &&
      (
        chat.title ===
        "Yeni Sohbet"
      )
    ) {

      const oneLine =
        text
          .replace(/\s+/g, " ")
          .trim();


      chat.title =

        oneLine.length > 42

          ? oneLine.slice(
              0,
              42
            ) + "…"

          : oneLine;
    }


    saveUsers();


    res.json({

      ok: true,

      message,

      chatTitle:
        chat.title

    });
  }
);


// =====================================================
// AI SOHBETİNİ SİL
// =====================================================

app.delete(
  "/api/ai/chats/:id",
  (req, res) => {

    const user =
      requireApiLogin(
        req,
        res
      );


    if (!user) {
      return;
    }


    const oldLength =
      user.aiChats.length;


    user.aiChats =
      user.aiChats.filter(

        chat =>
          chat.id !==
          req.params.id

      );


    if (
      oldLength ===
      user.aiChats.length
    ) {

      return res
        .status(404)
        .json({

          ok: false,

          error:
            "Sohbet bulunamadı."

        });
    }


    saveUsers();


    res.json({
      ok: true
    });
  }
);

// =====================================================
// AI GENEL HAFIZA
// =====================================================


// Hafızayı getir
app.get("/api/ai/memory", (req, res) => {

  const user =
    requireApiLogin(req, res);

  if (!user) {
    return;
  }

  if (!Array.isArray(user.aiMemory)) {
    user.aiMemory = [];
  }

  res.json({
    ok: true,
    memory: user.aiMemory
  });

});


// Hafızaya yeni bilgi ekle
app.post("/api/ai/memory", (req, res) => {

  const user =
    requireApiLogin(req, res);

  if (!user) {
    return;
  }

  if (!Array.isArray(user.aiMemory)) {
    user.aiMemory = [];
  }

  const text =
    String(req.body.text || "")
      .trim();

  if (!text) {

    return res.status(400).json({
      ok: false,
      error: "Hatırlanacak bilgi boş olamaz."
    });

  }


  const memoryItem = {

    id:
      crypto.randomUUID(),

    text: text,

    createdAt:
      new Date().toISOString()

  };


  user.aiMemory.push(
    memoryItem
  );

  saveUsers();


  res.json({
    ok: true,
    memoryItem: memoryItem
  });

});


// Hafızadaki tek bilgiyi sil
app.delete("/api/ai/memory/:id", (req, res) => {

  const user =
    requireApiLogin(req, res);

  if (!user) {
    return;
  }

  user.aiMemory =
    user.aiMemory.filter(
      item =>
        item.id !== req.params.id
    );

  saveUsers();

  res.json({
    ok: true
  });

});


// Tüm hafızayı temizle
app.delete("/api/ai/memory", (req, res) => {

  const user =
    requireApiLogin(req, res);

  if (!user) {
    return;
  }

  user.aiMemory = [];

  saveUsers();

  res.json({
    ok: true
  });

});


// AI'nın kullanacağı genel hafıza metni
app.get("/api/ai/context", (req, res) => {

  const user =
    requireApiLogin(req, res);

  if (!user) {
    return;
  }

  if (!Array.isArray(user.aiMemory)) {
    user.aiMemory = [];
  }


  const memoryText =
    user.aiMemory
      .map(item => item.text)
      .filter(Boolean)
      .join("\n");


  res.json({

    ok: true,

    memory:
      user.aiMemory,

    memoryText:
      memoryText

  });

});
// =====================================================
// ÇIKIŞ
// =====================================================

app.get("/logout", (req, res) => {

  const sessionId =
    getCookies(req)
      .gogolo_session;


  if (sessionId) {

    delete sessions[
      sessionId
    ];
  }


  res.setHeader(

    "Set-Cookie",

    "gogolo_session=; Path=/; Max-Age=0; SameSite=Lax"

  );


  res.redirect(
    "/login"
  );
});


// =====================================================
// SUNUCU
// =====================================================
app.post("/api/ai/generate", async (req, res) => {

  try {

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Gemini API anahtarı sunucuda tanımlı değil."
      });
    }

    const contents =
      req.body.contents;

    const response =
      await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },

          body: JSON.stringify({
            contents
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      return res
        .status(response.status)
        .json({
          ok: false,
          error:
            data?.error?.message ||
            "Gemini API hatası."
        });
    }

    res.json({
      ok: true,
      data
    });

  }

  catch(error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }

});
app.listen(PORT, () => {

  console.log("");

  console.log(
    "🚀 Go Go Lo çalışıyor!"
  );

  console.log(
    "🏠 http://localhost:3000"
  );

  console.log(
    "📨 http://localhost:3000/mail"
  );

  console.log(
    "🧠 AI sohbet hafızası hazır!"
  );

  console.log("");

});
