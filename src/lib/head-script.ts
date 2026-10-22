export const THEME_KEY = "saka.theme";

/** Window property holding the failsafe timer, cleared by the intro once its timeline owns the reveal. */
export const INTRO_FAILSAFE = "sakaIntroFailsafe";

/** Set in sessionStorage once the intro has started, so it plays once per browser tab. */
export const INTRO_SEEN_KEY = "saka.introSeen";

/**
 * Runs before first paint. Every new tab starts light. A dark choice lasts for the tab, so reloads and returns keep it.
 * The first plain hard load of the home page in a tab (no hash, no query, motion allowed) gets the intro. Reloads and
 * returns in the same tab skip it. Blocked storage still plays it. The failsafe reveals
 * the page and announces the end even if no script bundle ever runs.
 */
export const HEAD_SCRIPT =
  `try{if(sessionStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` +
  `try{var d=document.documentElement,l=location,s;try{s=sessionStorage.getItem("${INTRO_SEEN_KEY}")}catch(e){}if(!s&&l.pathname==="/"&&!l.hash&&!l.search&&!matchMedia("(prefers-reduced-motion: reduce)").matches){try{sessionStorage.setItem("${INTRO_SEEN_KEY}","1")}catch(e){}d.classList.add("intro-pending");window.${INTRO_FAILSAFE}=setTimeout(function(){d.classList.remove("intro-pending");dispatchEvent(new Event("saka:intro-end"))},7000)}}catch(e){}`;
