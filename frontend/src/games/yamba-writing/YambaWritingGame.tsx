import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGameAudio } from "../audio/useGameAudio";
import { useGameLoading } from "../loading/GameLoaderHost";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import { chooseGuide } from "./guide";
import { GuideHand } from "./GuideHand";
import { Picture, Reel } from "./Reel";
import styles from "./YambaWritingGame.module.css";
import {
  availableTiles,
  buildReel,
  createRound,
  giveHint,
  helpLevel,
  letterAt,
  misplacedSlots,
  pickNext,
  placeTile,
  remember,
  removeFromSlot,
  type RoundState,
} from "./writing-engine";
import { DEFAULT_WRITING_LOCALE, WRITING_CATEGORY_ORDER, wordsFor, type WritingCategoryChoice, type WritingWord } from "./writing-words";

type Phase = "idle" | "spinning" | "dropping" | "writing" | "won";

export interface YambaWritingGameProps {
  /** Titre visible dans l'en-tête du lecteur (faux sur la page autonome, qui a déjà son titre). */
  showTitle?: boolean;
  /** Le jeu se met en pause tout seul lorsqu'il n'est plus visible. */
  active?: boolean;
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  onClose?: () => void;
  cover?: boolean;
}

const SPIN_MS = 3400;
const SPIN_REDUCED_MS = 700;
const DROP_MS = 1100;
// Le choc avec le réceptacle a lieu à ce moment de la chute (voir les images clés de « fall » dans la feuille de style).
const IMPACT_RATIO = 0.52;
// Cette machine n'a pas de musique : seulement des bruits de mécanique, fabriqués par programmation (voir audio/sound-effects).
const noMusic = () => Promise.reject(new Error("Pas de musique"));

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stripAccents = (letter: string) => letter.normalize("NFD").replace(/[̀-ͯ]/g, "");

function speak(text: string, lang: string) {
  try {
    const synthesis = window.speechSynthesis;
    if (!synthesis || typeof SpeechSynthesisUtterance === "undefined") return;
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "fr" ? "fr-FR" : lang;
    utterance.rate = 0.85;
    synthesis.speak(utterance);
  } catch {
    // La voix du navigateur est un plus : sans elle, le jeu reste complet.
  }
}

// Le guide reste affiché à chaque étape tant que l'enfant n'a pas réussi un premier mot ; ensuite il ne revient qu'après un moment d'inactivité.
const GUIDED_KEY = "yamba.writing.guided";
const NUDGE_MS = 6000;
const readGuided = () => {
  try {
    return window.localStorage.getItem(GUIDED_KEY) === "1";
  } catch {
    return false;
  }
};
const saveGuided = () => {
  try {
    window.localStorage.setItem(GUIDED_KEY, "1");
  } catch {
    // Stockage indisponible (navigation privée) : le guide reviendra simplement à la prochaine visite.
  }
};

// Fanions de l'atelier : de la couleur en haut de l'écran, sans fichier à télécharger.
const BUNTING = ["#ff7a5f", "#ffd54d", "#5fb1ff", "#7ad37a", "#ff7a5f", "#ffd54d", "#5fb1ff", "#7ad37a", "#ff7a5f", "#ffd54d"];
function Bunting() {
  return (
    <svg className={styles.bunting} viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 1 Q25 6 50 1 T100 1" fill="none" stroke="#7a4a20" strokeWidth="0.5" />
      {BUNTING.map((color, index) => {
        const x = 5 + index * 10;
        const y = 1 + 3.6 * Math.sin((index / 10) * Math.PI * 2 - 0.15) ** 2;
        return <polygon key={index} points={`${x - 3},${y} ${x + 3},${y} ${x},${y + 4.4}`} fill={color} stroke="#3a2a1f" strokeWidth="0.25" />;
      })}
    </svg>
  );
}

function Gear({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="7" strokeDasharray="5.5 5.5" />
      <circle cx="20" cy="20" r="11" fill="currentColor" />
      <circle cx="20" cy="20" r="4" fill="#3a2a1f" />
    </svg>
  );
}

