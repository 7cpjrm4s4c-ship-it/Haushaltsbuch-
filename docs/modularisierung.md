# Schrittweise Zerlegung der App

## Zielstruktur nach Schritt 1

```text
index.html                 HTML-Grundgerüst
css/app.css                vollständiges bisheriges Inline-CSS
js/app.js                  vollständiges bisheriges Hauptskript
js/recurrence-engine.js    reine Intervall- und Anpassungslogik
recurring-payments.js      vorläufige Oberfläche der Automatisierung
tools/split-index.mjs      einmaliges, wiederholsicheres Migrationsskript
backup/index.monolith.html Sicherung des ursprünglichen Monolithen
```

## Ausführung

Voraussetzung ist Node.js ab Version 18.

```bash
npm run split:index
npm run check
```

Das Skript bricht ohne Änderung ab, wenn die Datei bereits zerlegt wurde oder wenn die erwarteten HTML-Blöcke fehlen. Vor jeder Änderung wird `backup/index.monolith.html` angelegt.

## Danach prüfen

1. `index.html` enthält `css/app.css` und `js/app.js`.
2. Dashboard, Ausgaben, Übersicht, Kredite, Einstellungen und Import öffnen.
3. Eine Testbuchung anlegen und die Seite neu laden.
4. PWA-Installation und Service Worker prüfen.
5. Erst danach die Änderungen in `main` übernehmen.

## Weitere Schritte

Nach erfolgreichem Browser-Test wird `js/app.js` schrittweise weiter getrennt:

1. `js/config.js`: Monate, Typen und Standardkategorien
2. `js/storage.js`: Laden, Speichern und Datenmigration
3. `js/calculations.js`: Monats- und Jahresberechnung
4. `js/views.js`: Ausgabe der Ansichten
5. `js/app.js`: Start, Navigation und Ereignisse

Für die private Nutzung bleiben alle persönlichen Finanzdaten im `localStorage` des jeweiligen Browsers. Sie gehören nicht in das Repository.
