# Wander-Poster

GPX route as printable picture for canvas.

Aus einer GPX-Wanderung ein Poster für Leinwand (100/150/200 mm), Story, Feed und Quadrat erstellen.
Läuft komplett im Browser, es gibt keinen Server-Teil.

## Was liegt wo

| Ordner | Inhalt |
|---|---|
| `dist/` | **Fertig zum Hochladen** auf die Subdomain. Installierbare Web-App, läuft auch offline. Enthält alle Funktionen (Kartenhintergrund, OSM-Vorschläge). |
| `dist-single/wander-poster-osm.html` | Alles in einer Datei, alle Funktionen. Zum Weitergeben oder Ausprobieren. |
| `dist-single/wander-poster.html` | Einzeldatei ohne Funktionen, die fremde Server brauchen. Für den Claude-Artifact-Link. |
| `src/` | Der Quellcode (siehe unten). |
| `build.py` | Baut `dist/` und `dist-single/` aus `src/`. |

## Quellcode (`src/`)

- `index.template.html` – Seitenaufbau mit Platzhaltern
- `css/style.css` – Aussehen
- `js/` – der Code, in Reihenfolge der Nummern geladen:
  `00-fonts` Schrift (wird beim Build aus `fonts/*.woff2` erzeugt) · `10-core` Konstanten, Formate, Hilfsfunktionen ·
  `20-track` GPX lesen, Projektion · `30-geometry` Karten- und Profilgeometrie · `31-render` Zeichnen des Posters ·
  `40-highlights` Highlights, Gipfelerkennung · `50-osm` OpenStreetMap-Vorschläge · `60-background` Hintergrundbild ·
  `61-map` Kartenhintergrund (Kacheln) · `70-interaction` Ziehen, Route laden · `80-controls` Eingabefelder, Farben ·
  `90-export` PNG/SVG/Teilen · `98-start` Startcode · `99-pwa` Web-App-Anbindung (nur in `dist/`)
  `45-stubs` ersetzt `50-osm` und `61-map` in der Einzeldatei ohne Fremdserver-Funktionen.
- `pwa/` – `manifest.webmanifest`, `sw.template.js` (Service Worker), `icons/`

Nach Änderungen im Quellcode: `python3 build.py` (nur Python 3, keine weiteren Pakete).

## Einrichtung auf dem Plesk-Server (Linux)

Ziel: `https://wanderposter.example.com`, Ordner `/var/www/vhosts/example.com/wanderposter.example.com`.

**1. Subdomain anlegen (falls noch nicht geschehen)**
Plesk → *Websites & Domains* → *Subdomain hinzufügen* → `wanderposter`. Liegt die DNS-Zone von example.com in Plesk,
wird der DNS-Eintrag automatisch angelegt, sonst beim DNS-Anbieter einen A-Eintrag auf die Server-IP setzen.
Unter *Hosting-Einstellungen* der Subdomain prüfen, dass das **Stammverzeichnis (Document Root)**
`wanderposter.example.com` ist, also der oben genannte Ordner.
PHP wird nicht gebraucht, es ist eine reine Webseite aus statischen Dateien.

**2. HTTPS einrichten**
*wanderposter.example.com* → *SSL/TLS-Zertifikate* → *Let's Encrypt* (kostenloses Zertifikat holen).
Danach in den *Hosting-Einstellungen* die Weiterleitung von HTTP auf HTTPS aktivieren
(„Permanente SEO-sichere 301-Weiterleitung von HTTP auf HTTPS“). Ohne HTTPS lässt sich die App nicht installieren.

**3. Dateien hochladen**
Wichtig: den **Inhalt** des Ordners `dist/` hochladen, nicht den Ordner selbst. Danach muss
`index.html` direkt im Stammverzeichnis liegen, daneben `sw.js`, `manifest.webmanifest`, `css/`, `js/`, `icons/`.

- *Über Plesk:* *Dateien* → in den Ordner `wanderposter.example.com` wechseln → hochladen (z. B. `dist` als ZIP packen,
  hochladen, mit „Entpacken“ auspacken; dabei darauf achten, dass kein zusätzlicher Unterordner entsteht).
- *Über SFTP:* mit dem Benutzer des Abonnements verbinden und den Inhalt von `dist/` in den Ordner kopieren.
- *Per SSH als root:* nach dem Kopieren die Besitzer und Rechte an die der übrigen Dateien angleichen
  (vorher mit `ls -ld /var/www/vhosts/example.com/wanderposter.example.com` prüfen, dass der Ordner dem Abonnement-Benutzer gehört):

```bash
cd /var/www/vhosts/example.com/wanderposter.example.com
chown -R --reference=. .
find . -type d -exec chmod 755 {} +
find . -type f -exec chmod 644 {} +
```

**4. Testen**
`https://wanderposter.example.com` im Browser öffnen. Es erscheint die Beispielroute. Wenn nicht: im Plesk unter *Protokolle*
die Fehlermeldungen ansehen, und im Browser (F12 → Konsole / Netzwerk) prüfen, ob `js/…`-Dateien mit 404 fehlschlagen.
Das heißt meist, dass beim Hochladen ein Unterordner entstanden ist.

**5. Nur falls nötig: Dateityp der Manifest-Datei**
Meldet Chrome (F12 → *Anwendung* → *Manifest*) einen Fehler beim Manifest, fehlt dem Server der Dateityp für `.webmanifest`.
Dann in Plesk unter *Apache & nginx-Einstellungen* → *Zusätzliche nginx-Anweisungen* eintragen:

```nginx
location = /manifest.webmanifest { default_type application/manifest+json; }
```

(Keinen `types { … }`-Block verwenden: er würde alle anderen Dateitypen des Servers überschreiben.)
Wer den Apache ohne nginx-Proxy nutzt, schreibt stattdessen in eine `.htaccess`-Datei im Stammverzeichnis:
`AddType application/manifest+json .webmanifest`

**Updates:** `python3 build.py` ausführen, den neuen Inhalt von `dist/` über die alten Dateien kopieren.
Die App holt sich die neue Fassung beim nächsten Start selbst, manchmal erst nach einem zweiten Neuladen.

## Auf dem Handy installieren

- **Android (Chrome):** Seite öffnen, Menü → „App installieren“ bzw. „Zum Startbildschirm“.
  Danach taucht „Wander-Poster“ im Teilen-Menü auf: In Komoot oder Strava eine GPX teilen und die App wählen.
- **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“. GPX per Dateiauswahl laden.
- Der Knopf **„Teilen …“** unter Export öffnet das Teilen-Menü des Handys mit dem fertigen PNG (WhatsApp, Instagram, Facebook …).

## Hinweise

- **Kartenhintergrund:** Die Kacheln kommen von den Servern der Anbieter. Quellenangabe und Nutzungsregeln der Anbieter
  beachten; bei Social-Media-Formaten bleibt die Quellenangabe immer an. Wenn ein Anbieter keine CORS-Freigabe schickt,
  hilft eine eigene Proxy-URL (Stil „Eigene Kachel-URL“).
- **Schrift:** Barlow Condensed (SIL Open Font License), als Teilmenge eingebettet.
- Es wird nichts gespeichert und nichts hochgeladen. Die GPX-Datei bleibt im Browser.
