import ind from "./geo/ind.json";
import pak from "./geo/pak.json";
import bgd from "./geo/bgd.json";
import npl from "./geo/npl.json";
import btn from "./geo/btn.json";
import lka from "./geo/lka.json";
import { VIEW, project, smooth } from "./project";

const NS = "http://www.w3.org/2000/svg";

type Geo = {
  features: Array<{
    geometry: { type: string; coordinates: number[][][] | number[][][][] };
  }>;
};

export type PinSpec = {
  id: string;
  km: string;
  lat: number;
  lon: number;
  pillar: string;
  title: string;
  place: string;
  nudge: "left" | "right";
  dy: string;
};

const WAYPOINTS: Record<string, [number, number]> = {
  Lahore: [31.55, 74.34],
  Mysuru: [12.3, 76.64],
  Ahmedabad: [23.02, 72.57],
  Jodhpur: [26.24, 73.02],
  Jaipur: [26.91, 75.79],
  Guwahati: [26.14, 91.74],
};

function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function rings(geo: Geo): number[][][] {
  const geometry = geo.features[0]?.geometry;
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates as number[][][];
  return (geometry.coordinates as number[][][][]).flat();
}

function ringPath(ring: number[][]): string {
  return (
    ring
      .map(([lon, lat], index) => {
        const [x, y] = project(lon, lat);
        return `${index === 0 ? "M" : "L"}${x} ${y}`;
      })
      .join(" ") + " Z"
  );
}

function land(geo: Geo, parent: SVGGElement) {
  for (const ring of rings(geo)) {
    parent.append(svgEl("path", { d: ringPath(ring), class: "land" }));
  }
}

function pointOf(stops: Map<string, PinSpec>, id: string): [number, number] {
  const stop = stops.get(id);
  if (!stop) return [0, 0];
  return project(stop.lon, stop.lat);
}

function placeOf(name: keyof typeof WAYPOINTS): [number, number] {
  const [lat, lon] = WAYPOINTS[name];
  return project(lon, lat);
}

