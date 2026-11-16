// A plain module, not a client export: the server layout must emit the actual
// script text in <head>, before the splash can paint or React can hydrate.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const homePaths = JSON.stringify([basePath || "/", `${basePath}/`]);

export const SPLASH_GATE_SCRIPT = `(()=>{
  if(${JSON.stringify(process.env.NODE_ENV === "development")}){
    const variant=new URLSearchParams(location.search).get("variant");
    if(["letterpress","trail-drawn","paper-fold","trail-sign"].includes(variant))document.documentElement.dataset.revealVariant=variant;
  }
  try{document.documentElement.dataset.motion=matchMedia("(prefers-reduced-motion: reduce)").matches?"reduce":"full"}catch{}
  if(document.documentElement.dataset.motion==="reduce"||location.hash||!${homePaths}.includes(location.pathname)){
    document.documentElement.dataset.splash="seen";return;
  }
  try{
    if(sessionStorage.getItem("splash-seen")){
      document.documentElement.dataset.splash="seen";return;
    }
    sessionStorage.setItem("splash-seen","1");
  }catch{}
  document.documentElement.dataset.splash="active";
})()`;
