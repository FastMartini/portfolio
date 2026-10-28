export const THEME_STORAGE_KEY = "portfolio-theme";

// Runs before paint; the static HTML and unavailable storage both default dark.
export const THEME_INIT_SCRIPT = `(()=>{try{
  const theme=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  document.documentElement.dataset.theme=theme==="light"?"light":"dark";
}catch{}})()`;
