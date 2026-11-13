// A plain module, not a client export: the server layout must emit the actual
// script text in <head>, before the splash can paint or React can hydrate.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const artBase = JSON.stringify(`${basePath}/splash`);
const homePaths = JSON.stringify([basePath || "/", `${basePath}/`]);

export const SPLASH_GATE_SCRIPT = `(()=>{
  if(location.hash||!${homePaths}.includes(location.pathname)){
    document.documentElement.dataset.splash="seen";return;
  }
  try{
    if(document.documentElement.dataset.motion==="reduce"||matchMedia("(prefers-reduced-motion: reduce)").matches){
      document.documentElement.dataset.splash="seen";return;
    }
  }catch{document.documentElement.dataset.splash="seen";return;}
  try{
    if(sessionStorage.getItem("splash-seen")){
      document.documentElement.dataset.splash="seen";return;
    }
    sessionStorage.setItem("splash-seen","1");
  }catch{}
  const root=document.documentElement;
  root.dataset.splash="active";
  root.dataset.splashArt="loading";
  let timer;
  const fail=()=>{clearTimeout(timer);root.dataset.splash="seen";root.dataset.splashArt="failed";};
  try{
    timer=setTimeout(fail,8000);
    const variant=matchMedia("(max-aspect-ratio: 4/5)").matches?"tall":"wide";
    const assets=["grain.png",... ["print","cover","lg-lt","lg-rt","lg-lb","lg-rb"].map(name=>"print/"+name+"-"+variant+".webp")];
    const fonts=new Promise(resolve=>{
      const check=()=>{try{document.querySelector(".splash")?.getBoundingClientRect();Promise.resolve(document.fonts?.ready).then(resolve,resolve);}catch{fail();}};
      if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",check,{once:true});else check();
    });
    Promise.all([fonts,...assets.map(path=>{const image=new Image();image.src=${artBase}+"/"+path;return image.decode();})]).then(()=>{
      clearTimeout(timer);if(root.dataset.splash==="active")root.dataset.splashArt="ready";
    },fail);
  }catch{fail();}
})()`;
