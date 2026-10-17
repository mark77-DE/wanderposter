#!/usr/bin/env python3
"""Build script for Wander-Poster.  Usage:  python3 build.py

Reads everything from src/ and writes:
  dist/         multi-file web app for your own server (installable, works offline)
  dist-single/  two single HTML files
                  wander-poster-osm.html  all features (map backdrop, OSM suggestions)
                  wander-poster.html      without features that need external servers
                                          (for the Claude Artifact viewer)
Only the Python standard library is needed.
"""
import base64
import pathlib
import re
import shutil
import time

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
BUILD = time.strftime("%Y%m%d%H%M%S")

# order matters: later files use things defined by earlier ones
JS_FULL = [
    "00-fonts", "10-core", "20-track", "30-geometry", "31-render", "40-highlights",
    "50-osm", "55-vacation", "60-background", "61-map", "70-interaction", "80-controls", "90-export", "98-start",
]
# without the features that talk to other servers (stubs take their place)
JS_LITE = [
    "00-fonts", "10-core", "20-track", "30-geometry", "31-render", "40-highlights",
    "45-stubs", "55-vacation", "60-background", "70-interaction", "80-controls", "90-export", "98-start",
]


def read(path):
    return pathlib.Path(path).read_text(encoding="utf-8")


def write(path, text):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def b64(path):
    return base64.b64encode(pathlib.Path(path).read_bytes()).decode("ascii")


def js_source(name):
    """Return the source of one script; the font script is generated from the woff2 files."""
    if name == "00-fonts":
        text = read(SRC / "js" / "00-fonts.template.js")
        text = text.replace("__FONT_M__", b64(SRC / "fonts" / "BarlowCondensed-Medium.woff2"))
        text = text.replace("__FONT_S__", b64(SRC / "fonts" / "BarlowCondensed-SemiBold.woff2"))
        return text
    return read(SRC / "js" / f"{name}.js")


def feature_blocks(html, keep):
    """<!--FEATURE:selfhost--> ... <!--/FEATURE--> blocks stay or go."""
    pattern = re.compile(r"[ \t]*<!--FEATURE:selfhost-->\n(.*?)[ \t]*<!--/FEATURE-->\n", re.S)
    return pattern.sub(lambda m: m.group(1) if keep else "", html)


PWA_HEAD = """<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#1e3530">
<link rel="icon" href="web-icons/icon-192.png">
<link rel="apple-touch-icon" href="web-icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Wander-Poster">"""


def build_single(js_files, selfhost, out_name):
    html = read(SRC / "index.template.html")
    html = feature_blocks(html, selfhost)
    css = read(SRC / "css" / "style.css")
    js = "\n".join(js_source(n) for n in js_files)
    html = html.replace("<!--PWA_HEAD-->\n", "")
    html = html.replace("<!--CSS-->", "<style>\n" + css + "</style>")
    html = html.replace("<!--JS-->", "<script>\n(function(){\n'use strict';\n" + js + "\n})();\n</script>")
    write(ROOT / "dist-single" / out_name, html)


def build_multi():
    out = ROOT / "dist"
    if out.exists():
        shutil.rmtree(out)
    html = read(SRC / "index.template.html")
    html = feature_blocks(html, True)
    html = html.replace("<!--PWA_HEAD-->", PWA_HEAD)
    html = html.replace("<!--CSS-->", f'<link rel="stylesheet" href="css/style.css?v={BUILD}">')

    assets = ["./", "index.html", "manifest.webmanifest", f"css/style.css?v={BUILD}"]
    tags = []
    for name in JS_FULL:
        fname = "00-fonts.js" if name == "00-fonts" else f"{name}.js"
        write(out / "js" / fname, "'use strict';\n" + js_source(name))
        assets.append(f"js/{fname}?v={BUILD}")
        tags.append(f'<script src="js/{fname}?v={BUILD}"></script>')
    # installable app: service worker registration and share-sheet import run after everything else
    write(out / "js" / "99-pwa.js", "'use strict';\n" + read(SRC / "js" / "99-pwa.js"))
    assets.append(f"js/99-pwa.js?v={BUILD}")
    tags.append(f'<script src="js/99-pwa.js?v={BUILD}"></script>')
    html = html.replace("<!--JS-->", "\n".join(tags))
    write(out / "index.html", html)

    write(out / "css" / "style.css", read(SRC / "css" / "style.css"))
    shutil.copy(SRC / "pwa" / "manifest.webmanifest", out / "manifest.webmanifest")
    (out / "web-icons").mkdir(parents=True, exist_ok=True)
    for icon in (SRC / "pwa" / "icons").iterdir():
        shutil.copy(icon, out / "web-icons" / icon.name)
        assets.append(f"web-icons/{icon.name}")

    sw = read(SRC / "pwa" / "sw.template.js")
    sw = sw.replace("__BUILD__", BUILD)
    sw = sw.replace("__ASSETS__", "[" + ", ".join('"' + a + '"' for a in assets) + "]")
    write(out / "sw.js", sw)


if __name__ == "__main__":
    shutil.rmtree(ROOT / "dist-single", ignore_errors=True)
    build_single(JS_FULL, True, "wander-poster-osm.html")
    build_single(JS_LITE, False, "wander-poster.html")
    build_multi()
    print("Build", BUILD, "fertig:")
    for p in sorted((ROOT / "dist-single").iterdir()):
        print("  dist-single/" + p.name, p.stat().st_size // 1024, "KB")
    print("  dist/  (index.html, css/, js/, web-icons/, manifest.webmanifest, sw.js)")
