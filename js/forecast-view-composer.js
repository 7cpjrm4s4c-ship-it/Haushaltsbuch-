/* Einzige Kompositionsschicht für Prognose-UI-Erweiterungen. */
'use strict';

(function(root){
  const baseView=root.vPrognose;
  if(typeof baseView!=='function')throw new TypeError('Basis-Prognoseansicht fehlt');

  function composeForecastView(){
    const html=baseView();
    const anchor='<div class="forecast-events-slot"></div>';
    const extensions=ForecastPanelRegistry.render('beforeKpis',undefined,{include:['financial-events']});
    if(!extensions)return html;
    return html.includes(anchor)?html.replace(anchor,extensions):html+extensions;
  }

  AppExtensionRegistry.registerView('einstellungen',composeForecastView,200);
})(typeof globalThis!=='undefined'?globalThis:window);
