/* Kompatibilität für gespeicherte Ansichten aus älteren Versionen. */
'use strict';

const loadBeforeViewMigration = load;
load = function loadWithViewMigration() {
  loadBeforeViewMigration();
  if (S.view === 'einstellungen') S.view = 'uebersicht';
};
