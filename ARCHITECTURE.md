# Architektur des Haushaltsbuchs

## Ziel

Die App bleibt eine kleine, private Browser-App ohne Server und ohne Build-System. Persönliche Finanzdaten werden ausschließlich im `localStorage` des verwendeten Geräts gespeichert und dürfen nicht in das Repository übernommen werden.

## Sinnvolle Aufteilung

```text
index.html                       Grundgerüst und Dialoge
css/app.css                      Darstellung und responsive Regeln
js/constants.js                  Monate, Typen und Standardkategorien
js/state.js                      zentraler Anwendungszustand
js/storage.js                    Laden, Speichern und Datenmigration
js/recurrence-engine.js          reine Intervall- und Anpassungsberechnung
js/finance.js                    Monats-, Jahres- und Kreditberechnungen
js/views.js                      Erzeugung der Ansichten
js/forms.js                      Eingabe- und Bearbeitungsdialoge
js/navigation.js                 Navigation und Bedienung
js/app.js                        Startreihenfolge
recurring-payments.js            vorübergehender Adapter für den Monolithen
tests/recurrence-engine.test.html Browser-Test ohne Zusatzsoftware
```

## Leitlinien

1. Keine Cloud-Datenbank und kein Benutzerkonto.
2. Keine echten Gehalts-, Renten-, Kredit- oder Kontodaten im Quellcode.
3. Manuelle Monatswerte haben Vorrang vor Regeln.
4. Wiederkehrende Regeln erzeugen keine zwölf Kopien, sondern werden bei der Berechnung ausgewertet.
5. Einkommensanpassungen gelten ab einem gewählten Monat bis zur nächsten Anpassung.
6. Bestehende Daten im Schlüssel `hp5` bleiben lesbar. Änderungen am Datenmodell erhalten eine Versionsnummer und eine Migration.
7. Exportdateien werden nur lokal erzeugt und nicht automatisch hochgeladen.

## Reihenfolge der Umstellung

Die Zerlegung erfolgt schrittweise, damit die funktionsfähige App nicht gleichzeitig vollständig neu geschrieben wird:

1. Berechnungslogik auslagern und testen.
2. Speicherung und Migration auslagern.
3. Ansichten und Formulare auslagern.
4. CSS in eine eigene Datei verschieben.
5. Den alten Inline-Code entfernen.

## Datenschutz

Das Repository sollte auf **privat** gestellt werden. Auch bei einem privaten Repository gehören persönliche Finanzwerte nicht in Commits, Issues oder Screenshots. Für Tests werden ausschließlich erfundene Werte verwendet.