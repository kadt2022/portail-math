import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  LEARNING_ENVIRONMENT_CATALOG,
  LEARNING_OBJECT_CATALOG,
} from "../../assets/learning-world/catalog";
import { YambaGuide } from "../../courses/components/YambaGuide";
import { MangoBasketScene } from "../../courses/components/learning-world/MangoBasketScene";
import {
  applyMangoBasketAction,
  createMangoBasketState,
} from "../../courses/components/learning-world/mango-basket-engine";
import styles from "./MangoBasketPrototypePage.module.css";

export function MangoBasketPrototypePage() {
  const { t } = useTranslation("learningWorld");
  const [state, setState] = useState(createMangoBasketState);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p>{t("prototype.eyebrow")}</p>
        <h1>{t("prototype.title")}</h1>
        <span>{t("prototype.intro")}</span>
      </header>

      <YambaGuide compact name="Yamba" message={t("prototype.yamba")} />

      <MangoBasketScene
        state={state}
        onAction={(action) => setState((current) => applyMangoBasketAction(current, action))}
        onReset={() => setState(createMangoBasketState())}
      />

      <section className={styles.catalogSection} aria-labelledby="learning-object-catalog-title">
        <div>
          <h2 id="learning-object-catalog-title">{t("prototype.catalogTitle")}</h2>
          <p>{t("prototype.catalogIntro")}</p>
        </div>
        <div className={styles.objectGallery}>
          {Object.values(LEARNING_OBJECT_CATALOG).map((object) => (
            <figure key={object.id}>
              <img src={object.assetUrl} alt="" />
              <figcaption>{t(object.altKey)}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.catalogSection} aria-labelledby="learning-environment-catalog-title">
        <h2 id="learning-environment-catalog-title">{t("prototype.environmentTitle")}</h2>
        <div className={styles.environmentGallery}>
          {Object.values(LEARNING_ENVIRONMENT_CATALOG).map((environment) => (
            <figure key={environment.id}>
              <img src={environment.assetUrl} alt="" />
              <figcaption>{t(environment.altKey)}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
