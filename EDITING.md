# Wild Care Website bearbeiten — Anleitung für Redakteur:innen

Diese Anleitung ist für Vereinsmitglieder ohne Programmiererfahrung, die
Texte, Bilder und Termine auf **wildcare.space** über den CMS-Editor
("Sveltia CMS") pflegen. Du brauchst dafür kein Programmieren zu können —
der Editor sieht aus wie ein Formular.

Kurzfassung, bevor du loslegst: **Sobald du auf „Speichern" klickst, wird
deine Änderung direkt live veröffentlicht.** Es gibt keinen Entwurfsmodus
und keine Rückfrage „bist du sicher?". Mehr dazu in Abschnitt 6 — bitte
einmal lesen, bevor du das erste Mal speicherst.

---

## 1. So öffnest du den Editor

Der Editor liegt unter **`wildcare.space/admin/`** (bzw. der lokalen
Testadresse, falls dir das jemand für einen Probelauf eingerichtet hat).

Aktuell ist der bequeme Login über GitHub (ein Klick, kein technisches
Vorwissen nötig) **noch nicht eingerichtet** — dafür fehlt noch ein kleiner
Baustein im Hintergrund (ein sogenannter „Auth-Worker"). Bis der fertig ist,
gibt es zwei Wege, dich einzuloggen:

- **„Work with Local Repository"** (empfohlen, wenn du dich unsicher
  fühlst): Du brauchst eine lokale Kopie (einen „Clone") dieses
  Git-Repositories auf deinem Rechner und den Chrome-Browser. Auf der
  Login-Seite von `/admin/` klickst du auf den Button **„Work with Local
  Repository"** und wählst im Dateidialog den Ordner deiner lokalen Kopie
  aus. Der Editor arbeitet dann direkt mit den Dateien auf deinem Rechner.
  Für diesen Weg brauchst du einmalig Hilfe von einer technisch versierten
  Person, die dir das Repository klont und Chrome einrichtet.
- **GitHub Personal Access Token (PAT)**: Alternativ kannst du dich mit
  einem persönlichen Zugriffstoken aus deinem GitHub-Konto anmelden. Auch
  das richtet man am besten einmal gemeinsam mit einer technisch
  versierten Person ein, da man dabei ein paar Berechtigungen richtig
  setzen muss.

Sprich also am besten einmal mit eurer technischen Ansprechperson, welcher
der beiden Wege für dich eingerichtet wird.

> **Hinweis für später:** Dieser Abschnitt wird überarbeitet, sobald der
> „Auth-Worker" fertig ist und ein normaler GitHub-Login-Button
> erscheint. Bis dahin gilt nur der oben beschriebene Weg.

---

## 2. Wie du Seiten bearbeitest

Im Editor findest du links die Rubrik **„Seiten"**. Dort liegt jede
Hauptseite der Website als ein einziges, bearbeitbares Formular:

- **Startseite**
- **Kontakt**
- **Über uns / Team**
- **Journal-Übersicht**
- **Montagskurs**
- **Mitmachen**

Jede dieser Seiten ist in klar benannte Abschnitte unterteilt, zum
Beispiel bei der Startseite: **„SEO & Vorschau"** (Titel und Beschreibung,
die z. B. bei Google und beim Teilen in Chats angezeigt werden),
**„Hero (Video)"**, **„Vier Haltungen"**, **„Was passiert bei uns"**,
**„Journal-Teaser"** und **„E-Mail-Anmeldung"**. Bei der Kontakt-Seite
heißen die Abschnitte entsprechend **„Hero"**, **„Kontaktformular"**,
**„Info-Spalte"**, **„Karte"** usw. — jede Seite hat ihre eigene,
passende Gliederung.

**Zweisprachigkeit:** Die meisten Textfelder gibt es doppelt — einmal
Deutsch, einmal Englisch (im Editor stehen beide Versionen eines Feldes
nebeneinander). Bitte trage beide Sprachen ein, sonst bleibt die englische
Fassung leer bzw. übernimmt automatisch den deutschen Text. Ein paar
wenige Felder sind bewusst **nicht** zweisprachig, weil sie technisch oder
sprachneutral sind — zum Beispiel die Uhrzeit oder Adresse im
Termin-Banner der Startseite, oder der Seitentitel/die Beschreibung unter
„SEO & Vorschau". Das ist normal, kein Fehler.

---

## 3. Wie du einen Journal-Artikel hinzufügst

Journal-Artikel liegen in der Rubrik **„Journal"** und sind einzelne
Dateien — jeder neue Beitrag ist ein neuer Eintrag, den du über **„Neuer
Journal-Beitrag"** (bzw. den „+"-Button) anlegst.

Wichtige Felder:

