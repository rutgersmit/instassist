# InstAssist

Split landscape and panoramic photos into perfectly sized square segments for Instagram carousel posts.

All processing happens client-side in the browser — your photos never leave your device.

## Features

- **Drag & drop upload** — drop an image or click to browse
- **Adjustable segments** — split into 2–10 carousel slides
- **Vertical crop control** — drag to adjust which part of the image is kept
- **ZIP download** — all segments bundled into a single download
- **Installable PWA** — works offline after first visit
- **Privacy-first** — no server uploads, everything runs in-browser

## Tech Stack

- React 18 + Vite
- Tailwind CSS v4
- Canvas API for image processing
- JSZip + FileSaver for downloads

## Development

```bash
npm install
npm run dev
```

## Docker Deployment

```bash
docker build -t instassist .
docker run -d -p 8080:80 --name instassist --restart unless-stopped instassist
```

## License

MIT
