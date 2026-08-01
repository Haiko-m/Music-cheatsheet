# Theory Desk

An interactive reference for music theory and music production, built around a piano
keyboard rather than sheet music. Scales, chords, progressions, identification,
harmonics, tuning, rhythm, mixing and arrangement — plus a small scratchpad that
exports MIDI.

Runs entirely in the browser. No build-time data, no back end, no tracking.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the built site locally
```

## Deploying to GitHub Pages

1. **Set your domain.** Edit `public/CNAME` and replace the placeholder with your
   domain, e.g. `theory.yourdomain.com`. If you are not using a custom domain,
   delete that file instead.
1. **Set the home link.** Near the top of `src/App.jsx`:

   ```js
   const HOME_URL = "https://example.com";   // where the top-left link goes
   const HOME_LABEL = "example.com";         // what it says
   ```

   Set `HOME_URL` to `""` to hide the link.
2. **Push to GitHub** on the `main` branch.
3. **Repo → Settings → Pages → Build and deployment → Source: GitHub Actions.**
4. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push
   to `main`. The first run takes about a minute.

### Custom domain DNS

For a subdomain such as `theory.yourdomain.com`, add one record at your DNS host:

| Type  | Name   | Value                  |
|-------|--------|------------------------|
| CNAME | theory | `YOURNAME.github.io.`  |

For an apex domain (`yourdomain.com`), add four `A` records instead:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

and optionally the matching `AAAA` records:

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

Then enter the domain under **Settings → Pages → Custom domain** and tick
**Enforce HTTPS** once the certificate has been issued (usually within an hour).

## Project layout

```
index.html                  page shell, title, favicon, meta tags
src/main.jsx                React entry point
src/App.jsx                 the entire application
src/index.css               Tailwind import
public/CNAME                your custom domain (edit or delete)
vite.config.js              base: "./" so it works at any path
```

`vite.config.js` uses relative asset paths, so the same build works from a custom
domain root and from `https://YOURNAME.github.io/theory-desk/` without changes.

## Notes

* Audio needs one user interaction before it starts — a browser rule, not a bug.
* MIDI export uses a Blob download; it works from a normal page, and can be blocked
  inside sandboxed iframes.
* No `localStorage` is used, so settings reset on reload by design.
