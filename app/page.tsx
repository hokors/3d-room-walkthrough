"use client";

import dynamic from "next/dynamic";

const RoomViewer = dynamic(() => import("@/components/RoomViewer"), {
  ssr: false,
  loading: () => (
    <main className="grid h-dvh w-screen place-items-center bg-neutral-950 text-white">
      <div className="flex items-center gap-3 text-sm" role="status">
        <span className="h-4 w-4 animate-spin rounded-full border border-white/25 border-t-white" />
        Loading room
      </div>
    </main>
  ),
});

export default function Home() {
  return <RoomViewer />;
}
