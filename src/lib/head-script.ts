export const THEME_KEY = "saka.theme";

/** Window property holding the failsafe timer, cleared by the intro once its timeline owns the reveal. */
export const INTRO_FAILSAFE = "sakaIntroFailsafe";

/**
 * Runs before first paint. Light is the default, dark only when the visitor chose it on this device.
 * A plain hard load of the home page (no hash, no query, motion allowed) gets the intro. The failsafe reveals
 * the page and announces the end even if no script bundle ever runs.
 */
export const HEAD_SCRIPT =
  `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` +
  `try{var d=document.documentElement,l=location;if(l.pathname==="/"&&!l.hash&&!l.search&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("intro-pending");window.${INTRO_FAILSAFE}=setTimeout(function(){d.classList.remove("intro-pending");dispatchEvent(new Event("saka:intro-end"))},7000)}}catch(e){}`;
