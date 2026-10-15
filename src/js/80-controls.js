// ---------- Label spacing ----------
$('#gap').addEventListener('input',function(e){
  state.labelGap=+e.target.value; $('#gapOut').textContent=de(state.labelGap,1); render();
});
$('#hlFont').addEventListener('input',function(e){
  state.hlFontSize=+e.target.value; $('#hlFontOut').textContent=state.hlFontSize+' %'; render();
});
function syncLabelModeUi(){
  var profileOption=$('#labelMode').querySelector('option[value="profile"]');
  profileOption.disabled=!!(state.track&&!state.track.hasEle);
  if(state.track&&!state.track.hasEle&&state.labelMode==='profile'){
    state.labelMode='route'; $('#labelMode').value='route';
  }
  $('#gapLabel').textContent=state.labelMode==='route'?'Abstand zur Route':'Abstand zum höchsten Punkt';
}
$('#labelMode').addEventListener('change',function(e){
  state.labelMode=e.target.value;
  if(state.labelMode==='route'){state.mapB=LAY.mapB;}
  syncLabelModeUi(); render();
});
syncLabelModeUi();
$('#resetPos').addEventListener('click',function(){
  state.hl.forEach(function(h){h.manual=false;});
  render();
});

// ---------- Text and format controls ----------
$('#title').value=state.title; $('#region').value=state.region; $('#date').value=state.date;
$('#title').addEventListener('input',function(e){state.title=e.target.value;render();});
$('#region').addEventListener('input',function(e){state.region=e.target.value;render();});
$('#date').addEventListener('input',function(e){state.date=e.target.value;render();});
$('#optEle').addEventListener('change',function(e){state.showEle=e.target.checked;render();});
function syncStatsUi(){
  var enabled=state.showStats,t=state.track;
  $('#statsOptions').querySelectorAll('input[data-stat]').forEach(function(input){
    input.disabled=!enabled||((input.dataset.stat==='ascent'||input.dataset.stat==='max'||input.dataset.stat==='min')&&t&&!t.hasEle)
      ||((input.dataset.stat==='elapsed'||input.dataset.stat==='moving')&&t&&!t.hasTime);
  });
}
$('#optStats').addEventListener('change',function(e){state.showStats=e.target.checked;syncStatsUi();render();});
$('#statsOptions').addEventListener('change',function(e){
  var key=e.target.dataset.stat;
  if(!key){return;}
  state.stats[key]=e.target.checked; render();
});
$('#statsFont').addEventListener('input',function(e){
  state.statsFontSize=+e.target.value;
  $('#statsFontOut').textContent=state.statsFontSize+' %';
  render();
});
syncStatsUi();
$('#optPlates').addEventListener('change',function(e){state.plates=e.target.checked;render();});
$('#plateOpacity').addEventListener('input',function(e){
  state.plateOpacity=+e.target.value; $('#plateOpacityOut').textContent=state.plateOpacity+' %'; render();
});
function bindSeg(id,attr,onPick){
  $(id).addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b){return;}
    Array.prototype.forEach.call($(id).querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
    onPick(b.getAttribute(attr));
  });
}
Array.prototype.forEach.call(document.querySelectorAll('.fmtseg'),function(seg){
  seg.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b){return;}
    state.fmt=b.getAttribute('data-fmt'); syncMapUi(); applyFormat(); render();
  });
});
$('#optSafe').addEventListener('change',function(e){state.safe=e.target.checked;render();});

// ---------- Colors ----------
function renderPresets(){
  var box=$('#presets'); box.innerHTML='';
  PRESETS.forEach(function(p,i){
    var b=document.createElement('button');
    b.type='button'; b.className='preset'; b.dataset.i=i;
    b.innerHTML='<span class="sw"><i style="background:'+p.bg+'"></i><i style="background:'+p.ink+'"></i><i style="background:'+p.route+'"></i></span><span>'+esc(p.name)+'</span>';
    box.appendChild(b);
  });
}
function syncColors(){
  var c=state.colors;
  $('#cBg').value=c.bg; $('#cInk').value=c.ink; $('#cRoute').value=c.route;
  Array.prototype.forEach.call($('#presets').children,function(b){
    var p=PRESETS[+b.dataset.i];
    var on=p.bg===c.bg.toLowerCase()&&p.ink===c.ink.toLowerCase()&&p.route===c.route.toLowerCase();
    b.setAttribute('aria-pressed',on?'true':'false');
  });
  var hint='';
  if(contrast(c.ink,c.bg)<4.5){hint='Schrift und Hintergrund haben wenig Kontrast.';}
  else if(contrast(c.route,c.bg)<3){hint='Die Route hebt sich kaum vom Hintergrund ab.';}
  $('#contrastHint').textContent=hint;
}
$('#presets').addEventListener('click',function(e){
  var b=e.target.closest('.preset'); if(!b){return;}
  var p=PRESETS[+b.dataset.i];
  state.colors={bg:p.bg,ink:p.ink,route:p.route};
  syncColors(); render();
});
[['#cBg','bg'],['#cInk','ink'],['#cRoute','route']].forEach(function(pair){
  $(pair[0]).addEventListener('input',function(e){
    state.colors[pair[1]]=e.target.value; syncColors(); render();
  });
});
renderPresets(); syncColors();
