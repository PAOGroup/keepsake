/* ============================================================
   KEEPSAKE — app logic (vanilla JS, no build step)
   Runs in LIVE mode when Firebase is configured in config.js,
   otherwise in local DEMO mode (saves to this browser).
   ============================================================ */
(function () {
  "use strict";

  var CFG = window.KEEPSAKE_CONFIG || {};
  var HON = CFG.honoree || { firstName: "Michael", fullName: "Michael", role: "", team: "" };
  var LIVE = !!(CFG.firebase && CFG.firebase.apiKey);

  /* ---------------- tiny helpers ---------------- */
  var app = document.getElementById("app");
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function icons() { if (window.lucide) { try { window.lucide.createIcons(); } catch (e) {} } }
  var AV_COLORS = ["#1F3050", "#5B7B9A", "#B0543B", "#E0A43B", "#4F7A5C", "#8F3D29"];
  function avatarColor(name) {
    var n = 0; name = name || "?";
    for (var i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % AV_COLORS.length;
    return AV_COLORS[n];
  }
  function initials(name) {
    var p = String(name || "?").trim().split(/\s+/);
    return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  }
  function avatar(name, src, sm) {
    var cls = "ks-avatar" + (sm ? " ks-avatar--sm" : "");
    if (src) return '<span class="' + cls + '"><img src="' + esc(src) + '" alt=""></span>';
    return '<span class="' + cls + '" style="background:' + avatarColor(name) + '">' + esc(initials(name)) + "</span>";
  }
  var toastTimer;
  function toast(msg) {
    var old = document.getElementById("ks-toast"); if (old) old.remove();
    var t = document.createElement("div");
    t.id = "ks-toast"; t.className = "ks-toast";
    t.innerHTML = '<i data-lucide="check-circle"></i>' + esc(msg);
    document.body.appendChild(t); icons();
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------------- image compression ---------------- */
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) { reject(new Error("Not an image")); return; }
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 1280, w = img.width, h = img.height;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
        else if (h > max) { w = Math.round(w * max / h); h = max; }
        function enc(q) {
          var c = document.createElement("canvas"); c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          return c.toDataURL("image/jpeg", q);
        }
        var data = enc(0.72);
        if (data.length > 900000) data = enc(0.55);
        resolve(data);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
      img.src = url;
    });
  }

  /* ============================================================
     DATA STORE  (LIVE = Firestore · DEMO = localStorage)
     ============================================================ */
  var store = (function () {
    var subs = [], cache = [];
    function notify() { subs.forEach(function (cb) { cb(cache.slice()); }); }

    if (LIVE) {
      firebase.initializeApp(CFG.firebase);
      var db = firebase.firestore();
      var col = db.collection("messages");
      col.orderBy("created", "desc").onSnapshot(function (snap) {
        cache = snap.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
        notify();
      }, function (err) { console.error(err); toast("Connection issue — retrying…"); });
      return {
        live: true,
        subscribe: function (cb) { subs.push(cb); cb(cache.slice()); },
        add: function (data) {
          data.status = "pending"; data.created = Date.now();
          return col.add(data);
        },
        update: function (id, fields) { return col.doc(id).update(fields); },
        remove: function (id) { return col.doc(id).delete(); }
      };
    }

    /* ---- DEMO ---- */
    var KEY = "keepsake_messages_v1";
    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
    function save() { localStorage.setItem(KEY, JSON.stringify(cache)); }
    cache = load();
    if (!cache) { cache = seed(); save(); }
    cache.sort(function (a, b) { return b.created - a.created; });
    window.addEventListener("storage", function (e) { if (e.key === KEY) { cache = load() || []; cache.sort(function (a, b) { return b.created - a.created; }); notify(); } });
    function uid() { return "m" + Date.now() + Math.random().toString(36).slice(2, 6); }
    return {
      live: false,
      subscribe: function (cb) { subs.push(cb); cb(cache.slice()); },
      add: function (data) {
        data.id = uid(); data.status = "pending"; data.created = Date.now();
        cache.unshift(data); save(); notify(); return Promise.resolve();
      },
      update: function (id, fields) {
        cache = cache.map(function (m) { return m.id === id ? Object.assign({}, m, fields) : m; });
        save(); notify(); return Promise.resolve();
      },
      remove: function (id) {
        cache = cache.filter(function (m) { return m.id !== id; });
        save(); notify(); return Promise.resolve();
      }
    };
  })();

  function seed() {
    var now = Date.now();
    function m(o, mins) { o.created = now - mins * 60000; return o; }
    return [
      m({ id: "s1", name: "Priya Sharma", team: "Health Visiting", status: "approved", show: true,
        message: "Working alongside you this past year has been one of the real joys of my time here. You stayed calm in every storm and always had time for someone who was panicking. Thank you, Michael." }, 60),
      m({ id: "s2", name: "Tom Okafor", team: "School Nursing", status: "approved", show: true,
        message: "The team simply won't be the same without you. Wishing you every happiness in the next chapter." }, 120),
      m({ id: "s3", name: "Sara Lin", team: "Safeguarding", status: "approved", show: true, signature: true,
        message: "Take care, Michael. You'll be so missed. x" }, 180),
      m({ id: "s4", name: "Dawn Reilly", team: "Business Support", status: "approved", show: true,
        message: "A true gentleman and simply the best colleague a team could ask for. Best of luck in the new role!" }, 240),
      m({ id: "s5", name: "James Patel", team: "Early Years", status: "approved", show: true,
        message: "From my very first week you made me feel welcome. I learned more from you in a year than I'd have managed in five." }, 300),
      m({ id: "s6", name: "Aoife Byrne", team: "IT Services", status: "approved", show: true,
        message: "Even when our systems were on fire you'd bring tea and good humour. Enjoy the new challenge, you've earned it." }, 360),
      m({ id: "s7", name: "Olu Adeyemi", team: "School Nursing", status: "pending", show: true,
        message: "Wishing you all the very best for what comes next. Thank you for everything." }, 20),
      m({ id: "s8", name: "Rosa Mendez", team: "Duty Team", status: "pending", show: true,
        message: "We'll raise a glass to you at the leaving do. Cheers to you, Michael!" }, 8)
    ];
  }

  /* ============================================================
     AUTH  (LIVE = Firebase Auth · DEMO = session flag)
     ============================================================ */
  var auth = (function () {
    var subs = [], isAdmin = false, label = "";
    function notify() { subs.forEach(function (cb) { cb(isAdmin); }); }
    if (LIVE) {
      var fa = firebase.auth();
      fa.onAuthStateChanged(function (u) { isAdmin = !!u; label = u ? u.email : ""; notify(); });
      return {
        subscribe: function (cb) { subs.push(cb); cb(isAdmin); },
        get isAdmin() { return isAdmin; },
        get label() { return label; },
        login: function (pw) { return fa.signInWithEmailAndPassword(CFG.adminEmail, pw); },
        logout: function () { return fa.signOut(); }
      };
    }
    isAdmin = sessionStorage.getItem("keepsake_admin") === "1";
    label = "Demo organiser";
    return {
      subscribe: function (cb) { subs.push(cb); cb(isAdmin); },
      get isAdmin() { return isAdmin; },
      get label() { return label; },
      login: function (pw) {
        if (pw === (CFG.demoPassword || "demo")) { isAdmin = true; sessionStorage.setItem("keepsake_admin", "1"); notify(); return Promise.resolve(); }
        return Promise.reject(new Error("Wrong password"));
      },
      logout: function () { isAdmin = false; sessionStorage.removeItem("keepsake_admin"); notify(); return Promise.resolve(); }
    };
  })();

  /* ============================================================
     STATE + ROUTER
     ============================================================ */
  var state = { screen: "home", messages: [], isAdmin: auth.isAdmin, adminTab: "submissions", booted: false };

  function routeFromHash() {
    var h = (location.hash || "#home").replace("#", "");
    if (["home", "submit", "card", "admin"].indexOf(h) === -1) h = "home";
    return h;
  }
  function go(screen) { if (location.hash !== "#" + screen) location.hash = "#" + screen; else render(); }

  store.subscribe(function (msgs) {
    state.messages = msgs;
    if (state.booted && state.screen !== "submit") render();
  });
  auth.subscribe(function (a) {
    state.isAdmin = a;
    if (state.booted) render();
  });

  window.addEventListener("hashchange", function () {
    state.screen = routeFromHash();
    window.scrollTo(0, 0);
    render();
  });

  /* ---------------- deadline helpers ---------------- */
  function deadlineMs() { return new Date(CFG.deadline).getTime(); }
  function isClosed() { return Date.now() > deadlineMs(); }
  function fmtDeadline() {
    var d = new Date(CFG.deadline);
    var time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
    var date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    return time + ", " + date;
  }

  /* ---------------- derived ---------------- */
  function cardMessages() { return state.messages.filter(function (m) { return m.status === "approved" && m.show !== false; }); }

  /* ============================================================
     SCREENS
     ============================================================ */
  function navBar() {
    var s = state.screen;
    function link(k, label) { return '<a href="#' + k + '" class="' + (s === k ? "is-active" : "") + '">' + label + "</a>"; }
    return '' +
      '<header class="ks-nav"><div class="ks-nav__inner">' +
        '<a class="ks-nav__brand" href="#home"><img src="assets/logo-mark.svg" alt=""> Keepsake</a>' +
        '<nav class="ks-nav__links">' + link("home", "Home") + link("submit", "Leave a message") + link("card", "The card") + "</nav>" +
        '<span class="ks-nav__deadline" id="navTimer"><i data-lucide="calendar-clock"></i> ' +
          (isClosed() ? "Submissions closed" : 'Closes in <b id="navCount">…</b>') + "</span>" +
      "</div></header>";
  }

  function footer() {
    return '' +
      '<footer class="ks-footer"><div class="ks-footer__inner">' +
        '<span class="ks-footer__brand"><img src="assets/logo-mark.svg" alt="" width="22" height="22"> Keepsake</span>' +
        '<p class="ks-footer__text">A private collection of messages for ' + esc(HON.firstName) +
        '. Shared only with the team and with ' + esc(HON.firstName) + '.</p>' +
        '<a class="btn btn--ghost btn--sm" href="#admin" style="margin-left:auto"><i data-lucide="lock"></i> Organiser</a>' +
      "</div></footer>";
  }

  function modeBar() {
    if (LIVE) return "";
    return '<div class="ks-modebar"><i data-lucide="info" style="width:14px;height:14px;vertical-align:-2px"></i> ' +
      "Demo mode — messages save to this browser only. Add your Firebase keys in config.js to go live. " +
      "(Organiser password here is <b>demo</b>.)</div>";
  }

  function homeScreen() {
    var approved = cardMessages();
    var photos = approved.filter(function (m) { return m.photo; }).length;
    var teams = {}; approved.forEach(function (m) { if (m.team) teams[m.team] = 1; });
    var teamCount = Object.keys(teams).length;
    var confettiCols = ["var(--coral-500)", "var(--gold-500)", "var(--blue-500)", "var(--sage-500)", "var(--coral-200)", "var(--gold-200)"];
    var conf = "";
    for (var i = 0; i < 22; i++) {
      conf += '<span style="left:' + (i * 4.5 + (i % 3) * 2) + "%;top:" + (((i * 37) % 90) + 4) + "%;background:" +
        confettiCols[i % confettiCols.length] + ";transform:rotate(" + ((i * 53) % 360) + "deg);border-radius:" +
        (i % 2 ? "2px" : "50%") + ";width:" + (i % 4 ? "10px" : "14px") + ";height:" + (i % 3 ? "10px" : "6px") + '"></span>';
    }
    var avs = approved.slice(0, 7).map(function (m, i) {
      return '<span style="margin-left:' + (i ? "-12px" : "0") + ";position:relative;z-index:" + (10 - i) + '">' + avatar(m.name, m.photo, true) + "</span>";
    }).join("");

    return '' +
      '<section class="ks-hero"><div class="ks-hero__confetti" aria-hidden="true">' + conf + "</div>" +
        '<div class="ks-hero__inner">' +
          '<p class="ks-eyebrow">A fond farewell · ' + esc(HON.team) + "</p>" +
          '<h1 class="ks-hero__title">Thank you, <span class="ks-ink-accent">' + esc(HON.firstName) + "!</span></h1>" +
          '<p class="ks-hero__sub">A collection of messages and well wishes from across ' + esc(HON.team) +
            ", as " + esc(HON.firstName) + " moves on to his next role.</p>" +
          '<div class="ks-hero__timer">' + countdownHtml() +
            '<p class="ks-hero__deadline"><i data-lucide="calendar-clock"></i> ' +
              (isClosed() ? "Submissions are now closed" : "Submissions close <strong>" + fmtDeadline() + "</strong>") + "</p>" +
          "</div>" +
          '<div class="ks-hero__cta">' +
            (isClosed() ? "" : '<a class="btn btn--accent btn--lg" href="#submit"><i data-lucide="pen-line"></i> Leave a message</a>') +
            '<a class="btn btn--outline btn--lg" href="#card"><i data-lucide="book-heart"></i> View the card</a>' +
          "</div>" +
          '<div class="ks-hero__stats">' +
            "<div><b>" + approved.length + "</b><span>messages</span></div><div class=\"ks-dot\"></div>" +
            "<div><b>" + photos + "</b><span>photos</span></div><div class=\"ks-dot\"></div>" +
            "<div><b>" + teamCount + "</b><span>teams</span></div>" +
          "</div>" +
          (approved.length ? '<div class="ks-hero__stats" style="margin-top:var(--space-6)">' + avs + "</div>" : "") +
        "</div></section>" +

      '<section class="ks-section ks-section--narrow">' +
        '<div class="ks-heading ks-heading--center"><p class="ks-eyebrow ks-heading__eyebrow">How it works</p>' +
          '<h2 class="ks-heading__title">Three small steps to a <em>lasting</em> keepsake</h2></div>' +
        '<div class="ks-steps">' +
          step("1", "pen-line", "Write your message", "Share a few warm words to send " + esc(HON.firstName) + " on his way.") +
          step("2", "image-plus", "Add a photo", "Drop in a snap from a visit, a team day or a night out.") +
          step("3", "sparkles", "We gather it all", "Everything is woven into one beautiful card for " + esc(HON.firstName) + ".") +
        "</div></section>";
  }
  function step(n, ic, t, d) {
    return '<div class="ks-step"><span class="ks-step__num">' + n + '</span>' +
      '<span class="ks-step__icon"><i data-lucide="' + ic + '"></i></span>' +
      '<h3 class="ks-step__title">' + t + '</h3><p class="ks-step__desc">' + d + "</p></div>";
  }
  function countdownHtml() {
    function u(id, lbl) { return '<div class="ks-count__unit"><div class="ks-count__num" id="' + id + '">--</div><div class="ks-count__lbl">' + lbl + "</div></div>"; }
    return '<div class="ks-count">' + u("cd-d", "days") + u("cd-h", "hours") + u("cd-m", "mins") + u("cd-s", "secs") + "</div>";
  }

  /* ---------------- submit ---------------- */
  var formState = { name: "", team: "", message: "", show: true, photo: null };
  function submitScreen() {
    if (isClosed()) {
      return wrapNarrow(
        heading("center", "Leave a message", "Submissions have <em>closed</em>") +
        '<div class="ks-closed"><p><b>Thank you!</b> Submissions for the card closed on ' +
          esc(fmtDeadline()) + '.</p><a class="btn btn--accent" href="#card"><i data-lucide="book-heart"></i> See the finished card</a></div>');
    }
    return wrapNarrow(
      heading("center", "Leave a message", "Share a few <em>warm words</em>", "Required fields are marked with an asterisk. Everything else is optional.") +
      '<form class="ks-form" id="msgForm" novalidate>' +
        '<div class="ks-form__row">' +
          field("Your name", "*", '<input class="ks-input" id="f-name" placeholder="e.g. Priya Sharma" value="' + esc(formState.name) + '">', "e-name") +
          field("Team or role", "opt", '<input class="ks-input" id="f-team" placeholder="e.g. ' + esc(HON.team) + '" value="' + esc(formState.team) + '">') +
        "</div>" +
        field("Leaving message", "*",
          '<textarea class="ks-textarea" id="f-message" maxlength="600" placeholder="What would you like to say to ' + esc(HON.firstName) + '?">' + esc(formState.message) + "</textarea>" +
          '<div class="ks-field__count" id="f-count">0 / 600</div>', "e-message") +
        '<div class="ks-field"><span class="ks-field__label">Photo <span class="ks-field__opt">Optional</span></span>' +
          '<div id="dropZone">' + dropInner() + "</div></div>" +
        '<label class="ks-check"><input type="checkbox" id="f-show" ' + (formState.show ? "checked" : "") + ">" +
          '<span><span class="ks-check__t">Show my message on ' + esc(HON.firstName) + "'s final card</span>" +
          '<br><span class="ks-check__d">If unchecked, only the organiser will see it.</span></span></label>' +
        '<div class="ks-form__actions">' +
          '<a class="btn btn--ghost" href="#home">Cancel</a>' +
          '<button class="btn btn--accent btn--lg" type="submit" id="f-submit"><i data-lucide="send"></i> Add my message</button>' +
        "</div>" +
      "</form>");
  }
  function dropInner() {
    if (formState.photo) {
      return '<div class="ks-drop__preview"><img src="' + esc(formState.photo) + '" alt="preview">' +
        '<button type="button" class="btn btn--outline btn--sm ks-drop__clear" id="dropClear"><i data-lucide="x"></i> Remove</button></div>';
    }
    return '<label class="ks-drop" id="dropLabel"><i data-lucide="image-plus"></i>' +
      '<p class="ks-drop__hint">Tap to choose a photo, or drag one here</p>' +
      '<input type="file" accept="image/*" id="f-photo" hidden></label>';
  }
  function successScreen(name) {
    return wrapNarrow(
      '<div class="ks-success"><div class="ks-success__icon"><i data-lucide="check"></i></div>' +
        "<h1 class=\"ks-success__title\">Thank you, " + esc(name) + "!</h1>" +
        '<p class="ks-success__sub">Your message has been added to ' + esc(HON.firstName) +
          "'s card. It will appear once the organiser approves it.</p>" +
        '<div class="ks-success__actions">' +
          '<a class="btn btn--accent btn--lg" href="#card"><i data-lucide="book-heart"></i> See the card</a>' +
          '<button class="btn btn--outline btn--lg" id="addAnother">Add another</button>' +
        "</div></div>");
  }

  /* ---------------- the card ---------------- */
  function cardScreen() {
    var msgs = cardMessages();
    var teamNote = "" + esc(HON.firstName) + " joined " + esc(HON.team) + " just last June, and in barely a year as our " +
      esc(HON.role.split("·")[0].trim()) + " he's left a real mark — steady under pressure, generous with his time, and always the first to roll his sleeves up. " +
      "As he moves on to a bigger role, we wanted to gather everything we never quite found time to say. Thank you, " + esc(HON.firstName) + " — go and be brilliant.";
    return '' +
      '<section class="ks-cardart">' +
        '<img class="ks-cardart__frame" src="assets/card-michael.png" alt="Sorry you\'re leaving, ' + esc(HON.firstName) + '! Thank you for everything.">' +
        '<div class="ks-cardart__caption"><p class="ks-cardart__name">' + esc(HON.fullName) + "</p>" +
          '<p class="ks-cardart__role">' + esc(HON.role) + "</p>" +
          '<p class="ks-cardart__journey">' +
            '<span class="leg"><i data-lucide="sprout"></i> Joined <b>June&nbsp;2025</b></span><span class="ks-cardart__sep"></span>' +
            '<span class="leg"><i data-lucide="calendar-check"></i> Last day <b>1&nbsp;July&nbsp;2026</b></span><span class="ks-cardart__sep"></span>' +
            '<span class="leg"><i data-lucide="trending-up"></i> Off to a <b>bigger&nbsp;role</b></span>' +
          "</p></div></section>" +
      '<section class="ks-section ks-section--narrow"><div class="ks-teamnote">' +
        '<span class="ks-teamnote__mark"><i data-lucide="quote"></i></span>' +
        '<p class="ks-teamnote__text">' + teamNote + "</p>" +
        '<p class="ks-teamnote__sign">With love, from everyone</p></div></section>' +
      '<section class="ks-section">' +
        '<div class="ks-section__head"><div class="ks-heading"><p class="ks-eyebrow ks-heading__eyebrow">From the whole team</p>' +
          '<h2 class="ks-heading__title">Messages &amp; <em>well wishes</em></h2></div>' +
          '<span class="ks-badge ks-badge--neutral">' + msgs.length + " messages</span></div>" +
        (msgs.length ? '<div class="ks-masonry">' + msgs.map(msgCard).join("") + "</div>"
          : '<div class="ks-empty"><i data-lucide="message-circle-heart"></i><p>No messages yet — be the first to leave one!</p>' +
            (isClosed() ? "" : '<a class="btn btn--accent" href="#submit" style="margin-top:8px"><i data-lucide="pen-line"></i> Leave a message</a>') + "</div>") +
      "</section>" +
      '<section class="ks-section ks-section--narrow ks-signoff">' +
        '<img src="assets/logo-mark.svg" alt="" width="40" height="40">' +
        '<p class="ks-signoff__script">Onwards &amp; upwards, ' + esc(HON.firstName) + " — go and be brilliant.</p>" +
        '<p class="ks-signoff__text">From all your colleagues in ' + esc(HON.team) + ".</p></section>";
  }
  function msgCard(m) {
    var body = m.signature
      ? '<span class="ksmsg__sign">' + esc(m.message) + "</span>"
      : esc(m.message);
    return '<article class="ksmsg">' +
      (m.photo ? '<img class="ksmsg__photo" src="' + esc(m.photo) + '" alt="Photo from ' + esc(m.name) + '" loading="lazy">' : "") +
      '<div class="ksmsg__pad"><header class="ksmsg__head">' + avatar(m.name, null) +
        '<div class="ksmsg__who"><span class="ksmsg__name">' + esc(m.name) + "</span>" +
        (m.team ? '<span class="ks-badge ks-badge--blue">' + esc(m.team) + "</span>" : "") + "</div></header>" +
        '<p class="ksmsg__body">' + body + "</p></div></article>";
  }

  /* ---------------- admin ---------------- */
  function loginScreen() {
    return '<div class="ks-login"><div class="ks-login__card">' +
      '<div class="ks-login__icon"><i data-lucide="lock"></i></div>' +
      '<h1 class="ks-login__title">Organiser sign-in</h1>' +
      '<p class="ks-login__sub">This area is private. Enter the organiser password to moderate messages.</p>' +
      '<form id="loginForm"><div id="loginErr"></div>' +
        '<div class="ks-field"><label class="ks-field__label" for="pw">Password</label>' +
          '<input class="ks-input" type="password" id="pw" autocomplete="current-password" placeholder="••••••••"></div>' +
        '<button class="btn btn--primary btn--lg btn--block" type="submit"><i data-lucide="log-in"></i> Sign in</button>' +
      "</form>" +
      '<p style="margin:var(--space-4) 0 0"><a class="btn btn--ghost btn--sm" href="#home"><i data-lucide="arrow-left"></i> Back to the site</a></p>' +
      "</div></div>";
  }

  function adminScreen() {
    var pending = state.messages.filter(function (m) { return m.status === "pending"; });
    var approved = state.messages.filter(function (m) { return m.status === "approved"; });
    var tab = state.adminTab;
    var side = '<aside class="ks-admin__side">' +
      '<div class="ks-admin__brand"><img src="assets/logo-mark.svg" alt="" width="30" height="30"><div><b>Keepsake</b><span>Organiser</span></div></div>' +
      '<nav class="ks-admin__nav">' +
        '<button data-tab="submissions" class="' + (tab === "submissions" ? "is-active" : "") + '"><i data-lucide="inbox"></i> Submissions' + (pending.length ? '<span class="ks-admin__count">' + pending.length + "</span>" : "") + "</button>" +
        '<button data-tab="settings" class="' + (tab === "settings" ? "is-active" : "") + '"><i data-lucide="settings"></i> Settings</button>' +
      "</nav>" +
      '<div class="ks-admin__user">' + avatar(orgName(), null, true) +
        "<div><b>" + esc(orgName()) + "</b><span>Organiser</span></div>" +
        '<button class="btn btn--ghost btn--sm" id="logout" style="margin-left:auto"><i data-lucide="log-out"></i></button></div>' +
      "</aside>";

    var main;
    if (tab === "settings") {
      var shareUrl = location.origin + location.pathname + "#card";
      main = '<div class="ks-admin__panel"><h1 class="ks-admin__title">Settings</h1>' +
        '<div class="ks-admin__card"><h3>Submission deadline</h3>' +
          '<p class="ks-admin__hint">Set in config.js. The site closes submissions automatically once this passes.</p>' +
          '<input class="ks-input" value="' + esc(fmtDeadline()) + '" readonly></div>' +
        '<div class="ks-admin__card"><h3>' + esc(HON.firstName) + "'s shareable link</h3>" +
          '<p class="ks-admin__hint">Send this to ' + esc(HON.firstName) + ' (and the team) to view the finished card.</p>' +
          '<div class="ks-admin__linkrow"><input class="ks-input" id="shareLink" value="' + esc(shareUrl) + '" readonly>' +
            '<button class="btn btn--outline" id="copyLink"><i data-lucide="copy"></i> Copy</button></div></div>' +
        '<div class="ks-admin__card"><h3>Mode</h3><p class="ks-admin__hint" style="margin:0">' +
          (LIVE ? '<b style="color:var(--success)">● Live</b> — connected to Firebase. Updates sync across all devices in real time.'
                : '<b style="color:var(--accent-text)">● Demo</b> — saving to this browser only. Add Firebase keys in config.js to go live.') +
        "</p></div></div>";
    } else {
      main = '<div><div class="ks-admin__head"><div><h1 class="ks-admin__title">Submissions</h1>' +
        '<p class="ks-admin__lede">' + approved.length + " on the card · " + pending.length + " awaiting review</p></div>" +
        '<a class="btn btn--primary" href="#card" target="_blank"><i data-lucide="external-link"></i> View the card</a></div>';
      if (pending.length) {
        main += '<div class="ks-admin__group"><h2 class="ks-admin__grouptitle"><span class="ks-badge ks-badge--gold">Awaiting review</span></h2>' +
          pending.map(function (m) { return adminRow(m, false); }).join("") + "</div>";
      }
      main += '<div class="ks-admin__group"><h2 class="ks-admin__grouptitle"><span class="ks-badge ks-badge--success">On the card</span></h2>' +
        (approved.length ? approved.map(function (m) { return adminRow(m, true); }).join("")
          : '<div class="ks-empty"><i data-lucide="inbox"></i><p>Nothing approved yet.</p></div>') + "</div></div>";
    }
    return '<div class="ks-admin">' + side + '<main class="ks-admin__main">' + main + "</main></div>" +
      '<div class="ks-floatback"><a class="btn btn--outline" href="#home"><i data-lucide="arrow-left"></i> Exit</a></div>';
  }
  function orgName() { return CFG.organiserName || auth.label || "Organiser"; }
  function adminRow(m, approved) {
    var hidden = m.show === false;
    return '<div class="ks-arow">' + avatar(m.name, m.photo) +
      '<div class="ks-arow__body"><div class="ks-arow__top"><b>' + esc(m.name) + "</b>" +
        (m.team ? '<span class="ks-badge ks-badge--blue">' + esc(m.team) + "</span>" : "") +
        (m.photo ? '<span class="ks-badge ks-badge--neutral"><i data-lucide="image"></i> photo</span>' : "") +
        (hidden ? '<span class="ks-badge ks-badge--neutral"><i data-lucide="eye-off"></i> organiser only</span>' : "") +
      '</div><p class="ks-arow__msg">' + esc(m.message) + "</p></div>" +
      '<div class="ks-arow__actions">' +
        (approved
          ? '<button class="ks-arow__btn" data-act="hide" data-id="' + esc(m.id) + '"><i data-lucide="eye-off"></i> Unpublish</button>'
          : '<button class="ks-arow__btn ks-arow__btn--ok" data-act="approve" data-id="' + esc(m.id) + '"><i data-lucide="check"></i> Approve</button>') +
        '<button class="ks-arow__btn ks-arow__btn--danger" data-act="remove" data-id="' + esc(m.id) + '"><i data-lucide="trash-2"></i></button>' +
      "</div></div>";
  }

  /* ---------------- layout helpers ---------------- */
  function heading(align, eyebrow, title, sub) {
    return '<div class="ks-heading' + (align === "center" ? " ks-heading--center" : "") + '">' +
      '<p class="ks-eyebrow ks-heading__eyebrow">' + eyebrow + "</p>" +
      '<h2 class="ks-heading__title">' + title + "</h2>" +
      (sub ? '<p class="ks-heading__sub">' + sub + "</p>" : "") + "</div>";
  }
  function wrapNarrow(inner) { return '<section class="ks-section ks-section--narrow">' + inner + "</section>"; }
  function field(label, mark, control, errId) {
    var opt = mark === "*" ? ' <span style="color:var(--danger)">*</span>' : mark === "opt" ? ' <span class="ks-field__opt">Optional</span>' : "";
    return '<div class="ks-field"><label class="ks-field__label">' + label + opt + "</label>" + control +
      (errId ? '<span class="ks-field__err" id="' + errId + '"></span>' : "") + "</div>";
  }

  /* ============================================================
     RENDER + EVENTS
     ============================================================ */
  function render() {
    var s = state.screen;
    var html;
    if (s === "admin") {
      html = modeBar() + (state.isAdmin ? adminScreen() : navBar() + '<main class="ks-main">' + loginScreen() + "</main>" + footer());
    } else {
      var body = s === "submit" ? submitScreen() : s === "card" ? cardScreen() : homeScreen();
      html = modeBar() + '<div class="ks-app">' + navBar() + '<main class="ks-main">' + body + "</main>" + footer() + "</div>";
    }
    app.innerHTML = html;
    requestAnimationFrame(icons);
    wireEvents();
    updateCountdown();
  }

  function wireEvents() {
    var s = state.screen;
    if (s === "submit") wireSubmit();
    if (s === "admin" && state.isAdmin) wireAdmin();
    if (s === "admin" && !state.isAdmin) wireLogin();
  }

  function wireSubmit() {
    var form = document.getElementById("msgForm");
    if (!form) return;
    var nameI = document.getElementById("f-name"), teamI = document.getElementById("f-team"),
        msgI = document.getElementById("f-message"), showI = document.getElementById("f-show"),
        countEl = document.getElementById("f-count");
    function syncCount() { if (countEl) countEl.textContent = (msgI.value.length) + " / 600"; }
    if (msgI) { msgI.addEventListener("input", function () { formState.message = msgI.value; syncCount(); }); syncCount(); }
    if (nameI) nameI.addEventListener("input", function () { formState.name = nameI.value; });
    if (teamI) teamI.addEventListener("input", function () { formState.team = teamI.value; });
    if (showI) showI.addEventListener("change", function () { formState.show = showI.checked; });

    bindDrop();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      document.getElementById("e-name").textContent = "";
      document.getElementById("e-message").textContent = "";
      var name = nameI.value.trim(), message = msgI.value.trim();
      var ok = true;
      if (!name) { document.getElementById("e-name").textContent = "Please add your name."; ok = false; }
      if (!message) { document.getElementById("e-message").textContent = "Please write a short message."; ok = false; }
      else if (message.length > 600) { document.getElementById("e-message").textContent = "Please keep it under 600 characters."; ok = false; }
      if (!ok) return;
      var btn = document.getElementById("f-submit");
      btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Sending…'; icons();
      store.add({ name: name, team: teamI.value.trim(), message: message, show: showI.checked, photo: formState.photo || null })
        .then(function () {
          var first = name.split(" ")[0];
          formState = { name: "", team: "", message: "", show: true, photo: null };
          app.querySelector(".ks-main").innerHTML = successScreen(first);
          requestAnimationFrame(icons);
          var aa = document.getElementById("addAnother");
          if (aa) aa.addEventListener("click", function () { render(); });
        })
        .catch(function (err) {
          console.error(err); btn.disabled = false; btn.innerHTML = '<i data-lucide="send"></i> Add my message'; icons();
          toast("Couldn't send — please try again.");
        });
    });
  }

  function bindDrop() {
    var zone = document.getElementById("dropZone");
    if (!zone) return;
    var input = document.getElementById("f-photo");
    var label = document.getElementById("dropLabel");
    var clear = document.getElementById("dropClear");
    function handleFile(file) {
      if (!file) return;
      compressImage(file).then(function (data) {
        formState.photo = data; zone.innerHTML = dropInner(); requestAnimationFrame(icons); bindDrop();
      }).catch(function () { toast("That image couldn't be read."); });
    }
    if (input) input.addEventListener("change", function () { handleFile(input.files[0]); });
    if (clear) clear.addEventListener("click", function () { formState.photo = null; zone.innerHTML = dropInner(); requestAnimationFrame(icons); bindDrop(); });
    if (label) {
      ["dragover", "dragenter"].forEach(function (ev) { label.addEventListener(ev, function (e) { e.preventDefault(); label.classList.add("is-over"); }); });
      ["dragleave", "drop"].forEach(function (ev) { label.addEventListener(ev, function (e) { e.preventDefault(); label.classList.remove("is-over"); }); });
      label.addEventListener("drop", function (e) { if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
    }
  }

  function wireLogin() {
    var form = document.getElementById("loginForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = document.getElementById("pw").value;
      var errBox = document.getElementById("loginErr");
      errBox.innerHTML = "";
      auth.login(pw).catch(function () {
        errBox.innerHTML = '<div class="ks-login__err">That password isn\'t right. Please try again.</div>';
        document.getElementById("pw").value = "";
      });
    });
  }

  function wireAdmin() {
    [].forEach.call(document.querySelectorAll(".ks-admin__nav button"), function (b) {
      b.addEventListener("click", function () { state.adminTab = b.getAttribute("data-tab"); render(); });
    });
    var logout = document.getElementById("logout");
    if (logout) logout.addEventListener("click", function () { auth.logout().then(function () { go("home"); }); });
    [].forEach.call(document.querySelectorAll(".ks-arow__btn[data-act]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-id"), act = b.getAttribute("data-act");
        if (act === "approve") store.update(id, { status: "approved" }).then(function () { toast("Message approved"); });
        else if (act === "hide") store.update(id, { status: "pending" }).then(function () { toast("Moved to pending"); });
        else if (act === "remove") { if (confirm("Remove this message permanently?")) store.remove(id).then(function () { toast("Message removed"); }); }
      });
    });
    var copy = document.getElementById("copyLink");
    if (copy) copy.addEventListener("click", function () {
      var inp = document.getElementById("shareLink");
      navigator.clipboard && navigator.clipboard.writeText(inp.value).then(function () { toast("Link copied"); }, function () { inp.select(); });
    });
  }

  /* ---------------- countdown ticker ---------------- */
  function updateCountdown() {
    var ms = Math.max(0, deadlineMs() - Date.now());
    var d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000),
        m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = v < 10 ? "0" + v : "" + v; }
    set("cd-d", d); set("cd-h", h); set("cd-m", m); set("cd-s", s);
    var nav = document.getElementById("navCount");
    if (nav) nav.textContent = d + "d " + h + "h " + m + "m";
  }
  var prevClosed = isClosed();
  setInterval(function () {
    updateCountdown();
    var closedNow = isClosed();
    if (closedNow !== prevClosed) { prevClosed = closedNow; render(); }
  }, 1000);

  /* ---------------- boot ---------------- */
  function boot() {
    state.screen = routeFromHash();
    state.booted = true;
    render();
    var splash = document.getElementById("splash");
    if (splash) { splash.classList.add("is-hidden"); setTimeout(function () { splash.remove(); }, 300); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
