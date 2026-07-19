# Margaritas Restaurant Website

A single-page website for Margaritas Restaurant (Bayswater, Bloemfontein) — menu with
add-to-order cart, WhatsApp checkout, and a front-end login/signup flow.

## Project structure

```
margaritas-website/
├── index.html          # Main page markup
├── package.json        # Project metadata + local dev server script
├── src/
│   ├── styles.css       # All styles
│   └── script.js        # Cart, auth, nav/scroll behaviour
├── assets/
│   └── images/          # Site photography
└── README.md
```

## Running it locally

No build step — this is plain HTML/CSS/JS. Two options:

**Option A — Node (recommended if you have Node installed):**
```bash
npm install    # not strictly required, just sets things up
npm start
```
Then open `http://localhost:8080`.

**Option B — no Node required:**
Just double-click `index.html` to open it directly in a browser. Everything
works except that some browsers restrict `fetch`/module-style loading from
`file://` URLs — if anything looks off, use Option A or Option C instead.

**Option C — Python (if you don't have Node either):**
```bash
python3 -m http.server 8080
```

## Deploying

Since there's no build step, you can deploy this as-is to any static host:

- **Netlify / Vercel**: drag-and-drop the whole folder onto their dashboard, or connect a Git repo
- **GitHub Pages**: push this folder to a repo and enable Pages on the `main` branch
- **Traditional hosting**: upload the whole folder via FTP/cPanel — `index.html` should sit at the root of the domain (or subfolder) you want it served from

## Things to know

- **The WhatsApp number** is hardcoded in `src/script.js` (`WHATSAPP_NUMBER`) and used for
  both the cart checkout and the reservation buttons in `index.html`. Update it there if
  it ever changes.
- **Accounts are front-end only.** The sign up / login system runs entirely in the browser
  and resets on page refresh — there's no database. It's built to demonstrate the flow
  (and gates WhatsApp checkout behind login) but isn't persistent. For real customer
  accounts that survive across visits, you'd want a small backend — Firebase Auth or
  Supabase are the fastest way to add that without building a server from scratch.
- **Fonts** (Fraunces, Inter, JetBrains Mono) load from Google Fonts via the `<link>` tag
  in `index.html` — an internet connection is needed for them to render correctly.
