const STORAGE_THEME = "blue-intelligence-theme";

export type Theme = "dark" | "light";

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_THEME);
    if (t === "light" || t === "dark") return t;
  } catch {}
  return "dark";
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_THEME, theme);
  } catch {}
}
