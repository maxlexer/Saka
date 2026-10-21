"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/head-script";
import { MoonIcon, SunIcon } from "./Icons";

const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const isDark = () => document.documentElement.dataset.theme === "dark";

function setDark(dark: boolean) {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  if (dark) root.dataset.theme = "dark";
  else delete root.dataset.theme;
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage can be blocked. The choice then lasts until the next page load.
  }
  window.setTimeout(() => root.classList.remove("theme-fade"), 500);
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button type="button" aria-label="Dark mode" aria-pressed={dark} onClick={() => setDark(!dark)} className="flex size-11 items-center justify-center">
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
