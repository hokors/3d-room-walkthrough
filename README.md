# Room Walkthrough

A production-ready Next.js App Router viewer for exploring a GLB room model in first person.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click the 3D view, then use WASD or the arrow keys to move. Hold Shift to sprint and press Escape to release the mouse.

## Model

The viewer loads `public/room.glb`. Replace that file with another GLB using the same filename to update the room.

## Deploy to Vercel

Import the repository in Vercel and deploy with the detected Next.js defaults. No environment variables or custom build settings are required.

## Structure

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  RoomViewer.tsx
public/
  room.glb
```
