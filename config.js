/* ============================================================
   KEEPSAKE — CONFIG
   ------------------------------------------------------------
   This is the ONLY file you normally need to touch.
   See SETUP.md for step-by-step instructions.
   ============================================================ */

window.KEEPSAKE_CONFIG = {

  /* ---- 1. FIREBASE ----------------------------------------
     Paste the config object from your Firebase project here.
     (Firebase console → Project settings → "Your apps" → SDK
     setup & configuration → Config.)
     Leave the apiKey blank to run in local DEMO mode.
  ---------------------------------------------------------- */
  firebase: {
    apiKey: "AIzaSyDY5Jkguq0KGLbegVx_9ERfa6wzHF1FTQY",
  authDomain: "keepsake-744b8.firebaseapp.com",
  projectId: "keepsake-744b8",
  storageBucket: "keepsake-744b8.firebasestorage.app",
  messagingSenderId: "349033705365",
  appId: "1:349033705365:web:4279d4cfee10241589109c"
  },

  /* ---- 2. ADMIN ----------------------------------------
     The email of the single admin user you create in
     Firebase → Authentication. The admin login asks for a
     password only; it signs in using this email behind the
     scenes. Your password is NEVER stored in this code —
     it lives securely in Firebase.
  ---------------------------------------------------------- */
  adminEmail: "precious.omorogbe@nhs.net",

  /* Your name — shown in the organiser area. */
  organiserName: "Precious Omorogbe",

  /* ---- 3. THE OCCASION ---------------------------------- */
  honoree: {
    firstName: "Michael",
    fullName:  "Michael Ihemadu",
    role:      "Assistant Service Manager · Health Visiting",
    team:      "Health Visiting"
  },
  deadline: "2026-07-01T13:00:00",   // submissions close (local time)

  /* ---- 3b. THE COLLECTION (optional) --------------------
     A link where colleagues can chip in towards a leaving
     gift. Paste your Monzo.me (or any payment) link below.
     Leave `url` blank to hide the contribution section.
  ---------------------------------------------------------- */
  gift: {
    url:   "https://monzo.me/paomorogbe?h=birQhl&account_type=personal",
    title: "Chip in for Michael's gift",
    blurb: "Alongside your message, you're warmly invited to contribute towards a leaving gift. Anything you can give is appreciated — there's no expected amount.",
    cta:   "Contribute via Monzo",
    note:  "Payments go securely to Precious Omorogbe via Monzo. Contributing is entirely optional."
  },

  /* ---- 4. DEMO MODE PASSWORD ----------------------------
     Only used when Firebase is not configured (preview).
     In a real deployment the real password is in Firebase.
  ---------------------------------------------------------- */
  demoPassword: "demo"
};
