import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
  assess,
  hint as engineHint,
  LEVELS,
  newGame,
  placeResult,
  rescueGame,
  resultHint,
  swapGame,
  tickGame,
  unreachableNumbers,
  type Expression,
  type GameEvent,
  type GameState,
  type ImageTile,
  type NumberTile,
  type ResultTile,
} from "@mbuyamba/math-flow";

import { illustrationUrl } from "../../illustrations/illustrations";
import type { SoundEffect } from "../audio/sound-effects";
import { useGameAudio } from "../audio/useGameAudio";
import { useGameLoading } from "../loading/GameLoaderHost";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import { dragDirection, expressionOffset, KEY_DIRECTION, neighbour, reservoirLayout, scanFrom, EXPRESSION_WIDTH, type Direction } from "./geometry";
import { FLOW_VARIANTS, type FlowVariantId } from "./flow-variants";
import styles from "./MultipliFlow.module.css";

export interface MathFlowGameProps {
  /** Le jeu de la famille Flow : l'opération et les textes changent, le reste est identique. Multiplication par défaut. */
  variant?: FlowVariantId;
  /** Titre visible dans l'en-tête du lecteur (faux sur la page autonome, qui a déjà son titre). */
  showTitle?: boolean;
  /** Le jeu se met en pause tout seul lorsqu'il n'est plus visible. */
  active?: boolean;
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  onClose?: () => void;
  cover?: boolean;
  /** Niveau de départ (1 à 5). */
  initialLevel?: number;
  /** Graine du premier plateau : sert aux démonstrations et aux tests ; sinon le plateau est tiré au hasard. */
  initialSeed?: number;
}

// Rythme du déplacement automatique : un pas de temps du moteur (chaque nombre avance d'une case, le tuyau d'un emplacement).
const TICK_MS = 420;
const HINT_MS = 2800;
const MESSAGE_MS = 2600;
const BOUNCE_MS = 420;
const GHOST_MS = 900;
// Un résultat descend dans le tuyau jusqu'à la multiplication ; un mauvais remonte (même durée de départ, retour compris).
const FLY_PLACE_MS = 1100;
const FLY_REJECT_MS = 1800;
// Un glissement compte à partir de 40 % de la taille d'une case.
const DRAG_FRACTION = 0.4;

const freshSeed = () => Math.floor(Math.random() * 1_000_000_000) + 1;
const clampLevel = (level: number) => Math.min(LEVELS.length, Math.max(1, Math.round(level)));

interface Ghost {
  key: number;
  tile: ImageTile;
  index: number;
  /** Case d'où la tuile est venue juste avant de disparaître (animation d'échange). */
  origin: number;
  /** Nettoyage automatique : la tuile se désintègre sur place au lieu de glisser vers l'alignement. */
  dust?: boolean;
}

interface Bounce {
  key: number;
  a: number;
  b: number;
}

