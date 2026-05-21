#!/usr/bin/env python3
"""
Nachlasspilot – Build Script
Assembliert die finale HTML-Datei aus den Einzelkomponenten.

Verwendung:
  python3 build.py

Ausgabe: nachlasspilot.html
"""
import os

files = {
    'jspdf.min.js': 'jsPDF-Bibliothek (lokal, kein CDN)',
    'plz_lookup.js': 'PLZ-Datenbank (alle deutschen PLZ 01000-99999)',
    'np_head.html': 'HTML-Kopf + vollständiges CSS',
    'np_body.html': 'HTML-Body (Navigation, Formulare, Sektionen)',
    'np_script.js': 'JavaScript (State, Formulare, Bewertung, PDF-Export)',
}

for fname, desc in files.items():
    if not os.path.exists(fname):
        print(f"FEHLER: {fname} nicht gefunden ({desc})")
        exit(1)

with open('jspdf.min.js') as f: JSPDF_JS = f.read()
with open('plz_lookup.js') as f: PLZ_JS = f.read()
with open('np_head.html') as f: HEAD = f.read()
with open('np_body.html') as f: BODY = f.read()
with open('np_script.js') as f: SCRIPT = f.read()

HTML = HEAD + BODY + "<script>\n" + JSPDF_JS + "\n" + PLZ_JS + "\n" + SCRIPT + "\n</script>\n</body>\n</html>"

output = 'nachlasspilot.html'
with open(output, 'w', encoding='utf-8') as f:
    f.write(HTML)

size = os.path.getsize(output)
print(f"✓ {output} erstellt ({size:,} Bytes / {size//1024} KB)")
print(f"  - {len(PLZ_JS):,} Bytes PLZ-Daten")
print(f"  - {len(SCRIPT):,} Bytes JavaScript")
