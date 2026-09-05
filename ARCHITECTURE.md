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

Rahmenkreditzinsen werden aus den zeitanteiligen Tagessalden berechnet. Das Feld `m` bezeichnet bei einem Rahmenkredit ab State-Schema 11 ausschließlich die monatliche Tilgung. Bei bestehenden Rahmenkrediten bleibt der gespeicherte Zahlenwert unverändert, wird nach der Migration aber als Tilgung interpretiert; die Belastung des Hauptkontos steigt entsprechend um die zusätzlich berechneten Zinsen. Die im ausgewählten Monat aufgelaufenen Zinsen und die vollständige Tilgung werden am 1. des Folgemonats verrechnet. Bis zu diesem Stichtag erhöht die geplante Tilgung den abrufbaren Rahmen nicht. Die UI weist deshalb den im ausgewählten Monat tatsächlich abrufbaren Betrag und den erst nach der Folgemonatszahlung verfügbaren Betrag getrennt aus. Die Tilgung wird nur in der letzten Periode auf die noch offene Schuld begrenzt; Zinsen erhöhen die Restschuld nicht. `paymentMode: principalPlusInterest` hält die Tilgungssemantik im normalisierten Zustand eindeutig fest. Die Gesamtzahlung aus Tilgung und Zinsen wird im tatsächlichen Zahlungsmonat dynamisch unter „Kredite“ in den Fixkosten ausgewiesen. Gespeicherte Ratenkreditpositionen und dynamische Rahmenkreditpositionen werden in derselben Fixkostengruppe „Kredite“ zusammengeführt.

State-Schema 12 korrigiert die in Schema 10 zu breite Altbestandsmigration: Ein noch nicht fachlich bestätigter, exakt „Rahmenkredit“ benannter Ratenkredit wird einmalig als Rahmenkredit übernommen. Der bisherige Startbetrag wird zum Kreditrahmen; Restschuld, Stichtag, Zinssatz und der als Tilgung gemeinte Monatsbetrag bleiben unverändert. Bestehende Sondertilgungen dieses Datensatzes werden als Rückzahlungen erhalten. `loanTypeConfirmed` macht die Migration idempotent und schützt später ausdrücklich als Ratenkredit gespeicherte Datensätze vor einer namensbasierten Umklassifizierung.

Ein Kreditabruf erhöht Hauptkonto und Schuld in gleicher Höhe; einzelne Rückzahlungen und Sondertilgungen vermindern Hauptkonto und Schuld. Nur diese operativen Bewegungen erscheinen zur Nachvollziehbarkeit in der variablen Monatsansicht. Sie werden nicht als gewöhnliche Konsumausgaben in den historischen variablen Prognosedurchschnitt aufgenommen. Reguläre Ratenkreditzahlungen bleiben analog zu regelmäßigen Sparraten in den Fixkosten.

Seit Backup-Version 11 werden Kreditverträge und Kreditbewegungen gemeinsam gesichert. Replace und Merge normalisieren beide Domänen gemeinsam, sodass verwaiste Bewegungen nicht übernommen werden. `js/credit-movement-store.js` bleibt Bestandteil der versionierten PWA-App-Shell.

## Einmalige Zahlungseingänge

`BookingStore` ist die Zustands- und Persistenzgrenze für variable Monatsbuchungen. State-Schema 11 ergänzt das Feld `direction` mit den Werten `expense` und `income`. Bestehende Buchungen ohne Buchungsart werden deterministisch als Ausgaben übernommen. Ein externer Zahlungseingang benötigt keine Ausgabenkategorie und ist weder einem Kredit noch einer Sparanlage zugeordnet. Er wird unter „Buchungen“ über „Variable Buchung erfassen“ mit der Buchungsart „Zahlungseingang“ angelegt.

Ein Zahlungseingang erhöht ausschließlich im angegebenen Monat die Einnahmen, den Monatssaldo und damit die Fortschreibung des Hauptkontos. Er vermindert keine Ausgaben, erscheint nicht erneut im Folgemonat und fließt nicht in den historischen Durchschnitt variabler Ausgaben ein. Die Prognose berücksichtigt bereits erfasste Zahlungseingänge genau einmal in ihrem Buchungsmonat.

Backup-Version 13 sichert die Buchungsart und die bestätigte Kreditart. Replace und Merge normalisieren Buchungen und Kredite über State-Schema 12. Die geänderten Produktivdateien sind Bestandteil der versionierten PWA-App-Shell `hp-v34`; es wurden keine neuen App-Shell-Dateien eingeführt.

Vor dem Update sollte ein JSON-Backup des bisherigen Zustands erstellt werden. Für einen Rollback auf eine ältere Laufzeit ist dieses Vorab-Backup zu verwenden: Eine Backup-Datei der Version 13 mit Zahlungseingängen oder migrierter Kreditart darf nicht in einer älteren Laufzeit wiederhergestellt werden, da diese Zahlungseingänge als Ausgaben beziehungsweise den Rahmenkredit erneut als Ratenkredit interpretiert.

## Mobile App-Shell und Navigation

Header und Navigations-Pill sind direkte Kinder von `body` und über `position: fixed` am Viewport verankert. Die Root-Elemente verwenden `overflow-x: clip`, damit insbesondere WebKit/iOS keinen zusätzlichen Scroll-Container erzeugt, der fixierte Shell-Elemente in den Dokumentfluss verschiebt. Der dekorative Body-Hintergrund besitzt keine feste Hintergrundebene und der Body keinen eigenen Positionierungskontext. Safe-Area-Abstand und Inhaltsreserve bleiben über `--sab`, `--nav-gap` und `--nav-reserve` definiert. Die geänderte App-Shell wird mit PWA-Cache `hp-v35` ausgeliefert.
