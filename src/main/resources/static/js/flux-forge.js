// Flux Forge — Niveau 1. Logique du prototype ARCHI MVP conservée (mêmes
// IDs, même mécanique de mission), augmentée de :
//   - Yamba (setYamba), la flèche contextuelle (guide/clearGuide) et la
//     règle animée (measureWithRuler) ;
//   - i18n complète (fr/en) via game-i18n.js + flux-forge-i18n.js ;
//   - un vrai bouton Quitter (avec confirmation) qui sort du jeu, pas
//     seulement du plein écran ;
//   - des sons courts (Web Audio, aucun fichier audio à héberger) avec
//     bascule 🔊/🔇 ;
//   - un pavé numérique embarqué qui remplace le clavier natif du téléphone
//     pour le champ Réponse, réutilisant exactement la validation existante.
//
// Suit le même motif que multiplication-train.js : la logique pure (sans
// DOM) est exportée et testable sous Node (voir src/test/js/flux-forge.test.js
// + testFluxForge dans build.gradle), le montage DOM est isolé dans
// mountGame() et ne s'exécute jamais sous Node (module.exports).
(function initializeFluxForge(root) {
"use strict";

const gameI18n = typeof require === "function" && typeof module !== "undefined"
    ? require("./game-i18n.js")
    : root.GameI18n;
const fluxForgeI18n = typeof require === "function" && typeof module !== "undefined"
    ? require("./flux-forge-i18n.js")
    : root.FluxForgeI18n;

// ---------- Logique pure (aucune dépendance au DOM, testable sous Node) ----------

const EXPECTED_ANSWERS = Object.freeze({
  surface: 8,
  volume: 16,
  liters: 4000,
  time: 200,
});

function isCorrectAnswer(kind, value){
  return value === EXPECTED_ANSWERS[kind];
}

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

// Empreinte de référence de la maison à l'échelle 1 (le toit est l'élément
// le plus large) : sert à calculer --group-scale depuis les dimensions
// RÉELLEMENT rendues de la scène plutôt que des paliers CSS devinés à
// l'avance ou les vw du viewport (la scène n'occupe jamais tout l'écran).
const HOUSE_REF_WIDTH = 470;
const HOUSE_REF_HEIGHT = 410;
const TARGET_WIDTH_RATIO = 0.66;
const TARGET_HEIGHT_RATIO = 0.8;

function computeGroupScale(sceneWidth, sceneHeight){
  if(!sceneWidth || !sceneHeight) return null;
  const byWidth = (sceneWidth * TARGET_WIDTH_RATIO) / HOUSE_REF_WIDTH;
  const byHeight = (sceneHeight * TARGET_HEIGHT_RATIO) / HOUSE_REF_HEIGHT;
  return Math.max(0.3, Math.min(1, byWidth, byHeight));
}

// side : "bottom" (longueur, règle horizontale sous l'objet), "right"
// (largeur, règle verticale à droite) ou "left" (hauteur, règle verticale à
// gauche). Prend des rectangles simples {left,top,right,bottom,width,height}
// (pas de vrais DOM rects) : entièrement pur, donc testable sans navigateur.
function computeRulerGeometry(side, targetRect, sceneRect, offset){
  const isVertical = side !== 'bottom';
  let left, top, width, height;
  if(side === 'bottom'){
    left = targetRect.left - sceneRect.left;
    top = targetRect.bottom - sceneRect.top + offset;
    width = targetRect.width; height = 6;
  } else if(side === 'right'){
    left = targetRect.right - sceneRect.left + offset;
    top = targetRect.top - sceneRect.top;
    width = 6; height = targetRect.height;
  } else {
    left = targetRect.left - sceneRect.left - offset - 6;
    top = targetRect.top - sceneRect.top;
    width = 6; height = targetRect.height;
  }
  return { left, top, width, height, isVertical, isLeft: side === 'left' };
}

// Position de départ (près du bouton Règle) avant l'animation vers l'arête
// mesurée, bornée pour ne jamais partir hors de la scène visible.
function computeRulerStart(startRect, sceneRect, sceneWidth, sceneHeight){
  return {
    left: clamp(startRect.left - sceneRect.left, 0, sceneWidth - 20),
    top: clamp(startRect.top - sceneRect.top, 0, sceneHeight - 20),
  };
}

// Le champ Réponse est en pleine largeur en mode portrait : caler le pavé
// numérique dans un coin ne suffit pas à lui seul à éviter le
// chevauchement. Calcule précisément le débordement entre le bas du champ
// (qui bouge avec le défilement) et le haut du pavé (position:fixed, donc
// toujours à la même hauteur d'écran) — null si aucun défilement n'est
// nécessaire.
function computeKeypadScrollDelta(inputRect, keypadRect, margin){
  const overlap = inputRect.bottom - keypadRect.top;
  if(overlap > 0) return overlap + margin;
  if(inputRect.top < 0) return inputRect.top - margin;
  return null;
}

// ---------- Guidage Yamba : quel message/quelle cible pour l'état courant
// de chaque mission. Reprend exactement les enchaînements if/else déjà
// utilisés par showMode(), extraits ici pour rester testables sans DOM. ----------

function surfaceGuide(state){
  if(state.roofPlaced) return { key: 'yambaSurfaceDone', target: null };
  if(state.surfaceDone) return { key: 'yambaAddRoof', target: 'roofBtn' };
  if(state.measured) return { key: 'yambaCalcWallSurface', target: 'answer' };
  if(state.wallPlaced) return { key: 'yambaMeasureWall', target: 'rulerBtn' };
  return { key: 'yambaStartWall', target: 'slot' };
}

function volumeGuide(state){
  if(state.volumeDone) return { key: 'yambaVolumeDone', target: null };
  if(state.volumeMeasured) return { key: 'yambaCalcVolume', target: 'answer' };
  return { key: 'yambaStartVolume', target: 'rulerBtn' };
}

function waterGuide(state){
  if(state.pumpDone) return { key: 'yambaWaterDone', target: null };
  if(state.timeDone) return { key: 'yambaPumpReady', target: 'pumpStart' };
  if(state.litersDone) return { key: 'yambaCalcTime', target: 'answer' };
  return { key: 'yambaStartWater', target: 'answer' };
}

function missionGuide(missionMode, state){
  if(missionMode === 'surface') return surfaceGuide(state);
  if(missionMode === 'volume') return volumeGuide(state);
  return waterGuide(state);
}

// ---------- Montage DOM (jamais exécuté sous Node : voir la garde
// root.document en bas du fichier) ----------

function mountGame(document){
const $=id=>document.getElementById(id);

const lang = gameI18n.resolveLanguage();
document.documentElement.lang = lang;
gameI18n.applyStaticTranslations(document, fluxForgeI18n, lang);
function t(key, params){ return gameI18n.translate(fluxForgeI18n, lang, key, params); }

let mode='surface';
let wallPlaced=false, measured=false, surfaceDone=false, roofPlaced=false;
let volumeMeasured=false, volumeDone=false;
let litersDone=false, timeDone=false, pumpDone=false;

function done(id){const e=$(id); if(!e.classList.contains('done')){e.classList.add('done');e.textContent='✓ '+e.textContent.slice(3)}}
function status(text,c=''){const e=$('status');e.textContent=text;e.className='status '+c}
function select(id){document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active'));$(id).classList.add('active')}

function setYamba(text){
  $('yambaMessage').textContent = text;
}

// ---------- Sons ----------
// Web Audio générés à la volée (aucun fichier à héberger), volontairement
// doux : sinusoïdales/triangles courtes, jamais de sawtooth agressif — en
// particulier pour la mauvaise réponse, qui reste discrète et non punitive.
let soundEnabled = true;
let audioCtx = null;

function ensureAudioContext(){
  if(!audioCtx){
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtor) return null;
    audioCtx = new AudioCtor();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playTone(frequency, duration, volume, type, delay){
  if(!soundEnabled) return;
  const ctx = ensureAudioContext();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + (delay || 0);
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function playSequence(notes, gap, type, volume){
  notes.forEach((note, index) => playTone(note, 0.14, volume, type, index * gap));
}

function soundBuild(){ playSequence([392, 494], 0.07, 'triangle', 0.05); }
function soundRuler(){ playTone(660, 0.09, 0.03, 'sine', 0); }
function soundCorrect(){ playSequence([523, 659, 784], 0.08, 'triangle', 0.06); }
function soundWrong(){ playTone(233, 0.18, 0.028, 'sine', 0); }

function updateSoundButton(){
  const btn = $('soundToggle');
  btn.textContent = soundEnabled ? '🔊' : '🔇';
  btn.setAttribute('aria-pressed', String(soundEnabled));
  btn.setAttribute('aria-label', soundEnabled ? t('soundOn') : t('soundOff'));
}

$('soundToggle').onclick = () => {
  soundEnabled = !soundEnabled;
  if(soundEnabled) ensureAudioContext();
  updateSoundButton();
};
updateSoundButton();

// ---------- Quitter ----------
// Reprend le motif déjà utilisé par les autres jeux autonomes
// (returnToCatalogue() dans multiplication-train.js/fraction-river.js) :
// dans l'iframe du lanceur du catalogue, on prévient le parent qui gère
// lui-même la sortie du plein écran ; sinon on navigue directement.
function exitGame(){
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'portal-game:exit' }, window.location.origin);
      return;
    } catch (error) {
      // Origine différente ou parent inaccessible : on se rabat sur la
      // navigation directe ci-dessous.
    }
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  window.location.assign('/app/jeux');
}

function openQuitModal(){ $('quitModal').hidden = false; }
function closeQuitModal(){ $('quitModal').hidden = true; }

$('quitBtn').onclick = openQuitModal;
$('quitCancel').onclick = closeQuitModal;
$('quitConfirm').onclick = exitGame;
$('quitModal').addEventListener('click', (event) => {
  if(event.target === $('quitModal')) closeQuitModal();
});
document.addEventListener('keydown', (event) => {
  if(event.key === 'Escape' && !$('quitModal').hidden) closeQuitModal();
});

// ---------- Pavé numérique embarqué ----------
// Le champ Réponse est readonly (voir flux-forge.html) : aucun clavier
// natif ne doit plus apparaître. VALIDER du pavé appelle exactement la même
// fonction handleValidate() que le bouton Valider existant — une seule
// logique de correction.
const keypad = $('keypad');
const answerInput = $('answer');

function openKeypad(){
  // Un tap réel déclenche à la fois 'click' et 'focus' (les deux sont
  // écoutés ci-dessous : un clic synthétique/programmatique ou un focus
  // clavier/lecteur d'écran ne déclenchent pas forcément les deux) — sans
  // cette garde, le calcul de défilement ci-dessous s'exécuterait deux fois
  // de suite et se marcherait dessus.
  if(!keypad.hidden) return;
  keypad.hidden = false;
  setTimeout(() => {
    const delta = computeKeypadScrollDelta(
      answerInput.getBoundingClientRect(),
      keypad.getBoundingClientRect(),
      16,
    );
    if(delta !== null){
      window.scrollBy({ top: delta, left: 0, behavior: 'instant' });
    }
  }, 50);
}
function closeKeypad(){
  keypad.hidden = true;
}

answerInput.addEventListener('focus', openKeypad);
answerInput.addEventListener('click', openKeypad);

keypad.querySelectorAll('[data-digit]').forEach((key) => {
  key.addEventListener('click', () => {
    if(answerInput.value.length >= 6) return;
    answerInput.value += key.dataset.digit;
  });
});
$('keypadClear').onclick = () => { answerInput.value = ''; };
$('keypadBackspace').onclick = () => { answerInput.value = answerInput.value.slice(0, -1); };
$('keypadValidate').onclick = () => handleValidate();

document.addEventListener('pointerdown', (event) => {
  if(keypad.hidden) return;
  if(keypad.contains(event.target) || answerInput.contains(event.target) || event.target === answerInput) return;
  closeKeypad();
});

// ---------- Échelle du décor (maison / bloc volume / réservoir) ----------
// --group-scale (voir computeGroupScale ci-dessus) est posée sur :root pour
// être héritée par les trois groupes graphiques.
function updateGroupScale(){
  const scene = document.querySelector('.ff-app .scene');
  if(!scene) return;
  const r = scene.getBoundingClientRect();
  const scale = computeGroupScale(r.width, r.height);
  if(scale === null) return;
  document.documentElement.style.setProperty('--group-scale', scale.toFixed(3));
}

let scaleSettleTimers = [];
function scheduleGroupScaleUpdate(){
  updateGroupScale();
  scaleSettleTimers.forEach(clearTimeout);
  scaleSettleTimers = [60, 200, 500, 1000].map((ms) => setTimeout(updateGroupScale, ms));
}

window.addEventListener('resize', scheduleGroupScaleUpdate);
window.addEventListener('orientationchange', scheduleGroupScaleUpdate);
scheduleGroupScaleUpdate();

// ---------- Flèche contextuelle ----------
// Une seule flèche à la fois : appeler guide() en remplace toujours une
// précédente. Jamais de coordonnées desktop figées : la position se
// recalcule à chaque resize/orientationchange/scroll, plus quelques
// passages différés juste après l'affichage pour absorber un éventuel
// décalage de mise en page tardif (image/police qui finit de charger).
// Volontairement PAS de boucle requestAnimationFrame perpétuelle : rAF est
// mis en pause par le navigateur dès que l'onglet n'est plus au premier
// plan/composité, ce qui figerait silencieusement la flèche.

let guideTargetEl = null;
let guideSettleTimers = [];

function positionGuideArrow(){
  const arrow = $('guideArrow');
  if(!guideTargetEl || !guideTargetEl.isConnected) return;
  const rect = guideTargetEl.getBoundingClientRect();
  if(rect.width === 0 && rect.height === 0) return;
  arrow.style.left = Math.round(rect.left + rect.width/2 - 16) + 'px';
  arrow.style.top = Math.round(rect.top - 44) + 'px';
}

function guide(target){
  if(!target) return;
  guideTargetEl = target;
  $('guideArrow').hidden = false;
  guideSettleTimers.forEach(clearTimeout);
  guideSettleTimers = [60, 200, 500, 1000].map((ms) => setTimeout(positionGuideArrow, ms));
  positionGuideArrow();
}

function clearGuide(){
  guideTargetEl = null;
  guideSettleTimers.forEach(clearTimeout);
  guideSettleTimers = [];
  $('guideArrow').hidden = true;
}

window.addEventListener('resize', positionGuideArrow);
window.addEventListener('orientationchange', () => setTimeout(positionGuideArrow, 60));
window.addEventListener('scroll', positionGuideArrow, true);

// setYamba + guide sont presque toujours appelés ensemble : ce raccourci
// évite de les oublier l'un sans l'autre à chaque étape.
function say(message, target){
  setYamba(message);
  if(target) guide(target); else clearGuide();
}

// Résout une cible de guidage symbolique (voir surfaceGuide/volumeGuide/
// waterGuide ci-dessus) vers l'élément DOM réel correspondant.
function resolveGuideTarget(name){
  if(!name) return null;
  if(name === 'answer') return answerInput;
  return $(name);
}

// Dès qu'un enfant touche le champ réponse, la flèche qui pointait dessus
// n'a plus de raison d'y rester.
answerInput.addEventListener('focus', () => {
  if(guideTargetEl === answerInput) guide($('validate'));
});

// ---------- Règle animée ----------
// Ne révèle jamais un nombre avant que la règle ne se soit visuellement
// alignée sur l'arête mesurée : apparition près de l'outil, déplacement
// jusqu'à l'arête, puis alignement, puis seulement alors la mesure.

// Aucune mesure ne doit disparaître une fois posée : chaque appel crée sa
// PROPRE règle + étiquette (jamais un seul élément réutilisé/déplacé), qui
// reste affichée tant que la mission en cours ne change pas. activeRulers
// garde la liste des règles de la mission courante pour pouvoir les
// effacer d'un coup au moment — et seulement au moment — où l'on quitte
// vraiment cette mission (voir clearAllRulers, appelée depuis showMode()).
let activeRulers = [];

function createRulerElement(){
  const scene = document.querySelector('.ff-app .scene');
  const ruler = document.createElement('div');
  ruler.className = 'ruler';
  const labelEl = document.createElement('span');
  labelEl.className = 'ruler-label';
  ruler.appendChild(labelEl);
  scene.appendChild(ruler);
  activeRulers.push(ruler);
  return { ruler, labelEl };
}

function clearAllRulers(){
  activeRulers.forEach((ruler) => ruler.remove());
  activeRulers = [];
}

function measureWithRuler({ target, side, label, delay = 0 }){
  return new Promise((resolve) => {
    setTimeout(() => {
      const { ruler, labelEl } = createRulerElement();
      const scene = document.querySelector('.ff-app .scene');
      const sceneR = scene.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      const startR = $('rulerBtn').getBoundingClientRect();
      const OFFSET = 10;

      const geom = computeRulerGeometry(side, tr, sceneR, OFFSET);
      ruler.classList.toggle('ruler-v', geom.isVertical);
      ruler.classList.toggle('ruler-left', geom.isLeft);

      const start = computeRulerStart(startR, sceneR, scene.clientWidth, scene.clientHeight);
      ruler.style.transition = 'none';
      ruler.style.opacity = '0';
      ruler.style.left = start.left + 'px';
      ruler.style.top = start.top + 'px';
      ruler.style.width = (side === 'bottom' ? 20 : 6) + 'px';
      ruler.style.height = (side === 'bottom' ? 6 : 20) + 'px';
      void ruler.offsetWidth; // force reflow avant de (ré)activer la transition

      ruler.style.transition = 'left .35s ease, top .35s ease, opacity .2s ease';
      ruler.style.opacity = '1';
      ruler.style.left = geom.left + 'px';
      ruler.style.top = geom.top + 'px';

      setTimeout(() => {
        ruler.style.transition = 'width .3s ease, height .3s ease';
        ruler.style.width = geom.width + 'px';
        ruler.style.height = geom.height + 'px';
        setTimeout(() => {
          labelEl.textContent = label;
          ruler.classList.add('ruler-visible');
          resolve();
        }, 320);
      }, 380);
    }, delay);
  });
}

let rulerBusy = false;
async function runRulerSequence(steps){
  if(rulerBusy) return;
  rulerBusy = true;
  soundRuler();
  for(const step of steps){
    await measureWithRuler(step);
  }
  rulerBusy = false;
}

// ---------- Missions ----------

function currentMissionState(){
  return { wallPlaced, measured, surfaceDone, roofPlaced, volumeMeasured, volumeDone, litersDone, timeDone, pumpDone };
}

function applyGuide(missionMode){
  const { key, target } = missionGuide(missionMode, currentMissionState());
  say(t(key), resolveGuideTarget(target));
}

function showMode(next){
 // Rester dans la même mission (ex. re-cliquer un outil déjà actif) ne doit
 // jamais effacer les règles/mesures déjà posées ni la réponse en cours de
 // saisie : on ne réinitialise que lors d'un vrai changement de mission.
 const changingMode = mode !== next;
 mode=next;
 $('cabinZone').style.display=next==='surface'?'block':'none';
 $('volumeZone').style.display=next==='volume'?'block':'none';
 $('waterZone').style.display=next==='water'?'block':'none';
 $('surfacePanel').style.display=next==='surface'?'block':'none';
 $('volumePanel').style.display=next==='volume'?'block':'none';
 $('waterPanel').style.display=next==='water'?'block':'none';
 $('tabSurface').classList.toggle('on',next==='surface');
 $('tabVolume').classList.toggle('on',next==='volume');
 $('tabWater').classList.toggle('on',next==='water');
 if(changingMode){
   answerInput.value='';
   clearAllRulers();
 }

 if(next==='surface'){
   $('badge').textContent=t('badgeSurface');
 }else if(next==='volume'){
   $('badge').textContent=t('badgeVolume');
   done('v1');
 }else{
   $('badge').textContent=t('badgeWater');
   done('w1');
 }
 applyGuide(next);
}

$('tabSurface').onclick=()=>showMode('surface');
$('tabVolume').onclick=()=>showMode('volume');
$('tabWater').onclick=()=>showMode('water');

$('slot').onclick=()=>{
 if(mode!=='surface'||wallPlaced)return;
 wallPlaced=true;$('slot').style.display='none';$('wall').style.display='block';done('s1');
 soundBuild();
 applyGuide('surface');
 status(t('statusWallPlaced'),'ok');
};

$('wallBtn').onclick=()=>{showMode('surface');select('wallBtn')};
$('roofBtn').onclick=()=>{
 showMode('surface');select('roofBtn');
 if(!surfaceDone)return status(t('statusCalcSurfaceFirst'),'bad');
 if(!roofPlaced){
   roofPlaced=true;$('roof').style.display='block';done('s4');
   soundBuild();
   applyGuide('surface');
   status(t('statusBravo'),'ok');
 }
};
$('blockBtn').onclick=()=>{showMode('volume');select('blockBtn')};
$('tankBtn').onclick=()=>{showMode('water');select('tankBtn')};

$('rulerBtn').onclick=async ()=>{
 select('rulerBtn');
 if(mode==='surface'){
   if(!wallPlaced)return status(t('statusPlaceWallFirst'),'bad');
   if(measured || rulerBusy) return;
   clearGuide();
   await runRulerSequence([
     { target: $('wall'), side: 'bottom', label: '4 m' },
     { target: $('wall'), side: 'right', label: '2 m', delay: 150 },
   ]);
   measured=true;done('s2');
   applyGuide('surface');
   status(t('statusWallMeasured'),'ok');
 }else if(mode==='volume'){
   if(volumeMeasured || rulerBusy) return;
   clearGuide();
   const block = $('block3d');
   await runRulerSequence([
     { target: block, side: 'bottom', label: '4 m' },
     { target: block, side: 'right', label: '2 m', delay: 150 },
     { target: block, side: 'left', label: '2 m', delay: 150 },
   ]);
   volumeMeasured=true;done('v2');
   applyGuide('volume');
   status(t('statusVolumeMeasured'),'ok');
 }else{
   status(t('statusWaterCapacityKnown'),'ok');
 }
};

$('calcBtn').onclick=()=>{select('calcBtn');answerInput.focus()};

$('hint').onclick=()=>{
 if(mode==='surface'){ answerInput.value=String(EXPECTED_ANSWERS.surface);status(t('hintSurface'));guide($('validate')); }
 else if(mode==='volume'){ answerInput.value=String(EXPECTED_ANSWERS.volume);status(t('hintVolume'));guide($('validate')); }
 else{
   if(!litersDone){answerInput.value=String(EXPECTED_ANSWERS.liters);status(t('hintLiters'));guide($('validate'))}
   else if(!timeDone){answerInput.value=String(EXPECTED_ANSWERS.time);status(t('hintTime'));guide($('validate'))}
   else status(t('statusActivatePump'))
 }
};

function handleValidate(){
 const v=Number(answerInput.value);
 clearGuide();
 // Le pavé ne doit rester ouvert qu'entre le moment où l'enfant touche le
 // champ et celui où il valide : il se referme systématiquement ici, et ne
 // réapparaît qu'en retouchant le champ (voir openKeypad ci-dessus).
 closeKeypad();
 if(mode==='surface'){
   if(!measured)return status(t('statusMeasureWallFirst'),'bad');
   if(isCorrectAnswer('surface', v)){
     surfaceDone=true;done('s3');
     soundCorrect();
     applyGuide('surface');
     status(t('statusSurfaceOk'),'ok');
   } else { soundWrong(); status(t('statusTrySurface'),'bad'); guide(answerInput); }
 }else if(mode==='volume'){
   if(!volumeMeasured)return status(t('statusMeasure3Dims'),'bad');
   if(isCorrectAnswer('volume', v)){
     volumeDone=true;done('v3');
     soundCorrect();
     say(t('yambaVolumeCorrect'), $('tankBtn'));
     status(t('statusVolumeOk'),'ok');
   } else { soundWrong(); status(t('statusTryVolume'),'bad'); guide(answerInput); }
 }else{
   if(!litersDone){
     if(isCorrectAnswer('liters', v)){
       litersDone=true;done('w2');answerInput.value='';
       soundCorrect();
       applyGuide('water');
       status(t('statusLitersOkNextTime'),'ok');
     } else { soundWrong(); status(t('statusReminderM3'),'bad'); guide(answerInput); }
   } else if(!timeDone){
     if(isCorrectAnswer('time', v)){
       timeDone=true;done('w3');answerInput.value='';$('pumpStart').classList.remove('locked');
       soundCorrect();
       applyGuide('water');
       status(t('statusTimeOk'),'ok');
     } else { soundWrong(); status(t('statusTimeFormula'),'bad'); guide(answerInput); }
   } else status(t('statusClickPump'));
 }
}

$('validate').onclick = handleValidate;

// surfaceDone/roofPlaced ne changent qu'une fois la surface validée : ce
// message diffère volontairement du guidage générique (mentionne
// explicitement le toit), donc pas de applyGuide() ici.
function surfaceCorrectMessage(){
  say(t('yambaSurfaceCorrect'), $('roofBtn'));
}

function startPump(){
 showMode('water');
 select('pumpBtn');

 if(!timeDone){
   $('pumpStart').classList.add('locked');
   say(t('yambaPumpLocked'), answerInput);
   status(t('statusCalcBeforePump'),'bad');
   return;
 }

 $('pumpStart').classList.remove('locked');
 if(pumpDone){
   status(t('statusAlreadyFull'),'ok');
   return;
 }

 pumpDone=true;
 done('w4');
 clearGuide();
 $('flow').style.display='block';
 $('waterInPipe').style.width='100%';
 $('water').style.height='92%';
 $('pumpStart').textContent=t('pumpRunningLabel');
 setYamba(t('yambaPumping'));
 status(t('statusPumpRunning'),'ok');

 let litres=0;
 const duration=2400;
 const stepMs=60;
 const inc=4000/(duration/stepMs);
 const timer=setInterval(()=>{
   litres=Math.min(4000, litres+inc);
   $('levelText').textContent=Math.round(litres)+' L';
   if(litres>=4000){
     clearInterval(timer);
     $('levelText').textContent='4000 L';
     $('flow').style.display='none';
     $('pumpStart').textContent=t('pumpFilledLabel');
     $('badge').textContent=t('badgeComplete');
     soundCorrect();
     say(t('yambaMissionComplete'));
     status(t('statusMissionSuccess'),'ok');
   }
 }, stepMs);
}

$('pumpBtn').onclick=startPump;
$('pumpStart').onclick=(e)=>{e.stopPropagation(); startPump();};

// Rétablit le message spécifique "Correct : 8 m² ! Pose maintenant le
// toit." (au lieu du guidage générique "Ajoutons le toit") juste après la
// validation de la surface.
const originalHandleValidate = handleValidate;
handleValidate = function patchedHandleValidate(){
  const wasSurfaceDone = surfaceDone;
  originalHandleValidate();
  if(!wasSurfaceDone && surfaceDone){
    surfaceCorrectMessage();
  }
};
$('validate').onclick = handleValidate;

say(t('yambaStartWall'), $('slot'));
}

const api = {
  EXPECTED_ANSWERS,
  isCorrectAnswer,
  clamp,
  computeGroupScale,
  computeRulerGeometry,
  computeRulerStart,
  computeKeypadScrollDelta,
  surfaceGuide,
  volumeGuide,
  waterGuide,
  missionGuide,
  mountGame,
};

if (root.document) {
  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", () => mountGame(root.document));
  } else {
    mountGame(root.document);
  }
}

root.FluxForgeGame = api;
if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
})(typeof globalThis !== "undefined" ? globalThis : window);