- **Sprachversionen** (`language_mode`): Hier legst du fest, in welchen
  Sprachen der Beitrag existiert:
  - **Deutsch** — nur eine deutsche Fassung
  - **Englisch** — nur eine englische Fassung
  - **Deutsch + Englisch** — beide Sprachen, du füllst beide Versionen
    der Textfelder aus
- **Titel** (und optional ein Titel mit `<br>` für Zeilenumbrüche, sowie
  ein eigener, kürzerer Titel für die Startseiten-Vorschau)
- **Datum** — bestimmt u. a. die Reihenfolge der Artikel
- **Status**: **„published"** (veröffentlicht, erscheint normal) oder
  **„coming_soon"** (wird als „bald verfügbar" angezeigt, z. B. wenn du
  den Artikel schon anlegen, aber noch nicht ganz fertigstellen willst)
- **Teaser** — der kurze Anreißertext, der auf der Übersichtsseite
  erscheint
- **Artikeltext** — der eigentliche Beitrag, als Markdown-Editor (du
  siehst eine Werkzeugleiste für Fett, Kursiv, Überschriften, Listen,
  Links usw. — du musst keine Markdown-Syntax auswendig kennen)

Optional gibt es außerdem einen Bereich **„Artikel-CTA"** für einen
Aufruf-Button am Ende des Artikels (Überschrift, Text, ein oder mehrere
Buttons). Das musst du **nicht** ausfüllen — lass diesen Bereich einfach
leer, wenn der Artikel keinen eigenen Button braucht.

---

## 4. Wie du einen Workshop hinzufügst

Workshops liegen in der Rubrik **„Workshops"**. Auch hier legst du über
den „+"-Button einen neuen Eintrag an.

Die wichtigsten Felder:

- **Slug/URL**: ein kurzes, URL-taugliches Kürzel für den Workshop, z. B.
  `cellular-touch`. Daraus entsteht automatisch die Adresse der
  Detailseite — aus `cellular-touch` wird `cellular-touch.html`. Verwende
  nur Kleinbuchstaben, Zahlen und Bindestriche, keine Leerzeichen oder
  Sonderzeichen.
- **Status**: `draft` (Entwurf, wird nirgends angezeigt), `upcoming`
  (kommend), `current` (läuft gerade) oder `past` (vorbei).

**Wichtig zu verstehen — du kannst einen Workshop in zwei Schritten
anlegen:**

1. **Nur die Basisangaben ausfüllen** (Titel, Untertitel, Kurzbeschreibung,
   Datum, Ort, Preis usw. im Bereich **„Programm-Karte"**, plus Status auf
   `upcoming` oder `current` setzen). Dann erscheint der Workshop **nur als
   Karte** auf der Programmseite — noch ohne eigene Detailseite zum
   Anklicken. Das ist völlig in Ordnung, wenn die Detailseite noch nicht
   fertig ist.
2. **Später die restlichen Felder ausfüllen**, sobald die Detailseite fertig
   werden soll: die Bereiche **„SEO"**, **„Hero"**, **„Praxis-Intro"** und
   **„Info-Karte"** müssen komplett ausgefüllt sein (mindestens Seitentitel,
   Hero-Überschrift, Überschrift bei „Praxis-Intro" und Titel bei
   „Info-Karte"). Erst dann wird automatisch eine eigene, klickbare
   Detailseite gebaut. Fehlt dort etwas, bleibt es bei der reinen
   Programm-Karte ohne Link.

Kurz gesagt: **Du musst nicht alles auf einmal ausfüllen.** Lege den
Workshop mit ein paar Basisangaben an (er erscheint dann nur als Karte),
und ergänze die restlichen Felder, sobald die Detailseite inhaltlich
fertig ist.

Weitere nützliche Felder: **Sprachversionen der Detailseite** (Deutsch
oder Englisch), **Startdatum** (für die Sortierung), **Anmeldelink** sowie
das Häkchen **„Detailseite veröffentlichen"** — ist es abgehakt (Standard),
gilt die Regel von oben; nimmst du das Häkchen weg, gibt es auch bei
vollständigen Angaben keine Detailseite.

---

## 5. Bilder hochladen

Wenn du im Editor ein Bildfeld ausfüllst, klickst du auf **„Bild
auswählen"** bzw. **„Choose an image"** und lädst eine Datei von deinem
Rechner hoch.

Technische Grenzen, die automatisch gelten:

- **Maximal 10 MB pro Datei** — größere Dateien werden abgelehnt.
- Hochgeladene Bilder werden automatisch in das platzsparende
  **WebP-Format** umgewandelt und auf maximal **2048 × 2048 Pixel**
  verkleinert. Du musst Bilder also nicht selbst vorher verkleinern oder
  konvertieren.

