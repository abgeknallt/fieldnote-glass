# Fieldnote Glass

**Personal image backgrounds for Google Search, with frosted glass cards.**

Fieldnote Glass is a lightweight Manifest V3 extension for Brave and Chromium browsers. Choose a background image, tune its blur and visibility, and Google's cards, answer panels, input bars and image-result surfaces become translucent frosted glass.

Version **1.0.0**

## Features

- First-run welcome screen with image picker and drag-and-drop
- JPG, PNG and WebP support (up to 20 MB input), resized and compressed in the browser
- Background fit, blur and visibility controls with live preview
- **Glass cards:** opaque Google panels become frosted glass; large layout containers and the sticky bottom bar become transparent
- Adjustable glass strength
- Toolbar popup for later adjustments
- Works with the welcome page opened as a plain file (falls back to `localStorage`, preview only)

## Install in Brave

1. Unzip the download.
2. Open `brave://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `fieldnote-glass` folder.
4. Choose an image on the welcome screen and click **Save my appearance**.
5. Open or refresh Google Search.

## Supported sites

- `https://www.google.com/*`
- `https://www.google.de/*`

Google changes its markup often. Glass cards are detected by their computed background rather than by Google's class names, so they keep working across layout updates.

## Privacy

Images are stored with `chrome.storage.local`. Nothing is uploaded; there are no analytics and no accounts.

## Development

Plain HTML, CSS and JavaScript. No build step or dependencies.

## License

MIT. See [LICENSE](LICENSE).
