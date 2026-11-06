# Wander-Poster

GPX-Routen als Poster und geografisches 3D-Höhenrelief.

Die produktive Web-App liegt vollständig in **`dist/`**. Dieser Ordner ist die maßgebliche Version und kann direkt auf den Webserver kopiert werden. Es gibt keine getrennten Lite-/Single-File-Builds und keinen Build-Schritt.

## Projektstruktur

- `dist/index.html` – Einstiegspunkt der Web-App
- `dist/css/` – Stylesheet
- `dist/js/` – JavaScript-Module, einschließlich OSM-/OpenTopoMap-Funktionen und 3MF-Export
- `dist/manifest.webmanifest`, `dist/sw.js`, `dist/web-icons/` – PWA und Offline-Unterstützung
- `src/` – bisherige Entwicklungsquellen/Referenz; Änderungen an der produktiven Anwendung erfolgen derzeit direkt in `dist/`

## Bereitstellung

Den **Inhalt** von `dist/` in das Document-Root der Subdomain kopieren. `index.html` muss direkt im Document-Root liegen. Die Anwendung benötigt keinen PHP- oder sonstigen Backend-Prozess.

HTTPS ist für die PWA-Installation und den Service Worker erforderlich.

## Funktionen und externe Dienste

- GPX-Import und Routenposter
- Mehrtagestouren und Urlaubsstatistik
- OpenStreetMap-Vorschläge über die Overpass API
- Kartenhintergrund mit OpenStreetMap oder OpenTopoMap
- PNG-/SVG-Export und geografischer 3MF-Export
- Offline-fähige Web-App; Kartenkacheln und Overpass-Abfragen benötigen eine Internetverbindung

Bei Kartenhintergründen sind die Quellenangaben und Nutzungsbedingungen der jeweiligen Anbieter einzuhalten. OpenStreetMap-Daten stehen unter ODbL; OpenTopoMap verwendet CC-BY-SA.

Vor einer öffentlichen Bereitstellung die Platzhalter in den rechtlichen Seiten unter `dist/` prüfen und anpassen.
