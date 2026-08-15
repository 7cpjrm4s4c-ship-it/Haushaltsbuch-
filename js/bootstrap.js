'use strict';

// App erst starten, nachdem Kern und Erweiterungen geladen wurden.
try { load(); } catch(e) { console.error('load() error:',e); }
try { render(); } catch(e) {
  const main=document.getElementById('main');
  if(main){
    main.replaceChildren();
    const message=document.createElement('div');
    message.className='card forecast-negative';
    message.textContent=`Start-Fehler: ${e.message}`;
    main.append(message);
  }
  console.error('boot render error:',e);
}
