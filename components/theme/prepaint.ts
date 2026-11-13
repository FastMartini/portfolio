// This must run synchronously in the exported head, before content can paint.
export const DEFAULT_THEME = "light" as const;
export const THEME_SCRIPT = `(()=>{let t=${JSON.stringify(DEFAULT_THEME)};try{const s=localStorage.getItem("portfolio-theme");if(s==="light"||s==="dark")t=s}catch{}document.documentElement.dataset.theme=t})()`;
