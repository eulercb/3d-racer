# APEX DRIFT

APEX DRIFT is an arcade racing game built with Vite and Three.js. Compete across three courses in a tournament, drift through corners to build boosts, and use items to get ahead. The game runs in a modern browser and can be installed as a PWA.

## Run locally

```sh
npm install
npm run dev
```

Vite prints the local URL when the development server starts. To create and serve a production build:

```sh
npm run build
npm run preview
```

Run the project's test suite with:

```sh
npm test
```

## Controls

- **Steer / accelerate / brake:** Arrow keys or WASD
- **Drift:** Space
- **Use item:** E or Shift
- **Pause:** Esc
- **Touch:** Use the on-screen controls on touch devices

The production service worker caches the app shell and same-origin assets for offline loading. Vite development module and HMR requests are left to the development server.

## Race craft

Choose **Grand Prix** for three consecutive races with points (10–8–6–4–2–1), or practice any selected track. VOLT balances speed and handling, COMET is faster but harder to place, and RIPTIDE favors tight lines. Hold drift while steering, then release after charging for a mini-turbo; longer drifts earn a stronger boost. Cyan road pads boost speed, rough shoulders slow you down, and colored side lanes hide risky shortcuts. Gold cubes grant Nitro, Shield, or Shock (slows nearby rivals ahead). Shields protect against rival contact.

## Browser checks

With the Vite development server running, `npm run test:browser` exercises keyboard input, drift release, items, tournament progression and mobile layout. With a production build served on port 4173, `npm run test:offline` checks offline reload. These use system Chromium (`/usr/bin/chromium`); set `CHROMIUM_PATH` for another installation. Simulation advances deterministically in the smoke test; it is not a frame-rate benchmark. PWA installation requires HTTPS or localhost.

## GitHub Pages deployment

Pushes to `main` run `.github/workflows/pages.yml`: install locked dependencies, test, build, and deploy `dist` to GitHub Pages. You can also run the workflow manually from Actions.

One-time repository/domain setup:

1. In **Settings → Pages**, select **GitHub Actions** as the build source.
2. Set the custom domain to **drift.zen.dev.br** in the same settings page. `public/CNAME` also preserves the domain in the build output; it does not configure Pages settings for an Actions deployment.
3. Add a DNS **CNAME** record for `drift.zen.dev.br` pointing to **eulercb.github.io** (without a path).
4. After GitHub verifies DNS and provisions the certificate, enable **Enforce HTTPS** so installation and service workers work.

The app uses root-relative asset and service worker URLs, appropriate for the custom domain. Access it at **https://drift.zen.dev.br/** once deployment and DNS setup complete.
