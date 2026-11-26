import { links } from "./links";
import { mountMap, type PinSpec } from "./map";

const PILLARS: Record<string, string> = {
  journey: "One journey",
  border: "A border crossed",
  lives: "Lives transformed",
  belonging: "A search for belonging",
};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function initNav() {
  const nav = document.querySelector<HTMLElement>(".nav");
  const toggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
  const menu = document.querySelector<HTMLElement>("#site-menu");
  if (!nav || !toggle || !menu) return;

  const close = () => {
    nav.classList.remove("is-open");
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  const open = () => {
    nav.classList.add("is-open");
    menu.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    menu.querySelector<HTMLElement>("a")?.focus();
  };

  toggle.addEventListener("click", () => {
    if (menu.classList.contains("is-open")) close();
    else open();
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
    if (!menu.classList.contains("is-open") || event.key !== "Tab") return;
    const items = [...menu.querySelectorAll<HTMLElement>("a")];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.matchMedia("(min-width: 960px)").addEventListener("change", (event) => {
    if (event.matches) close();
  });
}

function initTheme() {
  const nav = document.querySelector<HTMLElement>(".nav");
  if (!nav) return;
  const sections = [...document.querySelectorAll<HTMLElement>("[data-nav-theme]")];
  const watcher = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      nav.dataset.theme = (visible.target as HTMLElement).dataset.navTheme || "light";
    },
    { rootMargin: "-12% 0px -68% 0px", threshold: [0, 0.2, 0.45] },
  );
  sections.forEach((section) => watcher.observe(section));

  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initKilometres() {
  const readout = document.querySelector<HTMLElement>("#km-readout");
  const bar = document.querySelector<HTMLElement>("#km-bar");
  if (!readout || !bar) return;
  const format = new Intl.NumberFormat("en-IN");
  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    readout.textContent = format.format(Math.round(progress * 10000));
    bar.style.transform = `scaleX(${progress})`;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

function initHeadlight() {
  const hero = document.querySelector<HTMLElement>(".hero");
  if (!hero || reduced || !window.matchMedia("(pointer: fine)").matches) return;
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    hero.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
}

function initTilt() {
  const figure = document.querySelector<HTMLElement>(".hero-cover");
  const image = figure?.querySelector<HTMLElement>("img");
  if (!figure || !image || reduced || !window.matchMedia("(pointer: fine)").matches) return;
  figure.addEventListener("pointermove", (event) => {
    const rect = figure.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    image.style.animation = "none";
    image.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 8}deg) rotate(-2.4deg)`;
  });
  figure.addEventListener("pointerleave", () => {
    image.style.transform = "";
  });
}

function renderJournal(
  journal: HTMLElement,
  article: HTMLElement,
  position: number,
  total: number,
  onStep: (direction: -1 | 1) => void,
) {
  const title = article.querySelector(".marker-title")?.textContent ?? "";
  const body = article.querySelector(".marker-body");
  const pillar = article.dataset.pillar ?? "";

  journal.replaceChildren();
  const top = el("div", "journal-top");
  top.append(
    el("p", "journal-km", `KM ${article.dataset.km ?? ""}`),
    el("p", "journal-count", `${position} of ${total}`),
  );

  const meta = el("p", "journal-meta");
  for (const bit of [article.dataset.place, article.dataset.when, article.dataset.chapter]) {
    if (bit) meta.append(el("span", "", bit));
  }

  const heading = el("h3", "journal-title", title);
  heading.id = "journal-title";
  heading.tabIndex = -1;

  const copy = el("div", "journal-copy");
  if (body) copy.append(body.cloneNode(true));

  const foot = el("div", "journal-foot");
  foot.append(el("p", "tag", PILLARS[pillar] ?? pillar));
  const nav = el("div", "journal-nav");
  const previous = el("button", "step", "Previous");
  previous.type = "button";
  previous.disabled = position <= 1;
  const next = el("button", "step", "Next");
  next.type = "button";
  next.disabled = position >= total;
  previous.addEventListener("click", () => onStep(-1));
  next.addEventListener("click", () => onStep(1));
  nav.append(previous, next);
  foot.append(nav);

  journal.append(top, meta, heading, copy, foot);
}

function initRoute() {
  const articles = [...document.querySelectorAll<HTMLElement>("[data-marker]")];
  const journal = document.querySelector<HTMLElement>("#journal");
  const svg = document.querySelector<SVGSVGElement>("#map");
  const host = document.querySelector<HTMLElement>("#pins");
  const filters = [...document.querySelectorAll<HTMLButtonElement>("[data-filter]")];
  if (!journal || !svg || !host || !articles.length) return;

  const pins: PinSpec[] = articles.map((article) => ({
    id: article.dataset.id ?? "",
    km: article.dataset.km ?? "",
    lat: Number(article.dataset.lat),
    lon: Number(article.dataset.lon),
    pillar: article.dataset.pillar ?? "",
    title: article.querySelector(".marker-title")?.textContent ?? "",
    place: article.dataset.place ?? "",
    nudge: article.dataset.nudge === "left" ? "left" : "right",
    dy: article.dataset.dy ?? "",
  }));

  let filter = "all";
  let current = "crossing";
  let map: ReturnType<typeof mountMap>;

  const visible = () => articles.filter((article) => filter === "all" || article.dataset.pillar === filter);

  const setFilter = (next: string) => {
    filter = next;
    filters.forEach((button) => {
      const on = button.dataset.filter === next;
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.classList.toggle("is-on", on);
    });
    map.filter(next);
    articles.forEach((article) => {
      const dim = next !== "all" && article.dataset.pillar !== next;
      article.classList.toggle("is-dim", dim);
    });
  };

  const show = (id: string, nextFilter?: string, fromUser = false) => {
    if (nextFilter) setFilter(nextFilter);
    const list = visible();
    const article = list.find((item) => item.dataset.id === id) ?? list[0];
    if (!article) return;
    current = article.dataset.id ?? current;
    const index = list.indexOf(article);
    renderJournal(journal, article, index + 1, list.length, (direction) => {
      const stepTo = list[index + direction];
      if (stepTo?.dataset.id) show(stepTo.dataset.id, undefined, true);
    });
    map.activate(current, fromUser);
    articles.forEach((item) => item.classList.toggle("is-current", item === article));
    if (!fromUser) return;
    journal.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 959px)").matches) {
      journal.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    }
  };

  map = mountMap(svg, host, pins, (id) => show(id, undefined, true));

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.filter ?? "all";
      const list = articles.filter((article) => next === "all" || article.dataset.pillar === next);
      const stay = list.some((article) => article.dataset.id === current);
      show(stay ? current : (list[0]?.dataset.id ?? current), next, false);
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.open;
      const pillar = button.dataset.pillar;
      if (!id) return;
      show(id, pillar, false);
      document.getElementById("route")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
  });

  document.getElementById("route")?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest("input, textarea")) return;
    event.preventDefault();
    const list = visible();
    const index = list.findIndex((article) => article.dataset.id === current);
    const stepTo = list[index + (event.key === "ArrowRight" ? 1 : -1)];
    if (stepTo?.dataset.id) show(stepTo.dataset.id, undefined, true);
  });

  const hash = location.hash.replace("#", "");
  const hashed = articles.find((article) => article.id === hash || article.dataset.id === hash);
  show(hashed?.dataset.id ?? "crossing");
}

function composeLetter(name: string, story: string) {
  return `${story.trim()}\n\n— ${name.trim()}\n\nWho are your people? A letter for Bullet and My People.`;
}

function initLetter() {
  const form = document.querySelector<HTMLFormElement>("#letter-form");
  const status = document.querySelector<HTMLElement>("#letter-status");
  const note = document.querySelector<HTMLElement>("#letter-note");
  const submit = form?.querySelector<HTMLButtonElement>("button[type='submit']");
  if (!form || !status || !submit) return;

  if (links.storyEmail && note) {
    note.textContent = "Your letter opens in an email, ready to send. Add a photo or a short voice note if you like.";
    submit.textContent = "Send your story";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const story = String(data.get("story") ?? "").trim();
    if (!name || !story) return;
    const letter = composeLetter(name, story);

    if (links.storyEmail) {
      const href = `mailto:${links.storyEmail}?subject=${encodeURIComponent("Who are your people")}&body=${encodeURIComponent(letter)}`;
      window.location.href = href;
      status.textContent = "Your email is open. Send it whenever you are ready.";
      return;
    }

    try {
      await navigator.clipboard.writeText(letter);
      status.textContent = "Copied. Keep it, or bring it to the wall at IGNCA. The public address will be added here.";
    } catch {
      status.textContent = letter;
    }
  });
}

function initNewsletter() {
  const form = document.querySelector<HTMLFormElement>("#newsletter-form");
  const status = document.querySelector<HTMLElement>("#newsletter-status");
  const input = form?.querySelector<HTMLInputElement>("input[type='email']");
  if (!form || !status || !input) return;

  try {
    const stored = localStorage.getItem("bamp-letter-email");
    if (stored) input.value = stored;
  } catch {
    /* private mode */
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = input.value.trim();
    if (!email) return;

    if (links.newsletter) {
      window.location.href = links.newsletter;
      return;
    }

    try {
      localStorage.setItem("bamp-letter-email", email);
    } catch {
      /* private mode */
    }
    status.textContent = "Saved on this device. The weekly letter opens before the December readings, and this page will send it once the list is connected.";
  });
}

function initActiveLink() {
  const linksInNav = [...document.querySelectorAll<HTMLAnchorElement>(".nav-links a")];
  const sections = linksInNav
    .map((link) => document.querySelector<HTMLElement>(link.getAttribute("href") ?? ""))
    .filter((section): section is HTMLElement => section !== null);
  const watcher = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = `#${(visible.target as HTMLElement).id}`;
      linksInNav.forEach((link) => {
        const on = link.getAttribute("href") === id;
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.25] },
  );
  sections.forEach((section) => watcher.observe(section));
}

document.getElementById("all-markers")?.removeAttribute("open");
initNav();
initTheme();
initKilometres();
initHeadlight();
initTilt();
initRoute();
initLetter();
initNewsletter();
initActiveLink();
