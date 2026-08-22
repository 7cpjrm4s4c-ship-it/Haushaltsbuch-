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

## Sparanlagen und Kontotransfers

`SavingsStore` ist die einzige schreibende Zustands- und Fachgrenze für operative Sparanlagen. Ein Konto besitzt einen Guthaben-Stichtag, eine regelmäßige Sparrate, ein Intervall sowie eine Rendite- oder Zinsannahme. `savingsTransfers` speichert einzelne Ein- und Auszahlungen mit stabiler ID.

Ein Transfer ist keine Einnahme und kein Verbrauch. Die Einzahlung vermindert den Hauptkontosaldo und erhöht dasselbe Sparkonto um denselben Betrag; die Auszahlung wirkt spiegelbildlich. Dadurch bleibt das Gesamtvermögen unverändert. Eine Auszahlung, die das verfügbare Sparkontoguthaben unterschreiten würde, wird abgewiesen.

Für die Hauptkonto-Sicht werden regelmäßige Sparraten als Fixkosten und einzelne Transfers als variable Bewegungen ausgewiesen. Einzahlungen auf eine Sparanlage erscheinen negativ, Auszahlungen von einer Sparanlage als positive Gutschrift. Der variable Monatswert ist der Nettowert aus gewöhnlichen variablen Ausgaben, einzelnen Einzahlungen und Auszahlungen. Die Kennzahl „Sparen“ kann beide Einzahlungsarten zusätzlich informativ zusammenfassen, ohne sie im Gesamtabfluss doppelt zu zählen.

Die Prognose erhält die Sparanlagen über den bestehenden Adapter. Damit bleiben operative Zustände, Fachberechnung und Darstellung getrennt. Die Schema-Version 9 normalisiert die Felder `savingsAccounts` und `savingsTransfers`; ältere Zustände werden mit leeren Listen weitergeführt. Backup-Version 10 sichert beide Domänen mit ab.

## CSV-Importgrenze

Der CSV-/TSV-Import übernimmt ausschließlich Haushaltspositionen und deren Monatswerte für die Typen `E`, `F`, `V`, `K` und `S`. Eine Position vom Typ `K` oder `S` ist dabei nicht mit einem Kreditvertrag oder einer Sparanlage verknüpft. Kreditverträge, Sparkonten und einzelne Kontotransfers werden über ihre zuständigen Fachbereiche verwaltet und nur durch das JSON-Backup vollständig gesichert und wiederhergestellt. Die herunterladbare CSV-Vorlage kennzeichnet nicht verknüpfte Kredit- und Sparbeispiele ausdrücklich, um Doppelbuchungen zu vermeiden.

## Rahmenkredite und Kreditbewegungen

Kredite verwenden die Typen `installment` (Ratenkredit) und `revolving` (Rahmenkredit). Bestehende Kredite ohne Typ werden durch State-Schema 10 deterministisch als Ratenkredit normalisiert. Ein Rahmenkredit besitzt zusätzlich einen Kreditrahmen und eine Zinstagebasis. Solange die Vertragsmethode unbekannt ist, wird `ACT/365` sichtbar als Annahme verwendet; alternativ sind `ACT/360` und `30E/360` auswählbar.

`CreditMovementStore` ist die einzige schreibende Grenze für `creditMovements`. Rahmenkredite unterstützen Abrufe und Rückzahlungen, Ratenkredite unterstützen operative Sondertilgungen. Jede Bewegung besitzt ein konkretes Buchungsdatum. Der Store verhindert Abrufe oberhalb des Kreditrahmens, Rückzahlungen oberhalb der offenen Schuld und Sondertilgungen oberhalb der Restschuld nach regulärer Monatsrate.

Rahmenkreditzinsen werden aus den zeitanteiligen Tagessalden berechnet und am Monatsende als Aufwand des Hauptkontos berücksichtigt. Sie erhöhen die Restschuld nicht. Ein Kreditabruf erhöht Hauptkonto und Schuld in gleicher Höhe; Rückzahlungen und Sondertilgungen vermindern Hauptkonto und Schuld. Diese Bewegungen erscheinen zur Nachvollziehbarkeit in der variablen Monatsansicht, werden jedoch nicht als gewöhnliche Konsumausgaben in den historischen variablen Prognosedurchschnitt aufgenommen. Reguläre Ratenkreditzahlungen bleiben analog zu regelmäßigen Sparraten in den Fixkosten.

Backup-Version 11 sichert Kreditverträge und Kreditbewegungen. Replace und Merge normalisieren beide Domänen gemeinsam, sodass verwaiste Bewegungen nicht übernommen werden. Neue produktive Datei `js/credit-movement-store.js` ist Bestandteil der versionierten PWA-App-Shell `hp-v32`.
