'use strict';

// App erst starten, nachdem Kern und Erweiterungen geladen wurden.
try { load(); } catch(e) { console.error('load() error:',e); }
try { render(); } catch(e) {
  document.getElementById('main').innerHTML='<div style="padding:20px;color:#f87171;font-family:Arial">Start-Fehler: '+e.message+'</div>';
  console.error('boot render error:',e);
}
