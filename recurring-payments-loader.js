/* Lädt das Automatik-Modul erst nach dem Hauptskript der App. */
(function () {
  'use strict';
  const script = document.createElement('script');
  script.src = './recurring-payments.js';
  script.defer = true;
  document.head.appendChild(script);
})();
