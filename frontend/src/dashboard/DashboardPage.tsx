import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { PRIMARY_COURSES } from "../app/course-navigation";
import { PortalIcon, type PortalIconName } from "../components/PortalIcon";
import childrenArt from "../../../src/main/resources/static/images/enfants-revision.webp";
import yambaHead from "../assets/yamba-head.jpg";
import libraryArt from "../assets/dashboard/library.webp";
import controllerArt from "../assets/dashboard/controller.webp";
import progressArt from "../assets/dashboard/progress.webp";
import exetatArt from "../assets/dashboard/exetat.webp";
import gamesArt from "../assets/dashboard/games-afro-canadiens-v2.webp";
import { HowToUse } from "./HowToUse";
import styles from "./DashboardPage.module.css";

// "1re primaire" devient un grand "1re" surmontant "primaire" : le nom accessible reste la phrase complète.
function LevelName({ label }: { label: string }) {
  const [number, ...cycle] = label.split(" ");
  return (
    <span className={styles.levelName}>
      <span className={styles.levelNumber}>{number}</span>
      <span className={styles.levelCycle}>{cycle.join(" ")}</span>
    </span>
  );
}

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { t: common } = useTranslation("common");
  const features: { id: string; to: string; icon: PortalIconName; art: string }[] = [
    { id: "library", to: "/bibliotheque", icon: "book", art: libraryArt },
    { id: "play", to: "/jeux", icon: "game", art: controllerArt },
    { id: "progress", to: "/progression", icon: "progress", art: progressArt },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.topGrid}>
        <section className={styles.pathways} aria-labelledby="pathways-title">
          <div className={styles.sectionHeading}>
            <span className={`${styles.iconBadge} ${styles.orange}`}><PortalIcon name="book" /></span>
            <div>
              <h1 id="pathways-title">{t("home.title")}</h1>
              <p>{t("home.description")}</p>
            </div>
          </div>
          <div className={styles.cycles}>
            <section className={styles.primary} aria-labelledby="primary-title">
              <div className={styles.cycleHeading}>
                <PortalIcon name="school" />
                <div><h2 id="primary-title">{t("home.primary.title")}</h2><p>{t("home.primary.description")}</p></div>
              </div>
              <div className={styles.levelGrid}>
                {PRIMARY_COURSES.map((course) => course.availability === "available" ? (
                  <Link key={course.id} to={course.route} className={styles.level}>
                    <LevelName label={t(`home.primary.level${course.level}`)} />
                    <span className={styles.levelFooter}>
                      <span className={styles.levelAction}>{t("home.start")}</span>
                      <span className={styles.levelArrow} aria-hidden="true">→</span>
                    </span>
                  </Link>
                ) : (
                  <div key={course.id} className={`${styles.level} ${styles.locked}`} aria-disabled="true">
                    <LevelName label={t(`home.primary.level${course.level}`)} /><small>{common("courseNavigation.comingSoon")}</small>
                  </div>
                ))}
              </div>
            </section>
            <section className={styles.secondary} aria-labelledby="secondary-title">
              <div className={styles.cycleHeading}>
                <PortalIcon name="cap" />
                <div><h2 id="secondary-title">{t("home.secondary.title")}</h2><p>{t("home.secondary.description")}</p></div>
              </div>
              <div className={styles.levelGrid}>
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <div key={level} className={`${styles.level} ${styles.locked}`} aria-disabled="true">
                    <LevelName label={t(`home.secondary.level${level}`)} /><small>{common("courseNavigation.comingSoon")}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <Link to="/parcours-libre" className={styles.freePath}>
            <span className={styles.freePathBadge}><PortalIcon name="cap" /></span>
            <div className={styles.freePathCopy}>
              <h2>{t("home.freePath.title")}</h2>
              <p>{t("home.freePath.description")}</p>
              <span className={styles.freePathTags} aria-hidden="true"><b>GRE</b><b>EXETAT</b></span>
            </div>
            <strong className={styles.freePathAction}>{t("home.freePath.action")} →</strong>
          </Link>
        </section>

        <section className={styles.welcome} aria-labelledby="welcome-title">
          <img className={styles.children} src={childrenArt} alt="" fetchPriority="high" />
          <div className={styles.welcomeContent}>
            <p className={styles.eyebrow}>{t("home.welcome.eyebrow")}</p>
            <div className={styles.welcomeTitleRow}>
              <h2 id="welcome-title">{t("home.welcome.title")}</h2>
            </div>
            <p className={styles.welcomeDescription}>{t("home.welcome.description")}</p>
            <Link className={styles.orangeButton} to="/a-propos">{t("home.welcome.cta")}<span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </div>

      <div className={styles.featureGrid}>
        {features.map(({ id, to, icon, art }) => (
          <Link key={id} to={to} className={`${styles.feature} ${styles[id]}`}>
            <span className={`${styles.iconBadge} ${id === "library" ? styles.purple : id === "play" ? styles.green : styles.orange}`}><PortalIcon name={icon} /></span>
            <h2>{t(`home.features.${id}.title`)}</h2>
            <p>{t(`home.features.${id}.description`)}</p>
            <span className={styles.roundArrow} aria-hidden="true">→</span>
            <img className={styles.featureArt} src={art} alt="" />
          </Link>
        ))}
      </div>

      <section className={styles.yamba} aria-labelledby="yamba-title">
        <img className={styles.yambaAvatar} src={yambaHead} alt="" loading="lazy" />
        <div>
          <h2 id="yamba-title" className={styles.yambaTitle}>{t("about.yamba.title")}</h2>
          <p className={styles.yambaText}>{t("about.yamba.text")}</p>
        </div>
      </section>

      <div className={styles.bannerGrid}>
        <section className={`${styles.banner} ${styles.gamesBanner}`} style={{ backgroundImage: `linear-gradient(90deg, #00291d99, #003b2933 65%, transparent), url(${gamesArt})` }} aria-labelledby="games-title">
          <div className={styles.bannerContent}>
            <p className={styles.bannerEyebrow}>{t("home.games.eyebrow")}</p>
            <h2 id="games-title">{t("home.games.title")}<br /><span>{t("home.games.highlight")}</span></h2>
            <p>{t("home.games.description")}</p>
            <Link className={styles.whiteButton} to="/jeux">{t("home.games.cta")}<span aria-hidden="true">→</span></Link>
          </div>
        </section>
        <section className={`${styles.banner} ${styles.exetatBanner}`} aria-labelledby="exetat-title">
          <div className={styles.bannerContent}>
            <p className={styles.bannerEyebrow}>{t("home.exetat.eyebrow")}</p>
            <h2 id="exetat-title">{t("home.exetat.title")}</h2>
            <p>{t("home.exetat.description")}</p>
            <Link className={styles.whiteButton} to="/exetat">{t("home.exetat.cta")}<span aria-hidden="true">→</span></Link>
          </div>
          <img className={styles.exetatArt} src={exetatArt} alt="" />
        </section>
      </div>

      <HowToUse />
    </div>
  );
}
