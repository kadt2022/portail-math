// Flux Forge — Niveau 1. Logique du prototype ARCHI MVP conservée (mêmes
// IDs, même mécanique de mission), augmentée de trois systèmes réutilisables
// et indépendants des exercices eux-mêmes :
//   - Yamba (setYamba) : message affiché dans le bandeau du haut ;
//   - la flèche contextuelle (guide/clearGuide) : une seule à la fois,
//     repositionnée en continu (resize, rotation, défilement) tant qu'elle
//     est visible, et qui disparaît sur l'action attendue ;
//   - la règle animée (measureWithRuler) : la règle se déplace et s'aligne
//     visuellement sur l'arête mesurée avant que le nombre n'apparaisse.
(function () {
"use strict";

const $=id=>document.getElementById(id);
let mode='surface';
let wallPlaced=false, measured=false, surfaceDone=false, roofPlaced=false;
let volumeMeasured=false, volumeDone=false;
let waterStep=1, litersDone=false, timeDone=false, pumpDone=false;

function done(id){const e=$(id); if(!e.classList.contains('done')){e.classList.add('done');e.textContent='✓ '+e.textContent.slice(3)}}
function status(t,c=''){const e=$('status');e.textContent=t;e.className='status '+c}
function select(id){document.querySelectorAll('.tool').forEach(x=>x.classList.remove('active'));$(id).classList.add('active')}

function setYamba(text){
  $('yambaMessage').textContent = text;
}

// ---------- Échelle du décor (maison / bloc volume / réservoir) ----------
// --group-scale est calculée depuis les dimensions RÉELLEMENT rendues de
// .scene (jamais les vw du viewport, ni des paliers CSS devinés à l'avance) :
// reste juste quel que soit l'espace que prend l'habillage (en-tête, bandeau
// Yamba) autour d'elle, en portrait comme en paysage (§1-4 du correctif).
// Posée sur :root pour être héritée par les trois groupes graphiques.
const HOUSE_REF_WIDTH = 470;   // empreinte du toit à l'échelle 1 (élément le plus large)
const HOUSE_REF_HEIGHT = 410;  // hauteur mur + toit à l'échelle 1
const TARGET_WIDTH_RATIO = 0.66;  // vise ~66 % de la largeur utile de la scène
const TARGET_HEIGHT_RATIO = 0.8;  // et ne dépasse jamais ~80 % de sa hauteur utile

function updateGroupScale(){
  const scene = document.querySelector('.ff-app .scene');
  if(!scene) return;
  const r = scene.getBoundingClientRect();
  if(r.width === 0 || r.height === 0) return;
  const byWidth = (r.width * TARGET_WIDTH_RATIO) / HOUSE_REF_WIDTH;
  const byHeight = (r.height * TARGET_HEIGHT_RATIO) / HOUSE_REF_HEIGHT;
  const scale = Math.max(0.3, Math.min(1, byWidth, byHeight));
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
// recalcule à chaque resize/orientationchange/scroll (§24 du correctif),
// plus quelques passages différés juste après l'affichage pour absorber un
// éventuel décalage de mise en page tardif (image/police qui finit de
// charger). Volontairement PAS de boucle requestAnimationFrame perpétuelle :
// rAF est mis en pause par le navigateur dès que l'onglet n'est plus au
// premier plan/composité, ce qui figerait silencieusement la flèche.

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

// Dès qu'un enfant touche le champ réponse, la flèche qui pointait dessus
// n'a plus de raison d'y rester (voir critère §15 du correctif).
$('answer').addEventListener('focus', () => {
  if(guideTargetEl === $('answer')) guide($('validate'));
});

// ---------- Règle animée ----------
// Ne révèle jamais un nombre avant que la règle ne se soit visuellement
// alignée sur l'arête mesurée : apparition près de l'outil, déplacement
// jusqu'à l'arête, puis alignement, puis seulement alors la mesure.

// side : "bottom" (longueur, règle horizontale sous l'objet), "right"
// (largeur, règle verticale à droite) ou "left" (hauteur, règle verticale à
// gauche) — reprend la disposition des anciennes étiquettes .dL/.dW/.dH,
// pour que les 3 dimensions d'un pavé droit soient visuellement distinctes
// au lieu de mesurer deux fois le même endroit.
function measureWithRuler({ target, side, label, delay = 0 }){
  return new Promise((resolve) => {
    setTimeout(() => {
      const ruler = $('ruler');
      const rulerLabel = $('rulerLabel');
      const scene = document.querySelector('.ff-app .scene');
      const sceneR = scene.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const startR = $('rulerBtn').getBoundingClientRect();
      const OFFSET = 10;
      const isVertical = side !== 'bottom';

      let left, top, w, h;
      if(side === 'bottom'){
        left = t.left - sceneR.left;
        top = t.bottom - sceneR.top + OFFSET;
        w = t.width; h = 6;
      } else if(side === 'right'){
        left = t.right - sceneR.left + OFFSET;
        top = t.top - sceneR.top;
        w = 6; h = t.height;
      } else {
        left = t.left - sceneR.left - OFFSET - 6;
        top = t.top - sceneR.top;
        w = 6; h = t.height;
      }

      ruler.hidden = false;
      ruler.classList.toggle('ruler-v', isVertical);
      ruler.classList.toggle('ruler-left', side === 'left');
      ruler.classList.remove('ruler-visible');
      rulerLabel.textContent = '';

      const startLeft = clamp(startR.left - sceneR.left, 0, scene.clientWidth - 20);
      const startTop = clamp(startR.top - sceneR.top, 0, scene.clientHeight - 20);
      ruler.style.transition = 'none';
      ruler.style.opacity = '0';
      ruler.style.left = startLeft + 'px';
      ruler.style.top = startTop + 'px';
      ruler.style.width = (side === 'bottom' ? 20 : 6) + 'px';
      ruler.style.height = (side === 'bottom' ? 6 : 20) + 'px';
      void ruler.offsetWidth; // force reflow avant de (ré)activer la transition

      ruler.style.transition = 'left .35s ease, top .35s ease, opacity .2s ease';
      ruler.style.opacity = '1';
      ruler.style.left = left + 'px';
      ruler.style.top = top + 'px';

      setTimeout(() => {
        ruler.style.transition = 'width .3s ease, height .3s ease';
        ruler.style.width = w + 'px';
        ruler.style.height = h + 'px';
        setTimeout(() => {
          rulerLabel.textContent = label;
          ruler.classList.add('ruler-visible');
          resolve();
        }, 320);
      }, 380);
    }, delay);
  });
}

function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function hideRuler(){
  $('ruler').hidden = true;
}

// Évite qu'un double-clic sur "Règle" ne lance deux animations qui se
// marchent dessus pendant la séquence (~700 ms par arête mesurée).
let rulerBusy = false;
async function runRulerSequence(steps){
  if(rulerBusy) return;
  rulerBusy = true;
  for(const step of steps){
    await measureWithRuler(step);
  }
  rulerBusy = false;
}

// ---------- Missions ----------

function showMode(next){
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
 $('answer').value='';
 hideRuler();

 if(next==='surface'){
   $('badge').textContent='Mission 1 : surface';
   if(roofPlaced) say('Bravo, ta première mission est réussie !');
   else if(surfaceDone) say('Ajoutons maintenant le toit.', $('roofBtn'));
   else if(measured) say('Le mur mesure 4 m sur 2 m. Calcule sa surface.', $('answer'));
   else if(wallPlaced) say('Bien joué ! Prends la règle pour mesurer le mur.', $('rulerBtn'));
   else say("Commençons par le mur ! Clique sur l'emplacement transparent.", $('slot'));
 }else if(next==='volume'){
   $('badge').textContent='Mission 2 : volume';
   done('v1');
   if(volumeDone) say('Volume réussi, bravo !');
   else if(volumeMeasured) say('Le bloc mesure 4 × 2 × 2. Calcule son volume.', $('answer'));
   else say('Regardons ce bloc : mesurons sa longueur, sa largeur et sa hauteur.', $('rulerBtn'));
 }else{
   $('badge').textContent='Mission 3 : eau & pompe';
   done('w1');
   if(pumpDone) say('Mission réussie : le réservoir est rempli !');
   else if(timeDone) say('200 minutes ✓. Clique sur DÉMARRER pour lancer la pompe.', $('pumpStart'));
   else if(litersDone) say('4000 L ✓. Maintenant, calcule le temps : 4000 ÷ 20.', $('answer'));
   else say('Le réservoir est vide. Sa capacité est de 4 m³. Convertis-la en litres.', $('answer'));
 }
}

$('tabSurface').onclick=()=>showMode('surface');
$('tabVolume').onclick=()=>showMode('volume');
$('tabWater').onclick=()=>showMode('water');

$('slot').onclick=()=>{
 if(mode!=='surface'||wallPlaced)return;
 wallPlaced=true;$('slot').style.display='none';$('wall').style.display='block';done('s1');
 say('Bien joué ! Prends la règle pour mesurer le mur.', $('rulerBtn'));
 status('Mur posé.','ok');
};

$('wallBtn').onclick=()=>{showMode('surface');select('wallBtn')};
$('roofBtn').onclick=()=>{
 showMode('surface');select('roofBtn');
 if(!surfaceDone)return status('Calcule d’abord la surface.','bad');
 if(!roofPlaced){
   roofPlaced=true;$('roof').style.display='block';done('s4');
   say('Bravo ! Ta maison a un toit. Passe à la mission Volume.', $('blockBtn'));
   status('Bravo !','ok');
 }
};
$('blockBtn').onclick=()=>{showMode('volume');select('blockBtn')};
$('tankBtn').onclick=()=>{showMode('water');select('tankBtn')};

$('rulerBtn').onclick=async ()=>{
 select('rulerBtn');
 if(mode==='surface'){
   if(!wallPlaced)return status('Pose d’abord le mur.','bad');
   if(measured || rulerBusy) return;
   clearGuide();
   await runRulerSequence([
     { target: $('wall'), side: 'bottom', label: '4 m' },
     { target: $('wall'), side: 'right', label: '2 m', delay: 150 },
   ]);
   measured=true;done('s2');
   say('Le mur mesure 4 m sur 2 m. Calcule sa surface.', $('answer'));
   status('4 m × 2 m','ok');
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
   say('Le bloc mesure 4 m × 2 m × 2 m. Calcule son volume.', $('answer'));
   status('4 m × 2 m × 2 m','ok');
 }else{
   status('Pour l’eau, la capacité est déjà connue : 4 m³.','ok');
 }
};

$('calcBtn').onclick=()=>{select('calcBtn');$('answer').focus()};

$('hint').onclick=()=>{
 if(mode==='surface'){ $('answer').value=8;status('4 × 2 = 8 m²');guide($('validate')); }
 else if(mode==='volume'){ $('answer').value=16;status('4 × 2 × 2 = 16 m³');guide($('validate')); }
 else{
   if(!litersDone){$('answer').value=4000;status('Capacité : 4 × 1000 = 4000 L');guide($('validate'))}
   else if(!timeDone){$('answer').value=200;status('4000 ÷ 20 = 200 min');guide($('validate'))}
   else status('Active maintenant la pompe.')
 }
};

$('validate').onclick=()=>{
 const v=Number($('answer').value);
 clearGuide();
 if(mode==='surface'){
   if(!measured)return status('Mesure d’abord le mur.','bad');
   if(v===8){
     surfaceDone=true;done('s3');
     say('Correct : 8 m² ! Pose maintenant le toit.', $('roofBtn'));
     status('8 m² ✓','ok');
   } else { status('Essaie : 4 × 2 = ?','bad'); guide($('answer')); }
 }else if(mode==='volume'){
   if(!volumeMeasured)return status('Mesure les 3 dimensions.','bad');
   if(v===16){
     volumeDone=true;done('v3');
     say('Correct : 16 m³ ! Passe à la mission Eau.', $('tankBtn'));
     status('16 m³ ✓','ok');
   } else { status('Essaie : 4 × 2 × 2 = ?','bad'); guide($('answer')); }
 }else{
   if(!litersDone){
     if(v===4000){
       litersDone=true;done('w2');$('answer').value='';
       say('4000 L ✓. Maintenant, calcule le temps : 4000 ÷ 20.', $('answer'));
       status('4000 L ✓ Maintenant : 4000 ÷ 20','ok');
     } else { status('Rappel : 1 m³ = 1000 L. Donc 4 m³ = ?','bad'); guide($('answer')); }
   } else if(!timeDone){
     if(v===200){
       timeDone=true;done('w3');$('answer').value='';$('pumpStart').classList.remove('locked');
       say('Correct : 200 minutes. Clique sur DÉMARRER directement sur la pompe.', $('pumpStart'));
       status('200 minutes ✓','ok');
     } else { status('Temps = 4000 ÷ 20','bad'); guide($('answer')); }
   } else status('Clique sur Pompe pour remplir le réservoir.');
 }
};


function startPump(){
 showMode('water');
 select('pumpBtn');

 if(!timeDone){
   $('pumpStart').classList.add('locked');
   say('🔒 La pompe est prête, mais il faut d’abord calculer le temps de remplissage.', $('answer'));
   status('Calcule : 4000 L ÷ 20 L/min. Ensuite tu pourras démarrer la pompe.','bad');
   return;
 }

 $('pumpStart').classList.remove('locked');
 if(pumpDone){
   status('Le réservoir est déjà rempli à 4000 L.','ok');
   return;
 }

 pumpDone=true;
 done('w4');
 clearGuide();
 $('flow').style.display='block';
 $('waterInPipe').style.width='100%';
 $('water').style.height='92%';
 $('pumpStart').textContent='⏹ EN MARCHE';
 setYamba('💧 Regarde : l’eau part de la source, traverse la pompe et monte dans le réservoir.');
 status('Pompe en marche : le réservoir se remplit.','ok');

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
     $('pumpStart').textContent='✓ REMPLI';
     $('badge').textContent='ARCHI MVP terminé ✓';
     say('🎉 Mission réussie : le réservoir est rempli de 4000 L !');
     status('Mission réussie : la pompe a alimenté le réservoir.','ok');
   }
 }, stepMs);
}

$('pumpBtn').onclick=startPump;
$('pumpStart').onclick=(e)=>{e.stopPropagation(); startPump();};

say("Commençons par le mur ! Clique sur l'emplacement transparent.", $('slot'));

})();
