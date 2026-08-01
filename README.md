# Theory Desk

Interactive music-theory and production reference built with React, Vite, and Tailwind CSS.

## Publish with GitHub Pages

1. Create a GitHub repository, for example `theory-desk`.
2. Upload **all files and folders** from this package. Make sure the hidden `.github` folder is included.
3. Use `main` as the default branch.
4. Open the repository’s **Settings → Pages**.
5. Under **Build and deployment**, select **GitHub Actions** as the source.
6. Open **Actions** and wait for “Deploy Theory Desk to GitHub Pages” to finish.

The address will normally be:

```text
https://YOUR-USERNAME.github.io/theory-desk/
```

Every later push to `main` automatically rebuilds and republishes the app.

## Run locally

Install Node.js, open a terminal in this folder, then run:

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Project structure

- `src/App.jsx` — the original Theory Desk component
- `src/main.jsx` — mounts React
- `src/index.css` — Tailwind and global styles
- `vite.config.js` — build configuration for GitHub Pages
- `.github/workflows/deploy.yml` — automatic deployment

A JSX component cannot be uploaded as a standalone GitHub Pages file. Vite compiles the JSX and Tailwind classes into normal browser-ready HTML, CSS, and JavaScript.