export function mountMap(
  svg: SVGSVGElement,
  host: HTMLElement,
  pins: PinSpec[],
  onPick: (id: string) => void,
) {
  svg.setAttribute("viewBox", `0 0 ${VIEW.w} ${VIEW.h}`);
  svg.replaceChildren();

  const grid = svgEl("g", { class: "graticule" });
  for (let lon = 68; lon <= 96; lon += 4) {
    const [x1, y1] = project(lon, LAT_EDGE.north);
    const [, y2] = project(lon, LAT_EDGE.south);
    grid.append(
      svgEl("line", {
        x1: String(x1),
        x2: String(x1),
        y1: String(y1),
        y2: String(y2),
      }),
    );
  }
  for (let lat = 8; lat <= 36; lat += 4) {
    const [x1, y] = project(LON_EDGE.west, lat);
    const [x2] = project(LON_EDGE.east, lat);
    grid.append(
      svgEl("line", { x1: String(x1), x2: String(x2), y1: String(y), y2: String(y) }),
    );
  }
  svg.append(grid);

  const earth = svgEl("g", { class: "earth" });
  for (const geo of [pak, ind, bgd, npl, btn, lka] as Geo[]) land(geo, earth);
  svg.append(earth);

  const byId = new Map(pins.map((pin) => [pin.id, pin]));
  const routes = svgEl("g", { class: "routes", fill: "none" });
  const before = smooth([
    pointOf(byId, "cousins"),
    pointOf(byId, "heera"),
    pointOf(byId, "ramesh"),
    placeOf("Lahore"),
    pointOf(byId, "crossing"),
  ]);
  const call = smooth([
    pointOf(byId, "call"),
    project(70.5, 29.5),
    pointOf(byId, "heera"),
  ]);
  const north = smooth([
    pointOf(byId, "crossing"),
    pointOf(byId, "amritsar"),
    pointOf(byId, "delhi"),
  ]);
  const yatra = smooth([
    pointOf(byId, "mother"),
    pointOf(byId, "kanyakumari"),
    pointOf(byId, "tamil"),
    placeOf("Mysuru"),
    pointOf(byId, "hampi"),
    pointOf(byId, "sindhanur"),
    placeOf("Ahmedabad"),
    pointOf(byId, "mehsana"),
    pointOf(byId, "water"),
    pointOf(byId, "canal"),
    pointOf(byId, "jaisalmer"),
    pointOf(byId, "shirt"),
    placeOf("Jodhpur"),
    placeOf("Jaipur"),
    pointOf(byId, "delhi"),
    placeOf("Guwahati"),
    pointOf(byId, "chakma"),
    pointOf(byId, "river"),
  ]);
  routes.append(svgEl("path", { d: before, class: "line-before" }));
  routes.append(svgEl("path", { d: call, class: "line-call" }));
  routes.append(svgEl("path", { d: north, class: "line-north" }));
  const yatraPath = svgEl("path", { d: yatra, class: "line-yatra" });
  routes.append(yatraPath);
  svg.append(routes);

  const names = svgEl("g", { class: "sea-names" });
  const sea: Array<[string, number, number]> = [
    ["Arabian Sea", 68.2, 15.2],
    ["Bay of Bengal", 89.2, 15.4],
    ["Himalaya", 80.6, 32.4],
  ];
  for (const [label, lon, lat] of sea) {
    const [x, y] = project(lon, lat);
    const text = svgEl("text", { x: String(x), y: String(y) });
    text.textContent = label;
    names.append(text);
  }
  for (const name of ["Lahore", "Mysuru", "Jodhpur", "Jaipur", "Guwahati"] as const) {
    const [x, y] = placeOf(name);
    names.append(svgEl("circle", { cx: String(x), cy: String(y), r: "2.2", class: "waypoint" }));
    const text = svgEl("text", { x: String(x + 7), y: String(y - 6), class: "waypoint-label" });
    text.textContent = name;
    names.append(text);
  }
  svg.append(names);

  host.replaceChildren();
  const buttons = new Map<string, HTMLButtonElement>();
  for (const pin of pins) {
    const [x, y] = project(pin.lon, pin.lat);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pin${pin.nudge === "left" ? " nudge-left" : ""}`;
    button.style.left = `${(x / VIEW.w) * 100}%`;
    button.style.top = `${(y / VIEW.h) * 100}%`;
    if (pin.dy) button.style.setProperty("--label-dy", pin.dy);
    button.dataset.id = pin.id;
    button.dataset.pillar = pin.pillar;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute(
      "aria-label",
      `Kilometre marker ${pin.km}: ${pin.title}, ${pin.place}`,
    );
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = pin.km;
    button.append(dot, num);
    button.addEventListener("click", () => onPick(pin.id));
    host.append(button);
    buttons.set(pin.id, button);
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const length = yatraPath.getTotalLength();
  if (!reduced && length > 0) {
    yatraPath.style.strokeDasharray = `${length}`;
    yatraPath.style.strokeDashoffset = `${length}`;
    const watch = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        yatraPath.style.strokeDashoffset = "0";
        watch.disconnect();
      },
      { threshold: 0.35 },
    );
    watch.observe(svg);
  }

  return {
    activate(id: string, reveal = false) {
      for (const [key, button] of buttons) {
        const on = key === id;
        button.setAttribute("aria-pressed", on ? "true" : "false");
        if (on && reveal) {
          button.scrollIntoView({ inline: "nearest", block: "nearest" });
        }
      }
    },
    filter(pillar: string) {
      for (const button of buttons.values()) {
        const dim = pillar !== "all" && button.dataset.pillar !== pillar;
        button.classList.toggle("is-dim", dim);
        button.tabIndex = dim ? -1 : 0;
        button.setAttribute("aria-hidden", dim ? "true" : "false");
      }
    },
  };
}

const LAT_EDGE = { north: 36.2, south: 6.2 };
const LON_EDGE = { west: 67.2, east: 97 };
