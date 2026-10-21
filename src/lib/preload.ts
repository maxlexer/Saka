type Load = () => Promise<unknown>;

/** Starts a lazy chunk on intent (hover, focus, touch down). A failure is ignored here: opening retries the import. */
export const preloader = (load: Load) => () => void load().catch(() => {});

/** Loads a lazy chunk once the page has loaded and gone idle, so a first open is instant without adding to the first load. */
export function preloadWhenIdle(load: Load) {
  const run = preloader(load);
  const start = () => ("requestIdleCallback" in window ? requestIdleCallback(run) : setTimeout(run, 200));
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
