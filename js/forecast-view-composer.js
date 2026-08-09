/* Einzige Kompositionsschicht für Prognose-UI-Erweiterungen. */
'use strict';

(function(root){
  const baseView=root.vPrognose;
  if(typeof baseView!=='function')throw new TypeError('Basis-Prognoseansicht fehlt');

  function composeForecastView(){
    const html=baseView();
    const anchor='<section class="forecast-kpis">';
    const extensions=ForecastPanelRegistry.render('beforeKpis',undefined,{exclude:['financial-events']});
    if(!extensions)return html;
    return html.includes(anchor)?html.replace(anchor,extensions+anchor):html+extensions;
  }

  root.vPrognose=composeForecastView;
  root.vEinstellungen=composeForecastView;
})(typeof globalThis!=='undefined'?globalThis:window);
