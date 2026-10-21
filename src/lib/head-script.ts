export const THEME_KEY = "saka.theme";

/** Runs before first paint. Light is the default. Dark only when the visitor chose it on this device. */
export const HEAD_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
