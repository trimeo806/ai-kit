export const FONT_FAMILY = { hand: 5, sans: 2, mono: 3, code: 8 };

const FONT_PAIRS = {
  hand: { primary: FONT_FAMILY.hand, secondary: FONT_FAMILY.sans, mono: FONT_FAMILY.mono },
  code: { primary: FONT_FAMILY.code, secondary: FONT_FAMILY.code, mono: FONT_FAMILY.mono },
  sans: { primary: FONT_FAMILY.sans, secondary: FONT_FAMILY.sans, mono: FONT_FAMILY.mono },
};

const LIGHT = {
  name: "light",
  bg: "#ffffff",
  ink: "#1e1e1e",
  muted: "#495057",
  faint: "#868e96",
  panel: "#f8f9fa",
  panelStroke: "#adb5bd",
  divider: "#dee2e6",
  fills: {
    shape: "transparent",
    service: "#ffd8a8",
    database: "#ffec99",
    client: "#e9ecef",
    person: "#ffc9c9",
    window: "#ffffff",
    bar: "#1e1e1e",
    externalBar: "#dee2e6",
    stripe: "#fcc419",
    note: "#fff3bf",
    noteStroke: "#f08c00",
    badge: "#ffec99",
    badgeMuted: "#e9ecef",
    store: "#c3fae8",
    storeStroke: "#0c8599",
    messaging: "#d0bfff",
    cache: "#99e9f2",
    bucket: "#b2f2bb",
    function: "#a5d8ff",
  },
  series: {
    fills: ["#a5d8ff", "#d0bfff", "#b2f2bb", "#ffd8a8", "#c3fae8", "#eebefa", "#fff3bf", "#ffc9c9"],
    strokes: ["#1971c2", "#6741d9", "#2f9e44", "#e8590c", "#0c8599", "#9c36b5", "#f08c00", "#e03131"],
  },
};

const DARK = {
  name: "dark",
  bg: "#121212",
  ink: "#e9ecef",
  muted: "#adb5bd",
  faint: "#868e96",
  panel: "#1c1c1c",
  panelStroke: "#495057",
  divider: "#343a40",
  fills: {
    shape: "transparent",
    service: "#5c3d1a",
    database: "#5c4f1a",
    client: "#2b2f33",
    person: "#5c1a2a",
    window: "#1c1c1c",
    bar: "#e9ecef",
    externalBar: "#495057",
    stripe: "#fcc419",
    note: "#3b3415",
    noteStroke: "#f59f00",
    badge: "#5c4f1a",
    badgeMuted: "#343a40",
    store: "#1a4d4d",
    storeStroke: "#3bc9db",
    messaging: "#3b2a6b",
    cache: "#164a52",
    bucket: "#1a4d2e",
    function: "#1e3a5f",
  },
  series: {
    fills: ["#1e3a5f", "#2d1b69", "#1a4d2e", "#5c3d1a", "#1a4d4d", "#4a1a4d", "#5c4f1a", "#5c1a1a"],
    strokes: ["#74c0fc", "#b197fc", "#8ce99a", "#ffa94d", "#66d9e8", "#e599f7", "#ffd43b", "#ff8787"],
  },
};

const THEMES = { light: LIGHT, dark: DARK };

export function resolveTheme(name = "light", font = "hand") {
  const base = THEMES[name];
  if (!base) throw new Error(`unknown theme "${name}" (use: ${Object.keys(THEMES).join(", ")})`);
  const pair = FONT_PAIRS[font];
  if (!pair) throw new Error(`unknown font "${font}" (use: ${Object.keys(FONT_PAIRS).join(", ")})`);
  return { ...base, fontName: font, font: pair };
}
