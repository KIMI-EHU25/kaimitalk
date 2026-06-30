# 楷米阅读 · Kaimitalk (front-end)

The web front-end for **楷米阅读 / Kaimitalk** — turn text, images, documents, or
audio in **any language** into a Simplified-Chinese translation plus spoken audio.

> This repository contains the **front-end only** (HTML / CSS / JS). The backend
> server, models, and all credentials are kept private.

## What's here

```
templates/        Page + partials (main menu, login, intro, phone, etc.)
static/css/       Styles (design tokens, main, login, phone, …)
static/js/        UI logic (auth, sessions, recording, network handling, …)
static/favicon.svg
```

## Features (UI)

- 📝 Text, 🖼️ image, 📄 document (Word / HTML / TXT / SRT), and 🎙️ audio input
- 🌍 30+ languages → Simplified Chinese
- 🔊 Natural Chinese voice playback with downloadable MP3
- 🔒 Strict CSP and anti-hijacking protections

## Notes

The templates are server-rendered (Jinja), so they reference the backend at
runtime (`{{ url_for(...) }}`, `{% include %}`). They are published here as
source for reference and are not a standalone static site.
