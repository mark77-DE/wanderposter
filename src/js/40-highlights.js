// ---------- Highlights ----------
function addHL(d,name){
  var hl={id:state.nextId++,name:name||'',d:d,lx:0,ly:0,rot:0,size:100,manual:false};
  state.hl.push(hl);
  return hl;
}
function findPeaks(maxN,minProm){
  var s=state.track.s, n=s.length, e=s.map(function(p){return p.e;}), cand=[], i, j, k;
  for(i=0;i<n;i++){
    var isMax=true;
    for(k=-6;k<=6;k++){j=i+k;if(j>=0&&j<n&&e[j]>e[i]){isMax=false;break;}}
    if(!isMax){continue;}
    var lmin=e[i], rmin=e[i];
    for(j=i-1;j>=0;j--){if(e[j]>e[i]){break;}lmin=Math.min(lmin,e[j]);}
    for(j=i+1;j<n;j++){if(e[j]>e[i]){break;}rmin=Math.min(rmin,e[j]);}
    var prom=e[i]-Math.max(lmin,rmin);
    if(prom>=minProm){cand.push({d:s[i].d,e:e[i],prom:prom});}
  }
  cand.sort(function(a,b){return b.prom-a.prom;});
  var out=[];
  cand.forEach(function(c){
    if(out.length<maxN&&!out.some(function(o){return Math.abs(o.d-c.d)<500;})){out.push(c);}
  });
  return out;
}

function renderList(){
  var box=$('#hlist'); box.innerHTML='';
  if(!state.hl.length){return;}
  state.hl.slice().sort(function(a,b){return a.d-b.d;}).forEach(function(hl,i){
    var card=document.createElement('div');
    card.className='hl-card'; card.dataset.id=hl.id;
    card.innerHTML='<span class="badge">'+(i+1)+'</span>'+
      '<input type="text" class="hl-name" placeholder="Name, z. B. Ottobeuren" autocomplete="off" aria-label="Name von Highlight '+(i+1)+'" value="'+esc(hl.name)+'">'+
      '<button type="button" class="btn small del" aria-label="Highlight '+(i+1)+' entfernen">Entfernen</button>'+
      '<label class="rot">Drehung<input type="range" class="hl-rot" min="-90" max="90" step="5" value="'+hl.rot+'"><output>'+hl.rot+'°</output></label>'+
      '<label class="size">Größe<input type="range" class="hl-size" min="50" max="200" step="5" value="'+hl.size+'"><output>'+hl.size+' %</output></label>';
    box.appendChild(card);
  });
}
function byId(id){return state.hl.filter(function(h){return h.id===id;})[0];}

$('#hlist').addEventListener('input',function(e){
  var card=e.target.closest('.hl-card'); if(!card){return;}
  var hl=byId(+card.dataset.id); if(!hl){return;}
  if(e.target.classList.contains('hl-name')){hl.name=e.target.value;}
  if(e.target.classList.contains('hl-rot')){hl.rot=+e.target.value;card.querySelector('output').textContent=hl.rot+'°';}
  if(e.target.classList.contains('hl-size')){hl.size=+e.target.value;card.querySelector('.size output').textContent=hl.size+' %';}
  render();
});
$('#hlist').addEventListener('click',function(e){
  var b=e.target.closest('.del'); if(!b){return;}
  var id=+b.closest('.hl-card').dataset.id;
  state.hl=state.hl.filter(function(h){return h.id!==id;});
  renderList(); render();
});

$('#addHl').addEventListener('click',function(){
  if(!state.track){say('Bitte zuerst eine Route laden.');return;}
  setAddMode(!state.addMode);
  if(state.addMode){say('Tippe auf die Route oder ins Höhenprofil.');}
});
function setAddMode(on){
  if(on&&state.posMode){setPosMode(false);}
  state.addMode=on;
  $('#addHl').setAttribute('aria-pressed',on?'true':'false');
  $('#addHl').textContent=on?'Abbrechen':'Highlight setzen';
  svg.classList.toggle('adding',on);
}
$('#peaks').addEventListener('click',function(){
  if(!state.track){say('Bitte zuerst eine Route laden.');return;}
  if(!state.track.hasEle){say('Die GPX-Datei enthält keine Höhendaten.');return;}
  var found=findPeaks(5,40), added=0;
  found.forEach(function(p){
    if(state.hl.some(function(h){return Math.abs(h.d-p.d)<300;})){return;}
    addHL(p.d,''); added++;
  });
  if(!found.length){say('Keine markanten Gipfel gefunden.');}
  else if(!added){say('Diese Gipfel sind schon als Highlight gesetzt.');}
  else{say(added+(added===1?' Gipfel':' Gipfel')+' hinzugefügt. Namen kannst du in der Liste eintragen.');}
  renderList(); render();
});