/** Une tuile de résultat en train de descendre dans le tuyau vers une multiplication (et de remonter si elle n'y va pas). */
interface Flyer {
  key: number;
  tile: number;
  value: number;
  /** Position de départ (centre de la tuile) et taille, en pixels dans la fenêtre de jeu. */
  x: number;
  y: number;
  size: number;
  /** Étapes du trajet, depuis la tuile : haut du tuyau, bas du tuyau, puis la multiplication. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dx: number;
  dy: number;
  mode: "place" | "reject";
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <polygon points="4,9 8,9 13,5 13,19 8,15 4,15" />
      {muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
    </svg>
  );
}

function Leds({ active }: { active: boolean }) {
  return (
    <span className={styles.leds} data-active={active || undefined} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function PhoneTurnIcon() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={styles.turnIcon}>
      <rect x="21" y="8" width="22" height="40" rx="5" />
      <path d="M29 42h6" />
      <path d="M10 52c8 6 20 6 30 0M44 49l-4 4 5 3" />
    </svg>
  );
}

// Les quatre jeux Flow (Addi'Flow, Soustra'Flow, Multipli'Flow, Divi'Flow) : deux tableaux reliés par un tuyau. À gauche, des tuiles imagées colorées : en alignant 3 fruits identiques
// ou plus, le joueur les détruit et ouvre des chemins aux nombres. Ceux-ci avancent seuls jusqu'au tuyau, le traversent un par un et
// forment des multiplications dans le second tableau. La logique est tout entière dans @mbuyamba/math-flow (pure, testée) ; ici : le
// dessin, les gestes (toucher, glisser, clavier), les animations et les sons.
export function MathFlowGame({ variant: variantId = "multiplication", showTitle = true, active = true, fullscreen, onFullscreenChange, onClose, cover, initialLevel = 1, initialSeed }: MathFlowGameProps) {
  const variant = FLOW_VARIANTS[variantId];
  const { t: translate } = useTranslation("games");
  // Les clés du jeu sont écrites sans racine (« game.title ») : la racine est celle du jeu joué.
  const t = useCallback((key: string, options?: Record<string, unknown>): string => translate(`${variant.i18n}.${key}`, options) as string, [translate, variant.i18n]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const loading = useGameLoading();
  useEffect(() => {
    loading.milestone("mounted");
    loading.ready();
  }, [loading]);

  const [level, setLevel] = useState(() => clampLevel(initialLevel));
  const [game, setGame] = useState<GameState>(() => newGame(clampLevel(initialLevel), initialSeed ?? freshSeed(), { operation: variant.operation }).state);
  const gameRef = useRef(game);
  const [round, setRound] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [bounce, setBounce] = useState<Bounce | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [hintCells, setHintCells] = useState<readonly [number, number] | null>(null);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [hintResult, setHintResult] = useState<{ tile: number; expression: number } | null>(null);
  const [message, setMessage] = useState<{ key: number; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [stuck, setStuck] = useState(false);
  const [paused, setPaused] = useState(false);
  const [portrait, setPortrait] = useState(false);

  const sound = useGameAudio({ rootRef, loadMusic: () => Promise.reject(new Error("pas de musique")), musicOn: false });
  const playSound = sound.play;
  const play = useCallback((effect: SoundEffect, options?: { intensity?: number; count?: number }) => playSound(effect, options), [playSound]);

  const frozen = paused || !active || portrait;
  const won = game.status === "won";
  const board = game.flow.board;
  const { rows, cols } = board;

  const commit = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  // Compteurs de clés (animations rejouées à chaque événement) et minuteries à nettoyer.
  const counter = useRef(0);
  const timers = useRef<Set<number>>(new Set());
  const later = useCallback((callback: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) window.clearTimeout(id);
      pending.clear();
    };
  }, []);

  const showMessage = useCallback(
    (text: string) => {
      counter.current += 1;
      const key = counter.current;
      setMessage({ key, text });
      later(() => setMessage((current) => (current?.key === key ? null : current)), MESSAGE_MS);
    },
    [later],
  );

  // La fenêtre de jeu est-elle plus haute que large ? Alors on invite le joueur à tourner son téléphone (jeu en pause).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box && box.width > 0 && box.height > 0) setPortrait(box.height > box.width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Déplacement automatique : un pas de temps du moteur à intervalle régulier. Le joueur peut jouer entre deux pas.
  const announce = useCallback(
    (events: readonly GameEvent[]) => {
      for (const event of events) {
        if (event.type === "entered-pipe") play("tileSlide");
        else if (event.type === "delivered") play("tilePlace");
        else if (event.type === "reservoir-add") play("hint");
        else if (event.type === "board-cleaned") {
          // Les fruits restants se désintègrent ensemble ; le tableau d'entrée a fini sa mission (le coup n'est pas compté).
          play("combo", { count: event.removed.length, intensity: 1 });
          counter.current += 1;
          const batch = counter.current;
          const previous = gameRef.current.flow.board;
          const dust: Ghost[] = event.removed.flatMap((index) => {
            const tile = previous.cells[index];
            return tile?.kind === "image" ? [{ key: batch * 1000 + index, tile, index, origin: index, dust: true }] : [];
          });
          setGhosts((current) => [...current, ...dust]);
          later(() => setGhosts((current) => current.filter((ghost) => Math.floor(ghost.key / 1000) !== batch)), GHOST_MS);
          setAnnouncement(t("game.boardCleaned"));
        }
        else if (event.type === "result-placed") {
          play("cardReveal");
          const expression = gameRef.current.builder.expressions[event.expression];
          if (expression?.operands) setAnnouncement(t("game.expressionDone", { a: expression.operands[0], b: expression.operands[1], result: event.value }));
        } else if (event.type === "won") play("levelComplete");
      }
    },
    [later, play, t],
  );
  useEffect(() => {
    if (frozen || game.status !== "playing") return;
    const timer = window.setInterval(() => {
      const step = tickGame(gameRef.current);
      if (step.events.length === 0) return;
      // Les fruits qui vont disparaître sont lus sur l'ancien plateau : on annonce avant de valider le nouveau.
      announce(step.events);
      commit(step.state);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [frozen, game.status, commit, announce]);

  const startLevel = useCallback(
    (levelId: number) => {
      const id = clampLevel(levelId);
      commit(newGame(id, freshSeed(), { operation: variant.operation }).state);
      setLevel(id);
      setRound((current) => current + 1);
      setSelected(null);
      setSelectedResult(null);
      setFlyer(null);
      setHintResult(null);
      setBounce(null);
      setGhosts([]);
      setHintCells(null);
      setMessage(null);
      setStuck(false);
      setPaused(false);
    },
    [commit, variant.operation],
  );

  const attemptSwap = useCallback(
    (a: number, b: number) => {
      const current = gameRef.current;
      if (current.status !== "playing") return;
      const result = swapGame(current, a, b);
      setSelected(null);
      setHintCells(null);
      const outcome = result.outcome;
      if (!outcome.accepted) {
        counter.current += 1;
        const key = counter.current;
        setBounce({ key, a, b });
        later(() => setBounce((value) => (value?.key === key ? null : value)), BOUNCE_MS);
        play("tileBlocked");
        if (outcome.reason === "dead-end") showMessage(t("game.messages.deadEnd"));
        else if (outcome.reason === "no-alignment") showMessage(t("game.messages.noAlignment"));
        return;
      }
      counter.current += 1;
      const batch = counter.current;
      const removedGhosts: Ghost[] = [];
      for (const index of outcome.removed) {
        const tile = outcome.swapped.cells[index];
        if (tile?.kind !== "image") continue;
        removedGhosts.push({ key: batch * 1000 + index, tile, index, origin: index === a ? b : index === b ? a : index });
      }
      setGhosts((previous) => [...previous, ...removedGhosts]);
      later(() => setGhosts((previous) => previous.filter((ghost) => Math.floor(ghost.key / 1000) !== batch)), GHOST_MS);
      commit(result.state);
      play("tileSwap");
      play("combo", { count: outcome.removed.length, intensity: Math.min(1, outcome.removed.length / 6) });
      const verdict = assess(result.state);
      setStuck(verdict.solvability === "unsolvable" || (verdict.noMoves && verdict.blocked > 0));
    },
    [commit, later, play, showMessage, t],
  );

  const shuffle = useCallback(() => {
    const rescued = rescueGame(gameRef.current);
    setSelected(null);
    setHintCells(null);
    if (!rescued.result.ok) {
      showMessage(t("game.messages.shuffleFailed"));
      return;
    }
    commit(rescued.state);
    setStuck(false);
    play("tileSwap");
    showMessage(t("game.messages.shuffled"));
  }, [commit, play, showMessage, t]);

  // --- Résultats : l'enfant choisit une tuile du réservoir, elle descend dans le tuyau jusqu'à la multiplication -----------------

  const placeOnExpression = useCallback(
    (tileId: number, expressionId: number) => {
      const current = gameRef.current;
      const stage = stageRef.current;
      if (current.status !== "playing" || !stage) return;
      const tileElement = stage.querySelector<HTMLElement>(`[data-result-tile="${tileId}"]`);
      const slotElement = stage.querySelector<HTMLElement>(`[data-question="${expressionId}"]`);
      const tile = current.builder.reservoir.find((candidate) => candidate.id === tileId);
      setSelectedResult(null);
      setHintResult(null);
      if (!tileElement || !slotElement || !tile) return;
      const area = stage.getBoundingClientRect();
      const from = tileElement.getBoundingClientRect();
      const to = slotElement.getBoundingClientRect();
      const pipe = stage.querySelector<HTMLElement>("[data-vpipe]")?.getBoundingClientRect();
      const startX = from.left + from.width / 2;
      const startY = from.top + from.height / 2;
      // Le résultat passe par le tuyau : il y entre par le haut, en ressort par le bas, puis rejoint la multiplication.
      const pipeX = pipe ? pipe.left + pipe.width / 2 : startX;
      const pipeTop = pipe ? pipe.top + pipe.height * 0.12 : startY;
      const pipeBottom = pipe ? pipe.top + pipe.height * 0.88 : startY;
      const accepted = placeResult(current, tileId, expressionId).outcome.accepted;
      counter.current += 1;
      const key = counter.current;
      setFlyer({
        key,
        tile: tileId,
        value: tile.value,
        x: from.left - area.left + from.width / 2,
        y: from.top - area.top + from.height / 2,
        size: from.width,
        x1: pipeX - startX,
        y1: pipeTop - startY,
        x2: pipeX - startX,
        y2: pipeBottom - startY,
        dx: to.left + to.width / 2 - startX,
        dy: to.top + to.height / 2 - startY,
        mode: accepted ? "place" : "reject",
      });
      if (!accepted) {
        play("placeWrong");
        showMessage(t("game.messages.wrongResult"));
      }
      later(
        () => {
          // La partie a pu avancer pendant la descente : le placement se refait sur l'état courant.
          if (accepted) {
            const latest = placeResult(gameRef.current, tileId, expressionId);
            if (latest.outcome.accepted) {
              commit(latest.state);
              announce(latest.events);
            }
          }
          setFlyer((value) => (value?.key === key ? null : value));
        },
        accepted ? FLY_PLACE_MS : FLY_REJECT_MS,
      );
    },
    [announce, commit, later, play, showMessage, t],
  );

  const pendingExpressions = game.builder.expressions.filter((expression) => expression.stage === "equals");

  const onResultTile = (tile: ResultTile) => {
    if (frozen || won || flyer) return;
    const pending = gameRef.current.builder.expressions.filter((expression) => expression.stage === "equals");
    if (pending.length === 0) return;
    play("tileSwap");
    // Une seule multiplication attend : la tuile y descend directement. Sinon, l'enfant touche ensuite celle qu'il veut.
    if (pending.length === 1) placeOnExpression(tile.id, (pending[0] as Expression).id);
    else setSelectedResult((current) => (current === tile.id ? null : tile.id));
  };

  const onQuestion = (expressionId: number) => {
    if (frozen || won || flyer) return;
    if (selectedResult === null) showMessage(t("game.status.chooseResult"));
    else placeOnExpression(selectedResult, expressionId);
  };

  const showHint = useCallback(() => {
    // Des résultats attendent : l'indice montre la tuile et la multiplication où elle va.
    const resultAdvice = resultHint(gameRef.current);
    if (resultAdvice) {
      setHintResult(resultAdvice);
      play("hint");
      counter.current += 1;
      const key = counter.current;
      later(() => setHintResult((value) => (value === resultAdvice && key === counter.current ? null : value)), HINT_MS);
      return;
    }
    const advice = engineHint(gameRef.current);
    if (advice.kind === "move") {
      setHintCells(advice.move);
      play("hint");
      counter.current += 1;
      const key = counter.current;
      later(() => setHintCells((value) => (value === advice.move && key === counter.current ? null : value)), HINT_MS);
    } else if (advice.kind === "none-needed") {
      showMessage(t("game.status.flowing"));
    } else {
      showMessage(t("game.stuck"));
    }
  }, [later, play, showMessage, t]);

  // --- Gestes : toucher / clic, glisser, clavier -----------------------------------------------------------------------------

  const isImageAt = useCallback((index: number) => gameRef.current.flow.board.cells[index]?.kind === "image", []);
  const adjacent = (a: number, b: number) => Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs((a % cols) - (b % cols)) === 1;

  const tap = (index: number) => {
    if (selected === null) setSelected(index);
    else if (selected === index) setSelected(null);
    else if (adjacent(selected, index)) attemptSwap(selected, index);
    else setSelected(index);
  };

  const drag = useRef<{ index: number; x: number; y: number; size: number; consumed: boolean } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (frozen || won || (event.pointerType === "mouse" && event.button !== 0)) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    const index = target ? Number(target.dataset.index) : -1;
    if (index < 0 || !isImageAt(index)) {
      setSelected(null);
      return;
    }
    const box = boardRef.current?.getBoundingClientRect();
    drag.current = { index, x: event.clientX, y: event.clientY, size: box ? box.width / cols : 48, consumed: false };
    try {
      boardRef.current?.setPointerCapture(event.pointerId);
    } catch {
      // Capture indisponible : le geste se termine simplement sans elle.
    }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.consumed) return;
    const direction = dragDirection(event.clientX - current.x, event.clientY - current.y, current.size * DRAG_FRACTION);
    if (!direction) return;
    current.consumed = true;
    const target = neighbour(rows, cols, current.index, direction);
    if (target === null || !isImageAt(target)) {
      setSelected(null);
      return;
    }
    attemptSwap(current.index, target);
  };
  const onPointerUp = () => {
    const current = drag.current;
    drag.current = null;
    if (current && !current.consumed) tap(current.index);
  };
  const onPointerCancel = () => {
    drag.current = null;
  };

  const focusTile = (index: number) => boardRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (frozen || won) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-index]");
    if (!target) return;
    const index = Number(target.dataset.index);
    const direction: Direction | undefined = KEY_DIRECTION[event.key];
    if (direction) {
      event.preventDefault();
      if (selected !== null && selected === index) {
        const next = neighbour(rows, cols, index, direction);
        if (next !== null && isImageAt(next)) {
          attemptSwap(index, next);
          focusTile(next);
        }
        return;
      }
      const next = scanFrom(rows, cols, index, direction, isImageAt);
      if (next !== null) focusTile(next);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      tap(index);
    } else if (event.key === "Escape") {
      setSelected(null);
    }
  };

  // --- Dessin ----------------------------------------------------------------------------------------------------------------

  const tiles = useMemo(
    () =>
      board.cells
        .flatMap((tile, index) => (tile ? [{ tile, index }] : []))
        // Ordre fixe (par identifiant) : réordonner les éléments du DOM relancerait leurs transitions.
        .sort((x, y) => x.tile.id - y.tile.id),
    [board],
  );
  const blocked = useMemo(() => unreachableNumbers(board, game.flow.entrance).length, [board, game.flow.entrance]);
  const offset = expressionOffset(cols);
  const expressionRows = game.totalNumbers / 2;
  const entranceRow = Math.floor(game.flow.entrance / cols);
  const pipeSlots = game.flow.pipe.slots;
  const pipeBusy = pipeSlots.some((slot) => slot !== null);

  const reservoir = game.builder.reservoir;
  const layout = reservoirLayout(cols, game.totalNumbers);
  const status = won
    ? t("game.status.won")
    : selectedResult !== null
      ? t("game.status.placeResult")
      : pendingExpressions.length > 0
        ? t("game.status.chooseResult")
        : selected !== null
      ? t("game.status.selected")
      : blocked === 0
        ? t("game.status.flowing")
        : t("game.status.play");
  const colorName = (color: ImageTile["color"]) => t(`game.colors.${color}`);
  const howTo = [1, 2, 3].map((number) => ({ title: t(`game.howTo.step${number}Title`), text: t(`game.howTo.step${number}`) }));
  const lastLevel = level >= LEVELS.length;

  const bounceStyle = (index: number): CSSProperties | undefined => {
    if (!bounce || (index !== bounce.a && index !== bounce.b)) return undefined;
    const other = index === bounce.a ? bounce.b : bounce.a;
    return { "--bx": (other % cols) - (index % cols), "--by": Math.floor(other / cols) - Math.floor(index / cols) } as CSSProperties;
  };

  const renderOperand = (expression: Expression, slot: "a" | "b") => {
    const value = slot === "a" ? (expression.operands?.[0] ?? expression.a.value) : (expression.operands?.[1] ?? expression.b?.value);
    if (value === undefined) return null;
    const column = offset + (slot === "a" ? 0 : 2);
    return (
      <div key={`e${expression.id}-${slot}`} className={styles.slot} style={{ "--r": expression.id, "--c": column } as CSSProperties}>
        <div className={`${styles.face} ${styles.number} ${styles.arrive}`} style={{ "--fx": -(column + 0.5), "--fy": entranceRow - expression.id - layout.start } as CSSProperties}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <GamePlayer
      rootRef={rootRef}
      label={t("game.screen.label")}
      title={showTitle ? t("game.title") : undefined}
      stats={[
        { label: t("game.stats.level"), value: `${level}/${LEVELS.length}` },
        { label: t("game.stats.moves"), value: game.moves },
      ]}
      paused={paused}
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      ended={won}
      onRestart={() => startLevel(level)}
      restartLabel={t("game.actions.restartAria")}
      onHint={showHint}
      hintDisabled={frozen || won}
      extraControls={
        <button type="button" className={playerControlClass} aria-pressed={!sound.muted} aria-label={sound.muted ? t("player.sound.off") : t("player.sound.on")} onClick={sound.toggleMuted}>
          <SoundIcon muted={sound.muted} />
          <span>{sound.muted ? t("player.sound.off") : t("player.sound.on")}</span>
        </button>
      }
      howTo={howTo}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onClose={onClose}
      cover={cover}
      initialOrientation="device"
    >
      <div
        ref={stageRef}
        className={styles.game}
        style={{ "--rows": Math.max(rows, layout.start + expressionRows), "--rims": layout.start + expressionRows > rows ? 4 : 2, "--board-rows": rows, "--cols": cols, "--entrance": entranceRow, "--pipe-slots": pipeSlots.length } as CSSProperties}
        data-frozen={frozen || undefined}
        data-testid={variant.gameId}
      >
        <div className={styles.field} inert={frozen}>
          <div className={styles.machine} data-side="in" data-cleaned={game.cleaned || undefined}>
            <Leds active={!won} />
          <div
            ref={boardRef}
            key={`board-${round}`}
            className={`${styles.panel} ${styles.board}`}
            role="group"
            aria-label={t("game.boardLabel")}
            aria-disabled={game.cleaned || undefined}
            data-cleaned={game.cleaned || undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onKeyDown={onKeyDown}
          >
            {tiles.map(({ tile, index }) => {
              const position = { "--r": Math.floor(index / cols), "--c": index % cols } as CSSProperties;
              if (tile.kind === "number") {
                return (
                  <div key={tile.id} className={styles.slot} style={position} data-index={index} role="img" aria-label={t("game.cellNumber", { row: Math.floor(index / cols) + 1, column: (index % cols) + 1, value: tile.value })}>
                    <div className={`${styles.face} ${styles.number}`}>{tile.value}</div>
                  </div>
                );
              }
              const isSelected = selected === index;
              const isHinted = hintCells !== null && (hintCells[0] === index || hintCells[1] === index);
              const url = illustrationUrl(tile.picture);
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`${styles.slot} ${styles.tileButton}`}
                  style={position}
                  data-index={index}
                  data-color={tile.color}
                  data-selected={isSelected || undefined}
                  data-hinted={isHinted || undefined}
                  aria-pressed={isSelected}
                  tabIndex={index === (selected ?? -1) || selected === null ? 0 : -1}
                  aria-label={t(isSelected ? "game.cellImageSelected" : "game.cellImage", { row: Math.floor(index / cols) + 1, column: (index % cols) + 1, color: colorName(tile.color) })}
                >
                  <span className={styles.face} data-bounce={bounce && (bounce.a === index || bounce.b === index) ? bounce.key : undefined} style={bounceStyle(index)}>
                    <span className={styles.plate}>{url ? <img src={url} alt="" draggable={false} /> : null}</span>
                  </span>
                </button>
              );
            })}
            {ghosts.map((ghost) => {
              const url = illustrationUrl(ghost.tile.picture);
              return (
                <div
                  key={ghost.key}
                  className={`${styles.slot} ${styles.ghost}${ghost.dust ? ` ${styles.dust}` : ""}`}
                  aria-hidden="true"
                  data-color={ghost.tile.color}
                  style={
                    {
                      "--r": Math.floor(ghost.index / cols),
                      "--c": ghost.index % cols,
                      "--dx": (ghost.origin % cols) - (ghost.index % cols),
                      "--dy": Math.floor(ghost.origin / cols) - Math.floor(ghost.index / cols),
                    } as CSSProperties
                  }
                >
                  <span className={styles.face}>
                    <span className={styles.plate}>{url ? <img src={url} alt="" draggable={false} /> : null}</span>
                  </span>
                </div>
              );
            })}
          </div>
          </div>

          <div className={styles.pipeZone}>
            <div className={styles.pipe} role="img" aria-label={t("game.pipeLabel")} data-busy={pipeBusy || undefined}>
              <span className={styles.collar} data-end="in" aria-hidden="true" />
              <span className={styles.collar} data-end="out" aria-hidden="true" />
              {pipeSlots.map((tile: NumberTile | null, slot) =>
                tile ? (
                  <div key={tile.id} className={styles.token} style={{ "--slot": slot } as CSSProperties}>
                    <span className={`${styles.face} ${styles.number} ${styles.pipeIn}`}>{tile.value}</span>
                  </div>
                ) : null,
              )}
            </div>
          </div>

          <div className={styles.column} style={{ "--tile": layout.tile, "--zone": layout.zone, "--vpipe": layout.start - layout.zone, "--offset-col": offset } as CSSProperties}>
          <div className={styles.machine} data-side="tank">
          <Leds active={reservoir.length > 0} />
          <div key={`tank-${round}`} className={`${styles.panel} ${styles.tankPanel}`}>
            <div className={styles.tank} role="group" aria-label={t("game.reservoirLabel")} data-busy={reservoir.length > 0 || undefined}>
              {reservoir.map((tile) => {
                const isSelected = selectedResult === tile.id;
                const hidden = flyer?.tile === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={styles.resultButton}
                    data-result-tile={tile.id}
                    data-selected={isSelected || undefined}
                    data-hinted={hintResult?.tile === tile.id || undefined}
                    data-flying={hidden || undefined}
                    aria-pressed={isSelected}
                    aria-label={t(isSelected ? "game.resultTileSelected" : "game.resultTile", { value: tile.value })}
                    onClick={() => onResultTile(tile)}
                  >
                    <span className={`${styles.face} ${styles.number} ${styles.resultTile}`}>{tile.value}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </div>
          <div className={styles.vpipe} data-vpipe="" role="img" aria-label={t("game.vpipeLabel")} data-busy={flyer !== null || undefined}>
            <span className={styles.collar} data-end="top" aria-hidden="true" />
            <span className={styles.collar} data-end="bottom" aria-hidden="true" />
          </div>
          <div className={styles.machine} data-side="out" data-won={won || undefined}>
          <Leds active={pipeBusy || won} />
          <div key={`results-${round}`} className={`${styles.panel} ${styles.results}`} role="group" aria-label={t("game.resultsLabel")} style={{ "--panel-rows": expressionRows } as CSSProperties}>
            {Array.from({ length: expressionRows }, (_, row) => (
              <div key={`placeholder-${row}`} className={styles.placeholder} style={{ "--r": row, "--c": offset, "--w": EXPRESSION_WIDTH } as CSSProperties} aria-hidden="true" />
            ))}
            {game.builder.expressions.map((expression) => {
              const showOperator = expression.stage !== "first" && expression.stage !== "second";
              const showEquals = expression.stage === "equals" || expression.stage === "result";
              const complete = expression.stage === "result" && expression.operands !== null && expression.result !== null;
              const waiting = expression.stage === "equals";
              const row = expression.id;
              return (
                <div key={expression.id} className={styles.expression} role="group" aria-label={complete ? t("game.expressionDone", { a: expression.operands?.[0], b: expression.operands?.[1], result: expression.result }) : t("game.expressionLabel", { a: expression.a.value, b: expression.b?.value ?? "?" })}>
                  {renderOperand(expression, "a")}
                  {showOperator ? (
                    <div className={styles.slot} style={{ "--r": row, "--c": offset + 1 } as CSSProperties}>
                      <div className={`${styles.sign} ${styles.pop}`}>{game.operation.symbol}</div>
                    </div>
                  ) : null}
                  {renderOperand(expression, "b")}
                  {showEquals ? (
                    <div className={styles.slot} style={{ "--r": row, "--c": offset + 3 } as CSSProperties}>
                      <div className={`${styles.sign} ${styles.pop}`}>=</div>
                    </div>
                  ) : null}
                  {waiting ? (
                    <div className={styles.slot} style={{ "--r": row, "--c": offset + 4 } as CSSProperties}>
                      <button
                        type="button"
                        className={styles.question}
                        data-question={expression.id}
                        data-target={selectedResult !== null || undefined}
                        data-hinted={hintResult?.expression === expression.id || undefined}
                        aria-label={t("game.questionSlot", { a: expression.operands?.[0], b: expression.operands?.[1] })}
                        onClick={() => onQuestion(expression.id)}
                      >
                        ?
                      </button>
                    </div>
                  ) : null}
                  {complete ? (
                    <div className={styles.slot} style={{ "--r": row, "--c": offset + 4 } as CSSProperties}>
                      <div className={`${styles.face} ${styles.number} ${styles.resultTile} ${styles.lock}`}>{expression.result}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          </div>
          </div>
        </div>

        {won ? (
          <div className={styles.winBar} role="status" data-kind="won">
            <strong>{t("game.won.title")}</strong>
            <span>{lastLevel ? t("game.won.finished") : t("game.won.text")}</span>
            <button type="button" className={styles.action} autoFocus onClick={() => startLevel(lastLevel ? 1 : level + 1)}>
              {lastLevel ? t("game.actions.again") : t("game.actions.next")}
            </button>
          </div>
        ) : (
          <p className={styles.caption}>{status}</p>
        )}

        {flyer ? (
          <div
            key={flyer.key}
            className={styles.flyer}
            data-mode={flyer.mode}
            aria-hidden="true"
            style={{ left: flyer.x - flyer.size / 2, top: flyer.y - flyer.size / 2, width: flyer.size, height: flyer.size, "--x1": `${flyer.x1}px`, "--y1": `${flyer.y1}px`, "--x2": `${flyer.x2}px`, "--y2": `${flyer.y2}px`, "--dx": `${flyer.dx}px`, "--dy": `${flyer.dy}px` } as CSSProperties}
          >
            <span className={`${styles.face} ${styles.number} ${styles.resultTile}`}>{flyer.value}</span>
          </div>
        ) : null}

        <div className={styles.toast} role="status" aria-live="polite">
          {message ? (
            <span key={message.key} className={styles.toastText}>
              {message.text}
            </span>
          ) : null}
        </div>
        <p className={styles.srOnly} aria-live="polite">
          {announcement}
        </p>

        {stuck && !won ? (
          <div className={styles.stuck} role="alert">
            <span>{t("game.stuck")}</span>
            <button type="button" className={styles.action} onClick={shuffle}>
              {t("game.actions.shuffle")}
            </button>
          </div>
        ) : null}

        {portrait ? (
          <div className={styles.overlay} role="alert" data-kind="rotate">
            <PhoneTurnIcon />
            <h2 className={styles.overlayTitle}>{t("game.rotate.title")}</h2>
            <p className={styles.overlayText}>{t("game.rotate.text")}</p>
          </div>
        ) : null}

      </div>
    </GamePlayer>
  );
}

// Un composant par jeu : le catalogue charge chacun à part (une adresse, une carte, un lecteur par jeu).
type VariantGameProps = Omit<MathFlowGameProps, "variant">;
export const AddiFlowGame = (props: VariantGameProps) => <MathFlowGame variant="addition" {...props} />;
export const SoustraFlowGame = (props: VariantGameProps) => <MathFlowGame variant="subtraction" {...props} />;
export const MultipliFlowGame = (props: VariantGameProps) => <MathFlowGame variant="multiplication" {...props} />;
export const DiviFlowGame = (props: VariantGameProps) => <MathFlowGame variant="division" {...props} />;
