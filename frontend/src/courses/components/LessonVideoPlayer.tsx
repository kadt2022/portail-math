import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./LessonVideoPlayer.module.css";

interface LessonVideoPlayerProps {
  src: string;
  title: string;
}

export function LessonVideoPlayer({ src, title }: LessonVideoPlayerProps) {
  const { t } = useTranslation("primaryOne");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    Promise.resolve(video.play()).catch(() => undefined);
  };

  if (failed) {
    return (
      <p className={styles.unavailable} role="status">
        {t("lessonVideo.unavailable")}
      </p>
    );
  }

  return (
    <figure className={styles.player}>
      <video
        ref={videoRef}
        className={styles.video}
        src={src}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        onError={() => setFailed(true)}
      />
      <figcaption className={styles.caption}>
        <span>{title}</span>
        <button type="button" className={styles.replay} onClick={replay}>
          {t("lessonVideo.replay")}
        </button>
      </figcaption>
    </figure>
  );
}
