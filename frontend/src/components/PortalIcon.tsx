import type { ReactNode } from "react";

export type PortalIconName = "home" | "book" | "school" | "cap" | "file" | "library" | "game" | "progress" | "lock" | "info";

export function PortalIcon({ name, className }: { name: PortalIconName; className?: string }) {
  const paths: Record<PortalIconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" /></>,
    book: <><path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1v15" /></>,
    school: <><path d="M3 21h18M5 21V9l7-4 7 4v12M9 21v-5h6v5M12 2v4M10 3h4M8 11h1m6 0h1M8 14h1m6 0h1" /></>,
    cap: <><path d="m2 8 10-5 10 5-10 5L2 8Zm4 3v6c4 3 8 3 12 0v-6M22 8v8" /></>,
    file: <><path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6" /></>,
    library: <><path d="M3 4h4v17H3zM10 3h4v18h-4zM17 5l4-1 3 16-4 1zM4 8h2m5-1h2" /></>,
    game: <><path d="M7 7h10c3 0 4 3 5 9 1 5-3 6-6 1H8c-3 5-7 4-6-1 1-6 2-9 5-9ZM7 10v6M4 13h6M16 11h.1M19 14h.1" /></>,
    progress: <><path d="M4 20v-5h3v5M11 20v-9h3v9M18 20V6h3v14M3 10l6-5 5 2 6-5M17 2h3v3" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.1" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