// Le jeu d'écriture Yamba : une machine à rouleau tire une illustration, elle tombe dans le réceptacle, l'enfant écrit son nom.
// La logique de la manche est dans writing-engine (pure, testée) ; ici : l'interface, les animations et les sons.
export function YambaWritingGame({ showTitle = true, active = true, fullscreen, onFullscreenChange, onClose, cover }: YambaWritingGameProps) {
  const { t, i18n } = useTranslation("games");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const windowSlot = useRef<HTMLDivElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const dropperRef = useRef<HTMLDivElement | null>(null);

  const loading = useGameLoading();
  useEffect(() => {
    loading.milestone("mounted");
    loading.ready();
  }, [loading]);

  const language = i18n.language.slice(0, 2);
  const locale = wordsFor("all", language).length > 0 ? language : DEFAULT_WRITING_LOCALE;

  const [category, setCategory] = useState<WritingCategoryChoice>("all");
  const [phase, setPhase] = useState<Phase>("idle");
  const [word, setWord] = useState<WritingWord | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const [reel, setReel] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [solved, setSolved] = useState(0);
  const [paused, setPaused] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [beginner, setBeginner] = useState(() => !readGuided());
  // Dernière étape pour laquelle le joueur est resté inactif : « nudged » n’est vrai que pour l’étape en cours.
  const [nudgedFor, setNudgedFor] = useState("");
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const sound = useGameAudio({ rootRef, loadMusic: noMusic, musicOn: false });
  const pool = useMemo(() => wordsFor(category, locale), [category, locale]);
  const preview = useMemo(() => pool.slice(0, 5).map((entry) => entry.id), [pool]);
  const label = word?.labels[locale] ?? "";

  // En pause, ou jeu masqué : plus d'interaction, et la voix se tait.
  const frozen = paused || !active;
  useEffect(() => {
    if (frozen) window.speechSynthesis?.cancel?.();
  }, [frozen]);
  useEffect(() => () => window.speechSynthesis?.cancel?.(), []);

  const launch = useCallback(() => {
    const next = pickNext(pool, recent);
    if (!next) return;
    setWord(next);
    setRecent((previous) => remember(previous, next.id));
    // Premier mot réussi : le guide permanent s’arrête (il ne reviendra plus qu’après un moment d’inactivité).
    if (readGuided()) setBeginner(false);
    setReel(buildReel(pool.map((entry) => entry.id), next.id));
    setRound(null);
    setPhase("spinning");
  }, [pool, recent]);

  const startDrop = useCallback(() => {
    if (!word) return;
    setRound(createRound(label, Math.random, locale));
    setPhase("dropping");
  }, [word, label, locale]);

  // Chute : la distance à parcourir se mesure sur l'écran (de la case centrale du rouleau jusqu'au réceptacle), puis le choc fait « toc ».
  useEffect(() => {
    if (phase !== "dropping") return;
    const dropper = dropperRef.current;
    const from = windowSlot.current?.getBoundingClientRect();
    const to = trayRef.current?.getBoundingClientRect();
    if (dropper && from && to) dropper.style.setProperty("--fall", `${Math.round(to.top + to.height / 2 - (from.top + from.height / 2))}px`);
    const duration = reduced ? 150 : DROP_MS;
    const impact = window.setTimeout(() => sound.play("dropThud"), duration * IMPACT_RATIO);
    const end = window.setTimeout(() => setPhase("writing"), duration);
    return () => {
      window.clearTimeout(impact);
      window.clearTimeout(end);
    };
  }, [phase, reduced, sound]);

  // Chaque changement de la manche passe par ici : le son qui convient, la secousse d'une tentative fausse, puis la réussite.
  const applyRound = useCallback(
    (next: RoundState, effect?: "letterPlace") => {
      if (round && next.wrongAttempts > round.wrongAttempts) {
        sound.play("placeWrong");
        setShaking(true);
        window.setTimeout(() => setShaking(false), 500);
      } else if (effect) sound.play(effect);
      setRound(next);
      if (next.status === "won") {
        setPhase("won");
        setSolved((count) => count + 1);
        saveGuided();
        sound.play("gridWin");
        if (!sound.muted) speak(label, locale);
      }
    },
    [round, sound, label, locale],
  );

  const onTile = (tileId: number) => {
    if (round && phase === "writing" && !frozen) applyRound(placeTile(round, tileId), "letterPlace");
  };
  const onSlot = (index: number) => {
    if (round && phase === "writing" && !frozen) applyRound(removeFromSlot(round, index));
  };
  const onHint = () => {
    if (round && phase === "writing" && !frozen) applyRound(giveHint(round), "letterPlace");
  };

  // Clavier : une lettre tapée pose la lettre correspondante (avec ou sans accent), Retour arrière retire la dernière posée.
  useEffect(() => {
    if (phase !== "writing" || frozen || !round) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Backspace") {
        const filled = round.placed.map((tileId, index) => (tileId == null ? -1 : index)).filter((index) => index >= 0);
        const last = filled[filled.length - 1];
        if (last !== undefined) applyRound(removeFromSlot(round, last));
        return;
      }
      if (event.key.length !== 1 || !/\p{L}/u.test(event.key)) return;
      const typed = event.key.toLocaleUpperCase(locale);
      const choices = availableTiles(round);
      const tile = choices.find((candidate) => candidate.letter === typed) ?? choices.find((candidate) => stripAccents(candidate.letter) === stripAccents(typed));
      if (tile) applyRound(placeTile(round, tile.id), "letterPlace");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, frozen, round, applyRound, locale]);

  const reset = () => {
    setPhase("idle");
    setWord(null);
    setRound(null);
    setReel([]);
    setSolved(0);
  };
  const chooseCategory = (next: WritingCategoryChoice) => {
    if (phase === "spinning" || phase === "dropping") return;
    setCategory(next);
    setPhase("idle");
    setWord(null);
    setRound(null);
    setReel([]);
  };

  const busy = phase === "spinning" || phase === "dropping";
  const level = round ? helpLevel(round) : 0;
  const wrong = new Set(round && level >= 1 ? misplacedSlots(round) : []);
  const reelIds = reel.length > 0 ? reel : preview;
  const status =
    phase === "won" ? t("yambaWriting.game.status.won", { word: label }) : phase === "writing" ? t("yambaWriting.game.status.writing") : busy ? t("yambaWriting.game.status.spinning") : t("yambaWriting.game.status.idle");
  const showWriting = round !== null && (phase === "writing" || phase === "won");

  // Main guide : une seule étape à la fois. Le débutant la voit toujours ; les autres seulement après quelques secondes sans rien faire.
  const activity = `${phase}|${category}|${round?.placed.join(",") ?? ""}`;
  useEffect(() => {
    const timer = window.setTimeout(() => setNudgedFor(activity), NUDGE_MS);
    return () => window.clearTimeout(timer);
  }, [activity]);
  const nudged = nudgedFor === activity;
  const firstFreeTile = round ? availableTiles(round)[0]?.id : undefined;
  const firstWrong = wrong.size > 0 ? Math.min(...wrong) : undefined;
  const guide = chooseGuide({ phase, hasWrongLetters: firstWrong !== undefined, hasFreeTile: firstFreeTile !== undefined, frozen, beginner, nudged });

  const howTo = [1, 2, 3].map((number) => ({ title: t(`yambaWriting.game.howTo.step${number}Title`), text: t(`yambaWriting.game.howTo.step${number}`) }));

  return (
    <GamePlayer
      rootRef={rootRef}
      label={t("yambaWriting.game.screen.label")}
      title={showTitle ? t("yambaWriting.game.title") : undefined}
      stats={[{ label: t("yambaWriting.game.stats.solved"), value: solved }]}
      paused={paused}
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      ended={false}
      onRestart={reset}
      restartLabel={t("yambaWriting.game.actions.restartAria")}
      onHint={onHint}
      hintDisabled={phase !== "writing"}
      howTo={howTo}
      extraControls={
        <button type="button" className={playerControlClass} aria-pressed={!sound.muted} aria-label={sound.muted ? t("player.sound.off") : t("player.sound.on")} onClick={sound.toggleMuted}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <polygon points="4,9 8,9 13,5 13,19 8,15 4,15" />
            {sound.muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
          </svg>
          <span>{sound.muted ? t("player.sound.off") : t("player.sound.on")}</span>
        </button>
      }
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onClose={onClose}
      cover={cover}
      initialOrientation="device"
    >
      <div ref={stageRef} className={styles.game} inert={frozen} data-phase={phase} data-paused={paused || undefined}>
        <Bunting />
        <div className={styles.categories} role="group" aria-label={t("yambaWriting.game.categoriesLabel")}>
          {(["all", ...WRITING_CATEGORY_ORDER] as WritingCategoryChoice[]).map((choice) => (
            <button key={choice} type="button" className={styles.category} aria-pressed={category === choice} disabled={busy} onClick={() => chooseCategory(choice)}>
              {t(`yambaWriting.game.categories.${choice}`)}
            </button>
          ))}
        </div>

        <section className={styles.machine} aria-label={t("yambaWriting.game.machineLabel")}>
          <div className={styles.marquee} aria-hidden="true">
            <span className={styles.lamp} />
            <span className={styles.lamp} />
            <span className={styles.lamp} />
          </div>
          <div className={styles.reelRow}>
            <Gear className={styles.gear} />
            <div ref={windowSlot} className={styles.reelSlot}>
              <Reel ids={reelIds} running={phase === "spinning"} paused={frozen} durationMs={reduced ? SPIN_REDUCED_MS : SPIN_MS} settled={reel.length > 0 ? "end" : "start"} winnerOut={phase === "dropping" || phase === "writing" || phase === "won"} onTick={() => sound.play("reelTick")} onDone={startDrop} />
              {phase === "dropping" && word ? (
                <div ref={dropperRef} className={styles.dropper} data-testid="dropper">
                  <Picture id={word.id} className={styles.dropperPicture} />
                </div>
              ) : null}
            </div>
            <Gear className={`${styles.gear} ${styles.gearReverse}`} />
          </div>
          <button type="button" className={styles.launch} data-guide="launch" onClick={launch} disabled={busy || phase === "writing" || pool.length === 0}>
            <span className={styles.launchBase} aria-hidden="true" />
            <span className={styles.launchDome}>{phase === "won" ? t("yambaWriting.game.actions.again") : t("yambaWriting.game.actions.launch")}</span>
          </button>
          <div className={styles.tray}>
            <div ref={trayRef} className={styles.trayPicture} data-visible={phase === "writing" || phase === "won" || undefined}>
              {word ? <Picture id={word.id} className={styles.trayImage} alt={phase === "won" ? label : t("yambaWriting.game.pictureAlt")} /> : null}
            </div>
            {phase === "won" ? (
              <span className={styles.stars} aria-hidden="true">
                {Array.from({ length: 14 }, (_, index) => (
                  <i key={index} style={{ "--a": `${index * (360 / 14)}deg`, "--d": `${(index % 5) * 40}ms`, "--h": `${(index * 47) % 360}` } as React.CSSProperties} />
                ))}
              </span>
            ) : null}
          </div>
        </section>

        <section className={styles.writing} aria-label={t("yambaWriting.game.writingLabel")}>
          <p className={styles.status} role="status" aria-live="polite">
            {status}
          </p>
          {showWriting && round ? (
            <>
              <div className={styles.slots} data-shaking={shaking || undefined} role="group" aria-label={t("yambaWriting.game.slotsLabel")}>
                {round.slots.map((slot, index) => {
                  if (slot.kind === "fixed") return <span key={index} className={slot.char === " " ? styles.gap : styles.fixed}>{slot.char === " " ? "" : slot.char}</span>;
                  const letter = letterAt(round, index);
                  return (
                    <button
                      key={index}
                      type="button"
                      className={styles.slot}
                      data-guide={index === firstWrong ? "wrong" : undefined}
                      data-filled={letter ? true : undefined}
                      data-tone={letter ? (round.placed[index] ?? 0) % 6 : undefined}
                      data-wrong={wrong.has(index) || undefined}
                      data-correct={phase === "won" || undefined}
                      style={{ animationDelay: `${index * 45}ms` }}
                      aria-label={letter ? t("yambaWriting.game.slotFilled", { letter }) : t("yambaWriting.game.slotEmpty", { index: index + 1 })}
                      onClick={() => onSlot(index)}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
              <div className={styles.tiles} role="group" aria-label={t("yambaWriting.game.tilesLabel")}>
                {round.tiles.map((tile) => {
                  const placed = round.placed.includes(tile.id);
                  return (
                    <button key={tile.id} type="button" className={styles.tile} data-tone={tile.id % 6} data-guide={tile.id === firstFreeTile ? "tile" : undefined} data-placed={placed || undefined} tabIndex={placed ? -1 : 0} aria-hidden={placed || undefined} aria-label={t("yambaWriting.game.tileLabel", { letter: tile.letter })} onClick={() => onTile(tile.id)}>
                      {tile.letter}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
        {guide ? <GuideHand rootRef={stageRef} target={guide.target} text={t(guide.textKey)} /> : null}
      </div>
    </GamePlayer>
  );
}
