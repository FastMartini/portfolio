// This must run synchronously in the exported head, before content can paint.
export const THEME_SCRIPT = `(()=>{let t="dark";try{const s=localStorage.getItem("portfolio-theme");if(s==="light"||s==="dark")t=s}catch{}document.documentElement.dataset.theme=t})()`;
