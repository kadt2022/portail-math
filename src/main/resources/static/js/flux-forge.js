// Flux Forge — Niveau 1. Logique reprise telle quelle du prototype ARCHI MVP
// (mêmes IDs, même comportement) : aucune dépendance externe, uniquement le
// DOM des trois missions (surface, volume, eau & pompe).
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

 if(next==='surface'){
   $('badge').textContent='Mission 1 : surface';
   $('instruction').textContent=roofPlaced?'Surface réussie ✓':surfaceDone?'Pose maintenant le toit.':wallPlaced?'Prends la règle pour mesurer le mur.':'Clique sur l’emplacement transparent pour poser le mur.';
 }else if(next==='volume'){
   $('badge').textContent='Mission 2 : volume';
   done('v1');
   $('instruction').textContent=volumeDone?'Volume réussi ✓':'Mesure les 3 dimensions du bloc.';
 }else{
   $('badge').textContent='Mission 3 : eau & pompe';
   $('instruction').textContent='Le réservoir est vide. Sa capacité est de 4 m³. Convertis cette capacité en litres avant de le remplir.';
   done('w1');
 }
}

$('tabSurface').onclick=()=>showMode('surface');
$('tabVolume').onclick=()=>showMode('volume');
$('tabWater').onclick=()=>showMode('water');

$('slot').onclick=()=>{
 if(mode!=='surface'||wallPlaced)return;
 wallPlaced=true;$('slot').style.display='none';$('wall').style.display='block';done('s1');
 $('instruction').textContent='Prends la règle pour mesurer le mur.';
 status('Mur posé.','ok');
};

$('wallBtn').onclick=()=>{showMode('surface');select('wallBtn')};
$('roofBtn').onclick=()=>{
 showMode('surface');select('roofBtn');
 if(!surfaceDone)return status('Calcule d’abord la surface.','bad');
 if(!roofPlaced){roofPlaced=true;$('roof').style.display='block';done('s4');$('instruction').textContent='Cabane terminée ! Passe à Volume.';status('Bravo !','ok')}
};
$('blockBtn').onclick=()=>{showMode('volume');select('blockBtn')};
$('tankBtn').onclick=()=>{showMode('water');select('tankBtn')};

$('rulerBtn').onclick=()=>{
 select('rulerBtn');
 if(mode==='surface'){
   if(!wallPlaced)return status('Pose d’abord le mur.','bad');
   measured=true;$('measureH').style.display='block';$('measureV').style.display='block';done('s2');
   $('instruction').textContent='Le mur mesure 4 m × 2 m. Calcule sa surface.';
   status('4 m × 2 m','ok');
 }else if(mode==='volume'){
   volumeMeasured=true;done('v2');$('instruction').textContent='Le bloc mesure 4 m × 2 m × 2 m. Calcule son volume.';
   status('4 m × 2 m × 2 m','ok');
 }else{
   status('Pour l’eau, la capacité est déjà connue : 4 m³.','ok');
 }
};

$('calcBtn').onclick=()=>{select('calcBtn');$('answer').focus()};

$('hint').onclick=()=>{
 if(mode==='surface'){ $('answer').value=8;status('4 × 2 = 8 m²') }
 else if(mode==='volume'){ $('answer').value=16;status('4 × 2 × 2 = 16 m³') }
 else{
   if(!litersDone){$('answer').value=4000;status('Capacité : 4 × 1000 = 4000 L')}
   else if(!timeDone){$('answer').value=200;status('4000 ÷ 20 = 200 min')}
   else status('Active maintenant la pompe.')
 }
};

$('validate').onclick=()=>{
 const v=Number($('answer').value);
 if(mode==='surface'){
   if(!measured)return status('Mesure d’abord le mur.','bad');
   if(v===8){surfaceDone=true;done('s3');$('instruction').textContent='Correct : 8 m². Pose le toit.';status('8 m² ✓','ok')}
   else status('Essaie : 4 × 2 = ?','bad');
 }else if(mode==='volume'){
   if(!volumeMeasured)return status('Mesure les 3 dimensions.','bad');
   if(v===16){volumeDone=true;done('v3');$('instruction').textContent='Correct : 16 m³.';status('16 m³ ✓','ok')}
   else status('Essaie : 4 × 2 × 2 = ?','bad');
 }else{
   if(!litersDone){
     if(v===4000){
       litersDone=true;done('w2');$('answer').value='';$('instruction').textContent='La pompe prend l’eau à la source et l’envoie vers le réservoir. À 20 L/min, combien de minutes pour remplir 4000 L ?';
       status('4000 L ✓ Maintenant : 4000 ÷ 20','ok');
     } else status('Rappel : 1 m³ = 1000 L. Donc 4 m³ = ?','bad');
   } else if(!timeDone){
     if(v===200){
       timeDone=true;done('w3');$('answer').value='';$('instruction').textContent='Correct : 200 minutes. Clique sur DÉMARRER directement sur la pompe.';$('pumpStart').classList.remove('locked');
       status('200 minutes ✓','ok');
     } else status('Temps = 4000 ÷ 20','bad');
   } else status('Clique sur Pompe pour remplir le réservoir.');
 }
};


function startPump(){
 showMode('water');
 select('pumpBtn');

 if(!timeDone){
   $('pumpStart').classList.add('locked');
   $('instruction').textContent='🔒 La pompe est prête, mais il faut d’abord calculer le temps de remplissage.';
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
 $('flow').style.display='block';
 $('waterInPipe').style.width='100%';
 $('water').style.height='92%';
 $('pumpStart').textContent='⏹ EN MARCHE';
 $('instruction').textContent='💧 Regarde : l’eau part de la source, traverse la pompe et monte dans le réservoir.';
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
     $('instruction').textContent='🎉 Réservoir rempli : 4000 L.';
     status('Mission réussie : la pompe a alimenté le réservoir.','ok');
   }
 }, stepMs);
}

$('pumpBtn').onclick=startPump;
$('pumpStart').onclick=(e)=>{e.stopPropagation(); startPump();};

})();
