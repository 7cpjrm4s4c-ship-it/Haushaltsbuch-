/* Offline-PWA: vollständige App-Shell, sichere Updates und typgerechte Cache-Strategien. */
'use strict';

const CACHE_VERSION='hp-v22';
const APP_SHELL=[
  './','./index.html','./manifest.json','./favicon.ico','./icon-16.png','./icon-32.png','./apple-touch-icon.png','./icon-192.png','./icon-512.png',
  './css/tokens.css','./css/base.css','./css/components.css','./css/modules.css','./css/responsive.css',
  './js/app-core-state.js','./js/app-ui-state.js','./js/app-view-runtime.js','./js/app-dialog-runtime.js','./js/app-toast.js','./js/app-extension-registry.js','./js/state-schema.js','./js/data-management-store.js','./js/account-balance-store.js','./js/account-balance-ui.js','./js/booking-store.js','./js/category-store.js','./js/manager-ui-state.js','./js/position-store.js','./js/year-store.js','./js/refinements.js','./js/position-dialog-ui.js','./js/year-ui.js','./js/import-service.js','./js/import-state-store.js','./js/import-ui.js','./js/ui-polish.js','./js/compact-manager.js','./js/final-fixes.js','./js/category-manager-ui.js','./js/planning-events.js','./js/data-consistency.js','./js/dashboard-view.js','./js/forecast-engine.js','./js/loan-lifecycle.js','./js/credit-calculation.js','./js/loan-category-store.js','./js/loan-store.js','./js/loan-actions-controller.js','./js/credit-ui.js','./js/financial-events.js','./js/forecast-panel-registry.js','./js/forecast-state-store.js','./js/financial-events-loan-integration.js','./js/financial-events-ui.js','./js/forecast-scenarios.js','./js/forecast-goals.js','./js/forecast-decisions.js','./js/forecast-adapter.js','./js/forecast-view-model.js','./js/forecast-scenario-runner.js','./js/forecast-view-controller.js','./js/forecast-view-renderers.js','./js/forecast-view.js','./js/forecast-scenarios-ui.js','./js/forecast-goals-ui.js','./js/forecast-view-composer.js','./js/forecast-decisions-ui.js','./js/data-management-v2.js','./js/state-storage.js','./js/backup-store.js','./js/backup-manager.js','./js/app-extension-bindings.js','./js/app-shell-events.js','./js/pwa-runtime.js','./js/bootstrap.js'
];

function sameOrigin(request){return new URL(request.url).origin===self.location.origin;}
function isNavigation(request){return request.mode==='navigate'||request.destination==='document';}
function isCodeAsset(request){return ['script','style'].includes(request.destination);}
function isCacheFriendlyAsset(request){return ['image','font'].includes(request.destination);}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_VERSION).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE_VERSION).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigationResponse(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){const cache=await caches.open(CACHE_VERSION);cache.put('./index.html',response.clone());}
    return response;
  }catch(error){
    return (await caches.match(request))||(await caches.match('./index.html'))||Response.error();
  }
}

async function codeResponse(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){const cache=await caches.open(CACHE_VERSION);await cache.put(request,response.clone());}
    return response;
  }catch(error){
    return (await caches.match(request))||Response.error();
  }
}

async function cacheFriendlyResponse(request){
  const cached=await caches.match(request);
  const refresh=fetch(request).then(async response=>{
    if(response&&response.ok&&sameOrigin(request)){const cache=await caches.open(CACHE_VERSION);await cache.put(request,response.clone());}
    return response;
  }).catch(()=>null);
  if(cached){refresh.catch(()=>{});return cached;}
  return (await refresh)||Response.error();
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||!sameOrigin(request))return;
  if(isNavigation(request)){event.respondWith(navigationResponse(request));return;}
  if(isCodeAsset(request)){event.respondWith(codeResponse(request));return;}
  if(isCacheFriendlyAsset(request)){event.respondWith(cacheFriendlyResponse(request));return;}
  event.respondWith(fetch(request).catch(()=>caches.match(request).then(hit=>hit||Response.error())));
});
