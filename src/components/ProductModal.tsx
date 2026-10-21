"use client";

const PARAM = "scent";
let pushed = false;

function urlWith(slug: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (slug) params.set(PARAM, slug);
  else params.delete(PARAM);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

/** Opens the product modal in place. The URL can be shared, and Back closes the modal. */
export function openScent(slug: string) {
  pushed = true;
  window.history.pushState(null, "", urlWith(slug));
}
