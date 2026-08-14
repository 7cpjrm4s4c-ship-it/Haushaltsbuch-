/* Navigations-Shell. Header bleibt dauerhaft sichtbar; Geometrie liegt im globalen UI-Vertrag. */
'use strict';
(function(){
  const bnav=document.getElementById('bnav'),slider=document.getElementById('bnavSlider');if(!bnav||!slider)return;
  function move(active){if(!active)return;const navRect=bnav.getBoundingClientRect(),btnRect=active.getBoundingClientRect();if(!navRect.width)return;slider.style.left=(btnRect.left-navRect.left)+'px';slider.style.width=btnRect.width+'px';}
  function snap(active){slider.style.transition='';move(active);}
  function init(){const active=bnav.querySelector('.bnav-btn.active');if(!active)return;slider.style.transition='none';move(active);requestAnimationFrame(()=>requestAnimationFrame(()=>{slider.style.transition='';}));}
  init();window.addEventListener('load',init,{once:true,passive:true});window.addEventListener('resize',()=>{const active=bnav.querySelector('.bnav-btn.active');slider.style.transition='none';requestAnimationFrame(()=>requestAnimationFrame(()=>{move(active);slider.style.transition='';}));},{passive:true});
  bnav.addEventListener('click',event=>{const button=event.target.closest('[data-v]');if(button)nav(button.dataset.v);},{passive:true});
  let dragging=false,startX=0,startLeft=0;
  bnav.addEventListener('touchstart',event=>{const button=event.target.closest('.bnav-btn');if(!button)return;startX=event.touches[0].clientX;startLeft=parseFloat(slider.style.left)||0;dragging=true;slider.style.transition='none';},{passive:true});
  bnav.addEventListener('touchmove',event=>{if(!dragging)return;const dx=event.touches[0].clientX-startX,rect=bnav.getBoundingClientRect();slider.style.left=Math.max(0,Math.min(rect.width-parseFloat(slider.style.width||60),startLeft+dx))+'px';},{passive:true});
  bnav.addEventListener('touchend',event=>{if(!dragging)return;dragging=false;const x=event.changedTouches[0].clientX;let best=null,bestDist=Infinity;for(const button of bnav.querySelectorAll('.bnav-btn')){const rect=button.getBoundingClientRect(),dist=Math.abs(x-(rect.left+rect.width/2));if(dist<bestDist){bestDist=dist;best=button;}}if(best?.dataset.v){snap(best);nav(best.dataset.v);}},{passive:true});
})();
