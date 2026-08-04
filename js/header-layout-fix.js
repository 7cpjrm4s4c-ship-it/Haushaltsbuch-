'use strict';
(function syncHeaderHeight(){
  const root=document.documentElement;
  const header=document.getElementById('appHeader');
  if(!header)return;

  let frame=0;
  const measure=()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      const rect=header.getBoundingClientRect();
      const height=Math.ceil(rect.bottom-Math.min(rect.top,0));
      if(height>0)root.style.setProperty('--app-header-height',`${height}px`);
    });
  };

  measure();
  requestAnimationFrame(measure);
  window.addEventListener('load',measure,{once:true});
  window.addEventListener('resize',measure,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(measure,180),{passive:true});
  window.visualViewport?.addEventListener('resize',measure,{passive:true});
  window.visualViewport?.addEventListener('scroll',measure,{passive:true});

  if('ResizeObserver' in window){
    const observer=new ResizeObserver(measure);
    observer.observe(header);
  }

  if(document.fonts?.ready)document.fonts.ready.then(measure).catch(()=>{});
})();
