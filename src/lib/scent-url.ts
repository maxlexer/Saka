/** The product modal lives in the URL as `?scent=<slug>`, so a perfume can be shared and Back closes it. */
export const SCENT_PARAM = "scent";

let pushed = false;

function urlWith(slug: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (slug) params.set(SCENT_PARAM, slug);
  else params.delete(SCENT_PARAM);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

export function openScent(slug: string) {
  pushed = true;
  window.history.pushState(null, "", urlWith(slug));
}

/** Goes back when we pushed the entry, so Back and Close leave the same history. A shared link just drops the parameter. */
export function closeScent() {
  if (pushed) {
    pushed = false;
    window.history.back();
  } else {
    window.history.replaceState(null, "", urlWith(null));
  }
}

/** The modal closed some other way (Back), so the next close must not go back again. */
export const scentClosed = () => {
  pushed = false;
};
