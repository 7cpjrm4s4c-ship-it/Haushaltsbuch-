'use strict';
(function syncHeaderHeight(){
  const root=document.documentElement;
  const header=document.getElementById('appHeader');
  if(!header)return;

  const update=()=>{
    const height=Math.ceil(header.getBoundingClientRect().height);
    if(height>0)root.style.setProperty('--app-header-height',`${height}px`);
  };

  update();
  requestAnimationFrame(update);
  window.addEventListener('resize',update,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(update,120),{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(update).observe(header);
})();
