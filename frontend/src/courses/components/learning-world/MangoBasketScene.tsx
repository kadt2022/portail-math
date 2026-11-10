import { useState } from "react";
import type { DragEvent } from "react";
import { useTranslation } from "react-i18next";

import {
  getLearningEnvironmentDefinition,
  getLearningObjectDefinition,
} from "../../../assets/learning-world/catalog";
import type { MoveLearningObjectAction } from "./learning-world.types";
import { LearningObject } from "./LearningObject";
import styles from "./LearningWorld.module.css";
import { ObjectZone, setLearningObjectDragData } from "./ObjectZone";
import type { MangoBasketState, MangoZoneId } from "./mango-basket-engine";
import { MANGO_BASKET_IDS, MANGO_SOURCE_ID } from "./mango-basket-engine";

interface Selection {
  objectInstanceId: string;
  fromZoneId: MangoZoneId;
}

export interface MangoBasketSceneProps {
  state: MangoBasketState;
  onAction: (action: MoveLearningObjectAction) => void;
  onReset?: () => void;
}

export function MangoBasketScene({ state, onAction, onReset }: MangoBasketSceneProps) {
  const { t } = useTranslation("learningWorld");
  const [selection, setSelection] = useState<Selection | null>(null);
  const basketUrl = getLearningObjectDefinition("container.basket").assetUrl;
  const backgroundUrl = getLearningEnvironmentDefinition("environment.market").assetUrl;

  const activeSelection = selection && state.zones[selection.fromZoneId].some(
    (object) => object.instanceId === selection.objectInstanceId,
  )
    ? selection
    : null;

  const select = (objectInstanceId: string, fromZoneId: MangoZoneId) => {
    setSelection((current) =>
      current?.objectInstanceId === objectInstanceId ? null : { objectInstanceId, fromZoneId },
    );
  };

  const move = (selected: Selection, toZoneId: MangoZoneId) => {
    if (selected.fromZoneId === toZoneId) return;
    onAction({
      type: "move-object",
      objectInstanceId: selected.objectInstanceId,
      fromZoneId: selected.fromZoneId,
      toZoneId,
    });
  };

  const drop = (payload: string, toZoneId: MangoZoneId) => {
    try {
      const selected = JSON.parse(payload) as Selection;
      if (selected.objectInstanceId && selected.fromZoneId) move(selected, toZoneId);
    } catch {
      // Un dépôt extérieur ou mal formé est simplement ignoré.
    }
  };

  const renderObjects = (zoneId: MangoZoneId) =>
    state.zones[zoneId].map((object) => {
      const number = Number(object.instanceId.replace("mango-", ""));
      const selected = activeSelection?.objectInstanceId === object.instanceId;
      const dragStart = (event: DragEvent<HTMLButtonElement>) => {
        const nextSelection = { objectInstanceId: object.instanceId, fromZoneId: zoneId };
        setSelection(nextSelection);
        setLearningObjectDragData(event, JSON.stringify(nextSelection));
      };
      return (
        <LearningObject
          key={object.instanceId}
          instance={object}
          label={t(selected ? "scene.deselectMango" : "scene.selectMango", { number })}
          selected={selected}
          onSelect={() => select(object.instanceId, zoneId)}
          onDragStart={dragStart}
        />
      );
    });

  const zone = (zoneId: MangoZoneId, index?: number) => {
    const count = state.zones[zoneId].length;
    const label = zoneId === MANGO_SOURCE_ID ? t("scene.stock") : t("scene.basket", { number: index });
    return (
      <ObjectZone
        key={zoneId}
        label={label}
        countLabel={t("scene.mangoCount", { count })}
        decorationUrl={basketUrl}
        placeLabel={t("scene.placeIn", { zone: label })}
        canPlace={Boolean(activeSelection && activeSelection.fromZoneId !== zoneId)}
        onPlace={() => activeSelection && move(activeSelection, zoneId)}
        onDropObject={(payload) => drop(payload, zoneId)}
        featured={zoneId === MANGO_SOURCE_ID}
      >
        {renderObjects(zoneId)}
      </ObjectZone>
    );
  };

  const summary = [MANGO_SOURCE_ID, ...MANGO_BASKET_IDS]
    .map((zoneId, index) =>
      t("scene.summaryPart", {
        zone: zoneId === MANGO_SOURCE_ID ? t("scene.stock") : t("scene.basket", { number: index }),
        count: state.zones[zoneId].length,
      }),
    )
    .join(" · ");

  return (
    <section className={styles.sceneShell} aria-labelledby="mango-scene-title">
      <div className={styles.sceneHeading}>
        <div>
          <p>{t("scene.eyebrow")}</p>
          <h2 id="mango-scene-title">{t("scene.title")}</h2>
        </div>
        {onReset ? (
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => {
              setSelection(null);
              onReset();
            }}
          >
            {t("scene.reset")}
          </button>
        ) : null}
      </div>
      <p className={styles.sceneInstruction}>{t("scene.instruction")}</p>
      <div
        className={styles.sceneStage}
        style={{ backgroundImage: `linear-gradient(rgb(15 51 43 / 10%), rgb(15 51 43 / 28%)), url(${backgroundUrl})` }}
      >
        <div className={styles.sourceZone}>{zone(MANGO_SOURCE_ID)}</div>
        <div className={styles.basketGrid}>
          {MANGO_BASKET_IDS.map((basketId, index) => zone(basketId, index + 1))}
        </div>
      </div>
      <p className={styles.sceneSummary} aria-live="polite">{summary}</p>
    </section>
  );
}
