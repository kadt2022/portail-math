import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import type { ExerciseVisual as ExerciseVisualData, ShapeName } from "./exercise-types";

function polar(angleDegrees: number, radius: number) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) };
}

export function AnalogClock({ hours, minutes }: { hours: number; minutes: number }) {
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const hourEnd = polar(hourAngle, 24);
  const minuteEnd = polar(minuteAngle, 36);
  return (
    <svg className={styles.clockFace} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" className={styles.clockRim} />
      {Array.from({ length: 12 }, (_, index) => {
        const position = polar((index + 1) * 30, 39);
        return (
          <text key={index} x={position.x} y={position.y + 3} textAnchor="middle" className={styles.clockNumber}>
            {index + 1}
          </text>
        );
      })}
      <line x1="50" y1="50" x2={hourEnd.x} y2={hourEnd.y} className={styles.clockHourHand} />
      <line x1="50" y1="50" x2={minuteEnd.x} y2={minuteEnd.y} className={styles.clockMinuteHand} />
      <circle cx="50" cy="50" r="3" className={styles.clockCenter} />
    </svg>
  );
}

const SHAPES: Record<ShapeName, ReactElement> = {
  square: <rect x="25" y="25" width="50" height="50" />,
  rectangle: <rect x="12" y="30" width="76" height="40" />,
  triangle: <polygon points="50,15 88,82 12,82" />,
  "right-triangle": <polygon points="20,18 20,82 84,82" />,
  cube: (
    <g>
      <rect x="18" y="38" width="44" height="44" />
      <polygon points="18,38 38,18 82,18 62,38" />
      <polygon points="62,38 82,18 82,62 62,82" />
    </g>
  ),
  cylinder: (
    <g>
      <ellipse cx="50" cy="24" rx="28" ry="10" />
      <path d="M22 24 V74 A28 10 0 0 0 78 74 V24" />
    </g>
  ),
  sphere: (
    <g>
      <circle cx="50" cy="50" r="34" />
      <ellipse cx="50" cy="50" rx="34" ry="11" fill="none" />
    </g>
  ),
  "parallel-lines": (
    <g>
      <line x1="10" y1="35" x2="90" y2="35" />
      <line x1="10" y1="65" x2="90" y2="65" />
    </g>
  ),
  "crossing-lines": (
    <g>
      <line x1="12" y1="20" x2="88" y2="80" />
      <line x1="12" y1="80" x2="88" y2="20" />
    </g>
  ),
  segment: (
    <g>
      <line x1="20" y1="50" x2="80" y2="50" />
      <circle cx="20" cy="50" r="3" />
      <circle cx="80" cy="50" r="3" />
    </g>
  ),
  line: (
    <g>
      <line x1="0" y1="50" x2="100" y2="50" />
      <polyline points="8,44 0,50 8,56" fill="none" />
      <polyline points="92,44 100,50 92,56" fill="none" />
    </g>
  ),
};

// Illustrations de questions : tout ce qui se lit (en-têtes, légendes, unités)
// vient de clés i18n ; les nombres restent du texte HTML accessible.
export function ExerciseVisual({ visual }: { visual: ExerciseVisualData }) {
  const { t } = useTranslation("primaryThree");

  switch (visual.kind) {
    case "table":
      return (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th scope="col">{t(visual.headerKeys[0])}</th>
              <th scope="col">{t(visual.headerKeys[1])}</th>
            </tr>
          </thead>
          <tbody>
            {visual.rows.map(([labelKey, value]) => (
              <tr key={labelKey}>
                <th scope="row">{t(labelKey)}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "pictogram":
      return (
        <div className={styles.pictogram} role="group" aria-label={t("exercise.visual.pictogram")}>
          <p>{t(visual.legendKey, { value: visual.unitValue })}</p>
          {visual.rows.map(([labelKey, count]) => (
            <div key={labelKey} className={styles.pictogramRow}>
              <span>{t(labelKey)}</span>
              <span className={styles.pictogramSymbols} aria-label={t("exercise.visual.symbolCount", { count })}>
                {Array.from({ length: count }, (_, index) => (
                  <i key={index} aria-hidden="true" />
                ))}
              </span>
            </div>
          ))}
        </div>
      );
    case "fraction-bars":
      return (
        <div className={styles.fractionBars}>
          {visual.bars.map((bar, barIndex) => (
            <div
              key={barIndex}
              className={styles.fractionBar}
              role="img"
              aria-label={t("exercise.visual.fractionBar", { shaded: bar.shaded, parts: bar.parts })}
            >
              {Array.from({ length: bar.parts }, (_, index) => (
                <span key={index} className={index < bar.shaded ? styles.fractionCellOn : styles.fractionCell} />
              ))}
            </div>
          ))}
        </div>
      );
    case "clock":
      return (
        <div role="img" aria-label={t("exercise.visual.clock", { hours: visual.hours, minutes: visual.minutes })}>
          <AnalogClock hours={visual.hours} minutes={visual.minutes} />
        </div>
      );
    case "rectangle":
      return (
        <figure className={styles.rectangleFigure} aria-label={t("exercise.visual.rectangle")}>
          <div className={styles.rectangleBox} />
          <figcaption>
            {visual.width} {t(visual.unitKey)} × {visual.height} {t(visual.unitKey)}
          </figcaption>
        </figure>
      );
    case "ruler":
      return (
        <div className={styles.rulerFigure} role="img" aria-label={t("exercise.visual.ruler", { from: visual.from, to: visual.to })}>
          <span className={styles.rulerTrace} style={{ left: `${visual.from * 7}%`, width: `${(visual.to - visual.from) * 7}%` }} />
          <div className={styles.rulerTicks}>
            {Array.from({ length: 14 }, (_, index) => (
              <span key={index}>{index}</span>
            ))}
          </div>
        </div>
      );
    case "shape":
      return (
        <svg className={styles.shapeFigure} viewBox="0 0 100 100" role="img" aria-label={t(`exercise.visual.shapes.${visual.shape}`)}>
          {SHAPES[visual.shape]}
        </svg>
      );
    default:
      return null;
  }
}
