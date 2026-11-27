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
  rescueGame,
  swapGame,
  tickGame,
  unreachableNumbers,
  type Expression,
  type GameEvent,
  type GameState,
  type ImageTile,
  type NumberTile,
} from "@mbuyamba/math-flow";

import { illustrationUrl } from "../../illustrations/illustrations";
import type { SoundEffect } from "../audio/sound-effects";
import { useGameAudio } from "../audio/useGameAudio";
import { useGameLoading } from "../loading/GameLoaderHost";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import { dragDirection, expressionOffset, KEY_DIRECTION, neighbour, scanFrom, EXPRESSION_WIDTH, type Direction } from "./geometry";
import styles from "./MultipliFlow.module.css";

export interface MultipliFlowGameProps {
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
}

interface Bounce {
  key: number;
  a: number;
  b: number;
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

// Multipli'Flow : deux tableaux reliés par un tuyau. À gauche, des tuiles imagées colorées : en alignant 3 tuiles de la même couleur
// ou plus, le joueur les détruit et ouvre des chemins aux nombres. Ceux-ci avancent seuls jusqu'au tuyau, le traversent un par un et
// forment des multiplications dans le second tableau. La logique est tout entière dans @mbuyamba/math-flow (pure, testée) ; ici : le
// dessin, les gestes (toucher, glisser, clavier), les animations et les sons.
export function MultipliFlowGame({ showTitle = true, active = true, fullscreen, onFullscreenChange, onClose, cover, initialLevel = 1, initialSeed }: MultipliFlowGameProps) {
  const { t } = useTranslation("games");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const loading = useGameLoading();
  useEffect(() => {
    loading.milestone("mounted");
    loading.ready();
  }, [loading]);

  const [level, setLevel] = useState(() => clampLevel(initialLevel));
  const [game, setGame] = useState<GameState>(() => newGame(clampLevel(initialLevel), initialSeed ?? freshSeed()).state);
  const gameRef = useRef(game);
  const [round, setRound] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [bounce, setBounce] = useState<Bounce | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [hintCells, setHintCells] = useState<readonly [number, number] | null>(null);
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
        else if (event.type === "expression-result") {
          play("cardReveal");
          const expression = gameRef.current.builder.expressions[event.expression];
          if (expression?.operands) setAnnouncement(t("multipliFlow.game.expressionDone", { a: expression.operands[0], b: expression.operands[1], result: event.value }));
        } else if (event.type === "won") play("levelComplete");
      }
    },
    [play, t],
  );
  useEffect(() => {
    if (frozen || game.status !== "playing") return;
    const timer = window.setInterval(() => {
      const step = tickGame(gameRef.current);
      if (step.events.length === 0) return;
      commit(step.state);
      announce(step.events);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [frozen, game.status, commit, announce]);

  const startLevel = useCallback(
    (levelId: number) => {
      const id = clampLevel(levelId);
      commit(newGame(id, freshSeed()).state);
      setLevel(id);
      setRound((current) => current + 1);
      setSelected(null);
      setBounce(null);
      setGhosts([]);
      setHintCells(null);
      setMessage(null);
      setStuck(false);
      setPaused(false);
    },
    [commit],
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
        if (outcome.reason === "dead-end") showMessage(t("multipliFlow.game.messages.deadEnd"));
        else if (outcome.reason === "no-alignment") showMessage(t("multipliFlow.game.messages.noAlignment"));
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
      showMessage(t("multipliFlow.game.messages.shuffleFailed"));
      return;
    }
    commit(rescued.state);
    setStuck(false);
    play("tileSwap");
    showMessage(t("multipliFlow.game.messages.shuffled"));
  }, [commit, play, showMessage, t]);

  const showHint = useCallback(() => {
    const advice = engineHint(gameRef.current);
    if (advice.kind === "move") {
      setHintCells(advice.move);
      play("hint");
      counter.current += 1;
      const key = counter.current;
      later(() => setHintCells((value) => (value === advice.move && key === counter.current ? null : value)), HINT_MS);
    } else if (advice.kind === "none-needed") {
      showMessage(t("multipliFlow.game.status.flowing"));
    } else {
      showMessage(t("multipliFlow.game.stuck"));
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

  const status = won
    ? t("multipliFlow.game.status.won")
    : selected !== null
      ? t("multipliFlow.game.status.selected")
      : blocked === 0
        ? t("multipliFlow.game.status.flowing")
        : t("multipliFlow.game.status.play");
  const colorName = (color: ImageTile["color"]) => t(`multipliFlow.game.colors.${color}`);
  const howTo = [1, 2, 3].map((number) => ({ title: t(`multipliFlow.game.howTo.step${number}Title`), text: t(`multipliFlow.game.howTo.step${number}`) }));
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
        <div className={`${styles.face} ${styles.number} ${styles.arrive}`} style={{ "--fx": -(column + 0.5), "--fy": entranceRow - expression.id } as CSSProperties}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <GamePlayer
      rootRef={rootRef}
      label={t("multipliFlow.game.screen.label")}
      title={showTitle ? t("multipliFlow.game.title") : undefined}
      stats={[
        { label: t("multipliFlow.game.stats.level"), value: `${level}/${LEVELS.length}` },
        { label: t("multipliFlow.game.stats.moves"), value: game.moves },
      ]}
      paused={paused}
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      ended={won}
      onRestart={() => startLevel(level)}
      restartLabel={t("multipliFlow.game.actions.restartAria")}
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
        style={{ "--rows": rows, "--cols": cols, "--entrance": entranceRow, "--pipe-slots": pipeSlots.length } as CSSProperties}
        data-frozen={frozen || undefined}
        data-testid="multipli-flow"
      >
        <div className={styles.field} inert={frozen}>
          <div className={styles.machine} data-side="in">
            <Leds active={!won} />
          <div
            ref={boardRef}
            key={`board-${round}`}
            className={`${styles.panel} ${styles.board}`}
            role="group"
            aria-label={t("multipliFlow.game.boardLabel")}
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
                  <div key={tile.id} className={styles.slot} style={position} data-index={index} role="img" aria-label={t("multipliFlow.game.cellNumber", { row: Math.floor(index / cols) + 1, column: (index % cols) + 1, value: tile.value })}>
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
                  aria-label={t(isSelected ? "multipliFlow.game.cellImageSelected" : "multipliFlow.game.cellImage", { row: Math.floor(index / cols) + 1, column: (index % cols) + 1, color: colorName(tile.color) })}
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
                  className={`${styles.slot} ${styles.ghost}`}
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
            <div className={styles.pipe} role="img" aria-label={t("multipliFlow.game.pipeLabel")} data-busy={pipeBusy || undefined}>
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

          <div className={styles.machine} data-side="out" data-won={won || undefined}>
          <Leds active={pipeBusy || won} />
          <div key={`results-${round}`} className={`${styles.panel} ${styles.results}`} role="group" aria-label={t("multipliFlow.game.resultsLabel")}>
            {Array.from({ length: expressionRows }, (_, row) => (
              <div key={`placeholder-${row}`} className={styles.placeholder} style={{ "--r": row, "--c": offset, "--w": EXPRESSION_WIDTH } as CSSProperties} aria-hidden="true" />
            ))}
            {game.builder.expressions.map((expression) => {
              const showOperator = expression.stage !== "first" && expression.stage !== "second";
              const showEquals = expression.stage === "equals" || expression.stage === "result";
              const complete = expression.stage === "result" && expression.operands !== null && expression.result !== null;
              return (
                <div key={expression.id} className={styles.expression} role="group" aria-label={complete ? t("multipliFlow.game.expressionDone", { a: expression.operands?.[0], b: expression.operands?.[1], result: expression.result }) : t("multipliFlow.game.expressionLabel", { a: expression.a.value, b: expression.b?.value ?? "?" })}>
                  {renderOperand(expression, "a")}
                  {showOperator ? (
                    <div className={styles.slot} style={{ "--r": expression.id, "--c": offset + 1 } as CSSProperties}>
                      <div className={`${styles.sign} ${styles.pop}`}>{game.operation.symbol}</div>
                    </div>
                  ) : null}
                  {renderOperand(expression, "b")}
                  {showEquals ? (
                    <div className={styles.slot} style={{ "--r": expression.id, "--c": offset + 3 } as CSSProperties}>
                      <div className={`${styles.sign} ${styles.pop}`}>=</div>
                    </div>
                  ) : null}
                  {complete ? (
                    <div className={styles.slot} style={{ "--r": expression.id, "--c": offset + 4 } as CSSProperties}>
                      <div className={`${styles.face} ${styles.number} ${styles.resultTile} ${styles.pop}`}>{expression.result}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {won ? (
          <div className={styles.winBar} role="status" data-kind="won">
            <strong>{t("multipliFlow.game.won.title")}</strong>
            <span>{lastLevel ? t("multipliFlow.game.won.finished") : t("multipliFlow.game.won.text")}</span>
            <button type="button" className={styles.action} autoFocus onClick={() => startLevel(lastLevel ? 1 : level + 1)}>
              {lastLevel ? t("multipliFlow.game.actions.again") : t("multipliFlow.game.actions.next")}
            </button>
          </div>
        ) : (
          <p className={styles.caption}>{status}</p>
        )}

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
            <span>{t("multipliFlow.game.stuck")}</span>
            <button type="button" className={styles.action} onClick={shuffle}>
              {t("multipliFlow.game.actions.shuffle")}
            </button>
          </div>
        ) : null}

        {portrait ? (
          <div className={styles.overlay} role="alert" data-kind="rotate">
            <PhoneTurnIcon />
            <h2 className={styles.overlayTitle}>{t("multipliFlow.game.rotate.title")}</h2>
            <p className={styles.overlayText}>{t("multipliFlow.game.rotate.text")}</p>
          </div>
        ) : null}

      </div>
    </GamePlayer>
  );
}