**Praktischer Tipp:** Lade wenn möglich Bilder **unter 5 MB** hoch — das
hält den Upload schnell und angenehm, gerade bei langsamerem Internet.
Ein normales Handyfoto reicht in der Regel locker aus; du brauchst keine
Profi-Kamera-Datei in voller Auflösung hochzuladen.

---

## 6. Was „Speichern" bedeutet

Das ist der wichtigste Punkt in dieser Anleitung, bitte genau lesen:

- Es gibt in diesem Editor **keinen Entwurfsmodus** und **keine
  Vorschau-vor-Veröffentlichung**. Sobald du auf **„Speichern"** klickst,
  wird deine Änderung direkt in die Website-Daten übernommen ("committed").
- Danach baut eine automatische Maschine (GitHub Actions) die Website neu
  und veröffentlicht sie — das passiert von selbst, du musst nichts
  weiter tun, aber es bedeutet: **deine Änderung geht danach automatisch
  live auf wildcare.space.**
- Es gibt **keine Sicherheitsabfrage** à la „bist du sicher, das ist nur
  ein Entwurf?" Ein Klick auf Speichern ist ein Klick auf „jetzt live
  stellen".

Das heißt nicht, dass du vorsichtig sein musst bei jedem Komma — kleine
Tippfehler lassen sich jederzeit korrigieren, einfach nochmal öffnen,
ändern, speichern. Aber bei größeren Änderungen (viel Text auf einmal
ersetzen, eine ganze Seite umbauen) lohnt es sich, dir kurz Zeit zu nehmen
und noch einmal durchzulesen, bevor du speicherst.

---

## 7. Wie der Verein eine Änderung rückgängig machen kann

Falls doch mal etwas schiefgeht — ein falscher Text ist live, ein
wichtiger Absatz wurde versehentlich gelöscht — lässt sich das rückgängig
machen. Realistisch braucht es dafür eine Person mit etwas technischer
Erfahrung; hier der Ablauf, den ihr gemeinsam durchgehen könnt:

1. Auf **github.com** das Repository der Website öffnen und in den
   **Commit-Verlauf** ("Commits") des Branches `html-site` schauen. Dort
   erscheint jede gespeicherte Änderung mit Zeitstempel — meist erkennt
   man die fragliche Änderung am Zeitpunkt oder am Dateinamen.
2. Den betreffenden Commit öffnen. Falls GitHub dort einen Button
   **„Revert"** anbietet, macht dieser die Änderung mit einem Klick
   rückgängig (GitHub erstellt automatisch einen Gegenklick-Commit).
3. Ist kein „Revert"-Button vorhanden (z. B. weil zwischenzeitlich weitere
   Änderungen gespeichert wurden), braucht ihr eine technisch versierte
   Person, die lokal `git revert <commit>` ausführt und den Branch wieder
   hochlädt (`push`).

**Praktisch heißt das:** Bestimmt am besten schon jetzt **eine feste
Ansprechperson** im Verein, die sich mit Git/GitHub auskennt (oder es sich
einmal zeigen lässt) — für den Fall der Fälle. Für die meisten von euch
reicht es zu wissen: *„Wenn etwas schiefgeht, sofort bei [Ansprechperson]
melden."*

---

## 8. Teamregel für sensible Seiten

Die Seite **„Mitmachen"** (Mitgliedschaft, Spenden, Anmeldungen) hängt
direkt mit echtem Geld und echten Anmeldungen zusammen. Ein Zahlendreher
im Mitgliedsbeitrag oder ein kaputter Anmeldebutton hat hier sofort
reale Auswirkungen — anders als ein Tippfehler in einem Journal-Artikel.

Deshalb als kleine, unkomplizierte Teamregel:

> **Bevor du eine Änderung an der Mitmachen-Seite speicherst, sag kurz in
> der Gruppen-Chat-Gruppe des Teams Bescheid** — z. B. „Ich ändere gerade
> den Text bei den Mitgliedschaftsstufen, schaut kurz mit drüber?" Wartet
> im Idealfall auf ein kurzes Okay von einer zweiten Person, bevor ihr auf
> „Speichern" klickt.

Das muss kein förmlicher Freigabeprozess sein — ein kurzes „passt so 👍"
im Chat reicht völlig. Wichtig ist nur: **bei dieser einen Seite schaut
lieber einmal mehr jemand drüber**, bevor die Änderung live geht.

---

*Diese Anleitung beschreibt den Stand der Sveltia-CMS-Einrichtung zum
Zeitpunkt der Erstellung. Wenn sich der Login-Weg (Abschnitt 1) oder der
Veröffentlichungs-Ablauf (Abschnitt 6) ändern, sollte diese Datei
entsprechend aktualisiert werden.*
