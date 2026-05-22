# Nachlassnavi

**Webbasierte Nachlassverzeichnis-Anwendung der Kanzlei von Schoenebeck**

Live: [nachlassnavi.vonschoenebeck.de](https://nachlassnavi.vonschoenebeck.de)  
Code Manager: [nachlassnavi.vonschoenebeck.de/code_manager](https://nachlassnavi.vonschoenebeck.de/code_manager)

---

## Was ist Nachlassnavi?

Nachlassnavi ermöglicht es Mandanten der Kanzlei von Schoenebeck, strukturiert ein vollständiges Nachlassverzeichnis zu erstellen. Mandanten erhalten einen persönlichen Zugangscode und können alle relevanten Vermögenswerte und Verbindlichkeiten erfassen. Am Ende kann das Verzeichnis als PDF oder JSON exportiert werden.

**Erfassbare Kategorien:**
- Immobilien, Bankkonten, Wertpapiere, Fahrzeuge
- Versicherungen, Beteiligungen, Wertgegenstände
- Forderungen, Sonstiges, Verbindlichkeiten

Alle Daten werden **ausschließlich lokal im Browser** verarbeitet — keine Übertragung an Server.

---

## Technischer Aufbau

Die App ist eine **Single-Page HTML-Anwendung**, die aus mehreren Quelldateien zusammengebaut wird.

### Quelldateien (lokal, nicht direkt deployed)

| Datei | Inhalt |
|---|---|
| `np_head.html` | HTML-Kopf + vollständiges CSS |
| `np_body.html` | HTML-Body (Navigation, Formulare, alle Sektionen) |
| `np_script.js` | JavaScript (State, Formulare, Bewertung, PDF-Export) |
| `jspdf.min.js` | jsPDF-Bibliothek (lokal, kein CDN) |
| `plz_lookup.js` | Datenbank aller deutschen PLZ (01000–99999) |
| `build.py` | Build-Script: assembliert alle Teile zu `nachlasspilot.html` |

### Build-Prozess

```bash
cd /Users/carlschoenebeck/Library/CloudStorage/OneDrive-Personal/Nachlassnavi
python3 build.py
```

Erzeugt `nachlasspilot.html` (~632 KB), die dann als `index.html` auf GitHub Pages deployed wird.

### Deployed auf GitHub Pages

| Datei im Repo | Beschreibung |
|---|---|
| `index.html` | Die fertige App (= nachlasspilot.html nach build.py) |
| `codes.json` | Zugangscodes (wird vom Code Manager verwaltet) |
| `apple-touch-icon.png` | Home-Screen-Icon (180×180px, navy/gold) |
| `favicon-32.png` | Browser-Tab-Icon (32×32px) |
| `CNAME` | Custom Domain: `nachlassnavi.vonschoenebeck.de` |
| `code_manager/index.html` | Code Manager (= code_manager.html) |
| `code_manager/apple-touch-icon.png` | Code Manager Icon (180×180px, gold/navy) |

---

## Deployment

Änderungen an Quelldateien → neu bauen → auf GitHub hochladen:

```bash
# 1. Bauen
python3 build.py

# 2. Hochladen via GitHub API (PUT /contents/index.html)
# Token wird benötigt (siehe unten)
```

Das Deployment erfolgt über die **GitHub Contents API** (PUT-Request), nicht über git push.

---

## GitHub Token (PAT)

Ein **Fine-grained Personal Access Token** ist erforderlich für:
- Deployment der App (`index.html`, `code_manager/index.html`)
- Code Manager (lesen/schreiben von `codes.json`)

**Berechtigungen:** Contents: Read & Write (nur für Repository `nachlassnavi`)

> ⚠️ **Ablaufdatum: 20. Juni 2026** — dann muss ein neuer Token erstellt werden unter:  
> github.com → Settings → Developer settings → Fine-grained tokens

Der Token wird im Browser des Code Managers lokal gespeichert (`localStorage: np_cm_token`).

---

## Code Manager

Passwortgeschütztes Admin-Tool zur Verwaltung der Zugangscodes.

- **URL:** nachlassnavi.vonschoenebeck.de/code_manager
- **Passwort:** AvS.2903 (SHA-256 gehasht im Code)
- **Funktionen:** Codes erstellen, verlängern (+7 Tage), löschen, auf GitHub speichern
- **Codes-Datei:** `codes.json` im GitHub-Repo

---

## Domain & DNS

| Setting | Wert |
|---|---|
| DNS-Anbieter | Strato (über vonschoenebeck.de Paket) |
| DNS-Eintrag | CNAME `nachlassnavi` → `cvs-code23.github.io` |
| GitHub Pages | Custom Domain: `nachlassnavi.vonschoenebeck.de` |
| HTTPS | Enforced (Let's Encrypt via GitHub Pages) |

**Zukünftige Domain:** `nachlassnavi.ai` (bereits gekauft) — noch nicht aktiv.

---

## Lokale Icons

| Datei | Verwendung |
|---|---|
| `nachlassnavi_icon.png` | App-Icon 1024×1024 (navy, Haus, NN) |
| `nachlassnavi_cm_icon.png` | Code Manager Icon 1024×1024 (gold, Dokument) |
| `apple-touch-icon.png` | App iOS Home-Screen 180×180 |
| `favicon-32.png` | Browser-Tab 32×32 |
| `cm_apple-touch-icon.png` | Code Manager iOS Home-Screen 180×180 |

Icons werden mit Python/Pillow aus den 1024px-Quellen generiert.

---

## Browser-Datenspeicherung

| Key | Speicher | Inhalt |
|---|---|---|
| `np_v1` | localStorage | Gespeicherter Formularstand |
| `np_modal_seen` | localStorage | Willkommens-Modal einmalig zeigen |
| `np_keine_*` | localStorage | „Keine X vorhanden"-Flags |
| `np_cm_token` | localStorage | GitHub Token (Code Manager) |
| `np_auth` | sessionStorage | Gate-Authentifizierung |
| `np_client` | sessionStorage | Name des Mandanten |
