# Bullet and My People

A fast static site for the book. Vite builds plain HTML, CSS, and a small script. There is no framework on the page.

```bash
npm install
npm run dev
npm run build
```

`npm run build` writes the site to `dist/`. Netlify is set up to publish that folder.

The story form and the weekly letter are ready, and they wait for an address. Set `storyEmail` and `newsletter` in `src/links.ts` when those exist.
