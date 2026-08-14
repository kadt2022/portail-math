export type CourseActionIconName =
  | "start"
  | "resume"
  | "review"
  | "not-started"
  | "in-progress"
  | "completed"
  | "view"
  | "next-lesson"
  | "next-module"
  | "return-to-modules"
  | "back"
  | "continue";

interface CourseActionIconProps {
  name: CourseActionIconName;
  className?: string;
}

function IconDrawing({ name }: Pick<CourseActionIconProps, "name">) {
  if (name === "start" || name === "resume" || name === "not-started" || name === "in-progress") {
    return <path d="m9 7 8 5-8 5V7Z" />;
  }

  if (name === "review" || name === "completed") {
    return (
      <>
        <path d="M19 8a7 7 0 1 0 1 5" />
        <path d="M19 4v4h-4" />
      </>
    );
  }

  if (name === "view" || name === "next-module" || name === "return-to-modules") {
    return (
      <>
        <rect x="5" y="5" width="5" height="5" rx="1" />
        <rect x="14" y="5" width="5" height="5" rx="1" />
        <rect x="5" y="14" width="5" height="5" rx="1" />
        <rect x="14" y="14" width="5" height="5" rx="1" />
      </>
    );
  }

  if (name === "back") {
    return (
      <>
        <path d="M19 12H6" />
        <path d="m11 7-5 5 5 5" />
      </>
    );
  }

  return (
    <>
      <path d="M5 12h13" />
      <path d="m13 7 5 5-5 5" />
    </>
  );
}

export function CourseActionIcon({ name, className }: CourseActionIconProps) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" focusable="false">
        <IconDrawing name={name} />
      </svg>
    </span>
  );
}
