'use strict';
// ---------- Multi-track vacation statistics poster ----------
function vacationSelected(){return state.vacationTracks.filter(function(r){return r.track&&r.include;});}
function vacationDateLabel(iso,options){
  var p=iso.split('-');
  return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('de-DE',options||{day:'2-digit',month:'2-digit'});
}
function vacationPeriod(rows){
  var ds=rows.map(function(r){return r.track.date;}).filter(Boolean).sort();
  if(!ds.length){return '';}
  if(ds[0]===ds[ds.length-1]){return vacationDateLabel(ds[0],{day:'numeric',month:'long',year:'numeric'});}
  return vacationDateLabel(ds[0],{day:'numeric',month:'short',year:'numeric'})+' – '+vacationDateLabel(ds[ds.length-1],{day:'numeric',month:'short',year:'numeric'});
}
function vacationSummary(rows){
  var total=0,ascent=0,eleCount=0,elapsed=0,elapsedCount=0,moving=0,movingCount=0,longest=null,highest=null,dates={},daily={};
  rows.forEach(function(r){
    var t=r.track; total+=t.total;
    if(!longest||t.total>longest.total){longest={name:r.name,total:t.total};}
    if(t.hasEle){ascent+=t.ascent;eleCount++;if(!highest||t.maxE>highest.ele){highest={name:r.name,ele:t.maxE};}}
    if(t.elapsed!=null){elapsed+=t.elapsed;elapsedCount++;}
    if(t.movingTime!=null){moving+=t.movingTime;movingCount++;}
    if(t.date){dates[t.date]=true;daily[t.date]=(daily[t.date]||0)+t.total;}
  });
  return {total:total,ascent:ascent,eleCount:eleCount,elapsed:elapsed,elapsedCount:elapsedCount,moving:moving,movingCount:movingCount,longest:longest,highest:highest,days:Object.keys(dates).length,daily:daily};
}
function vacationRenderList(){
  var list=$('#vacationList'); list.innerHTML='';
  var included=vacationSelected().length;
  state.vacationTracks.forEach(function(r){
    var row=document.createElement('div'); row.className='vac-item';
    var label=document.createElement('label'); label.className='vac-file';
    var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!r.include; cb.disabled=!r.track; cb.dataset.vacId=r.id;
    var info=document.createElement('span'); info.className='vac-file-info';
    var name=document.createElement('b'); name.textContent=r.name; info.appendChild(name);
    var small=document.createElement('small');
    small.textContent=r.track
      ?de(r.track.total/1000,1)+' km'+(r.track.hasEle?', '+de(r.track.ascent)+' HM':'')+(r.track.date?', '+vacationDateLabel(r.track.date):', ohne Zeitstempel')
      :'Fehler: '+r.error;
    info.appendChild(small); label.appendChild(cb); label.appendChild(info); row.appendChild(label);
    var remove=document.createElement('button'); remove.type='button'; remove.className='btn small'; remove.textContent='Entfernen'; remove.dataset.removeVac=r.id; row.appendChild(remove);
    list.appendChild(row);
  });
  $('#vacationMsg').textContent=state.vacationTracks.length
    ?included+' von '+state.vacationTracks.length+' Touren fließen in das Poster ein.'
    :'Noch keine GPX-Dateien geladen.';
}
function vacationReadFile(file){
  return new Promise(function(resolve){
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var raw=parseGPX(String(reader.result)), track=buildTrack(raw);
        resolve({id:state.nextVacationId++,name:file.name,track:track,include:true,error:''});
      }catch(err){resolve({id:state.nextVacationId++,name:file.name,track:null,include:false,error:err.message||'Datei konnte nicht gelesen werden.'});}
    };
    reader.onerror=function(){resolve({id:state.nextVacationId++,name:file.name,track:null,include:false,error:'Datei konnte nicht gelesen werden.'});};
    reader.readAsText(file);
  });
}
$('#vacationFiles').addEventListener('change',async function(e){
  var files=Array.prototype.slice.call(e.target.files||[]); e.target.value='';
  if(!files.length){return;}
  $('#vacationMsg').textContent=files.length+' Datei'+(files.length===1?' wird':'en werden')+' gelesen …';
  var rows=await Promise.all(files.map(vacationReadFile));
  state.vacationTracks=state.vacationTracks.concat(rows);
  vacationRenderList(); render();
});
$('#vacationList').addEventListener('change',function(e){
  var id=+e.target.dataset.vacId;
  if(!id){return;}
  var row=state.vacationTracks.filter(function(r){return r.id===id;})[0];
  if(row){row.include=e.target.checked;vacationRenderList();render();}
});
$('#vacationList').addEventListener('click',function(e){
  var id=+e.target.dataset.removeVac;
  if(!id){return;}
  state.vacationTracks=state.vacationTracks.filter(function(r){return r.id!==id;});
  vacationRenderList();render();
});
$('#clearVacation').addEventListener('click',function(){state.vacationTracks=[];vacationRenderList();render();});
$('#vacationStatOptions').addEventListener('change',function(e){
  var key=e.target.dataset.vacStat;
  if(!key){return;}
  state.vacationStats[key]=e.target.checked; render();
});
function vacationSyncStatOptionOrder(){
  var box=$('#vacationStatOptions'),items=Array.prototype.slice.call(box.querySelectorAll('.vac-stat-option'));
  items.forEach(function(item){var input=item.querySelector('[data-vac-stat]');if(input){input.checked=!!state.vacationStats[input.dataset.vacStat];}});
  state.vacationStatOrder.forEach(function(key){
    var item=box.querySelector('[data-vac-stat-item="'+key+'"]');if(item){box.appendChild(item);}
  });
}
$('#vacationStatOptions').addEventListener('dragstart',function(e){
  var handle=e.target.closest('.vac-drag'),item=handle&&handle.closest('.vac-stat-option');
  if(!item){e.preventDefault();return;}
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.dataset.vacStatItem);item.classList.add('dragging');
});
$('#vacationStatOptions').addEventListener('dragover',function(e){
  var target=e.target.closest('.vac-stat-option');if(!target){return;}
  e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('drag-over');
});
$('#vacationStatOptions').addEventListener('dragleave',function(e){
  var target=e.target.closest('.vac-stat-option');if(target&&!target.contains(e.relatedTarget)){target.classList.remove('drag-over');}
});
$('#vacationStatOptions').addEventListener('drop',function(e){
  var target=e.target.closest('.vac-stat-option'),source=e.dataTransfer.getData('text/plain');
  if(!target||!source){return;}
  e.preventDefault();
  var order=state.vacationStatOrder.slice(),from=order.indexOf(source),to=order.indexOf(target.dataset.vacStatItem);
  if(from<0||to<0||from===to){return;}
  order.splice(from,1);order.splice(order.indexOf(target.dataset.vacStatItem),0,source);state.vacationStatOrder=order;
  vacationSyncStatOptionOrder();render();
});
$('#vacationStatOptions').addEventListener('dragend',function(){
  $('#vacationStatOptions').querySelectorAll('.dragging,.drag-over').forEach(function(item){item.classList.remove('dragging','drag-over');});
});
vacationSyncStatOptionOrder();
$('#vacTextSize').addEventListener('input',function(e){state.vacTextSize=+e.target.value;$('#vacTextSizeOut').textContent=state.vacTextSize+' %';render();});
$('#vacLabelSize').addEventListener('input',function(e){state.vacLabelSize=+e.target.value;$('#vacLabelSizeOut').textContent=state.vacLabelSize+' %';render();});
$('#vacValueSize').addEventListener('input',function(e){state.vacValueSize=+e.target.value;$('#vacValueSizeOut').textContent=state.vacValueSize+' %';render();});

function setPosterMode(mode){
  var vacation=mode==='vacation'; state.posterMode=vacation?'vacation':'route';
  $('#routeMode').setAttribute('aria-pressed',vacation?'false':'true');
  $('#vacationMode').setAttribute('aria-pressed',vacation?'true':'false');
  $('#lead').textContent=vacation
    ?'Mehrere GPX-Touren zusammenfassen und als Urlaubsstatistik drucken.'
    :'GPX laden, Titel eintragen, Highlights platzieren, als Bild exportieren.';
  $('#routeGroup').hidden=vacation; $('#vacationGroup').hidden=!vacation;
  $('#statsFont').closest('.slider').hidden=vacation;
  syncColorMode();
  $('#highlightsGroup').hidden=vacation; $('#backgroundGroup').hidden=vacation; $('#mapGroup').hidden=vacation;
  $('#dateField').hidden=vacation;
  ['optEleRow','optStatsRow','statsOptions','optPlatesRow','plateOpacityRow'].forEach(function(id){$('#'+id).hidden=vacation;});
  if(vacation&&state.title==='Brocken-Runde'){state.title='Urlaubsstatistik';$('#title').value=state.title;}
  if(!vacation&&state.title==='Urlaubsstatistik'){state.title='Brocken-Runde';$('#title').value=state.title;}
  vacationRenderList(); render();
}
$('#routeMode').addEventListener('click',function(){setPosterMode('route');});
$('#vacationMode').addEventListener('click',function(){setPosterMode('vacation');});

function vacationChartBins(daily){
  var dates=Object.keys(daily).sort(), bins=[];
  if(dates.length<=14){return dates.map(function(date){return {label:vacationDateLabel(date),value:daily[date]};});}
  var size=Math.ceil(dates.length/12);
  for(var i=0;i<dates.length;i+=size){
    var total=0; dates.slice(i,i+size).forEach(function(date){total+=daily[date];});
    bins.push({label:vacationDateLabel(dates[i]),value:total});
  }
  return bins;
}
function renderVacationPoster(){
  var pal=palette(),rows=vacationSelected(),sum=vacationSummary(rows),F=fmt(),H=F.H,h='';
  var compact=state.fmt==='c100'||(state.fmt==='custom'&&+state.customWidth===100&&+state.customHeight===100);
  var baseScale=compact?1.1:1,textScale=baseScale*state.vacTextSize/100;
  var labelScale=textScale*state.vacLabelSize/100*(compact?1.4:1);
  var valueScale=textScale*state.vacValueSize/100*(compact?1.4:1);
  h+='<rect width="100" height="'+f(H)+'" fill="'+pal.bg+'"/>';
  h+='<text id="ptitle" x="'+M+'" y="'+LAY.titleY+'" font-size="'+titleFs()+'" font-weight="600" fill="'+pal.ink+'">'+esc(state.title||'Urlaubsstatistik')+'</text>';
  h+='<text id="preg" x="'+(M+W)+'" y="'+f(LAY.dateY-sc(2.8)*1.1)+'" font-size="'+sc(2.8)+'" font-weight="600" text-anchor="end" fill="'+pal.ink+'">'+esc(state.region)+'</text>';
  h+='<text id="pdate" x="'+(M+W)+'" y="'+LAY.dateY+'" font-size="'+sc(2.8)+'" font-weight="500" text-anchor="end" fill="'+pal.muted+'">'+esc(vacationPeriod(rows))+'</text>';
  h+='<line x1="'+M+'" x2="'+(M+W)+'" y1="'+LAY.ruleY+'" y2="'+LAY.ruleY+'" stroke="'+pal.ink+'" stroke-opacity=".3" stroke-width=".2"/>';
  // The route poster reserves the lower half for elevation data; the vacation
  // poster can use that space for a taller daily-distance chart.
  var km=de(sum.total/1000,1)+' km', chartTop=LAY.mapT+20, base=LAY.profT-13;
  h+='<text x="50" y="'+f(LAY.mapT+2.8)+'" text-anchor="middle" font-size="'+sc(2.1*labelScale)+'" font-weight="500" fill="'+pal.muted+'">GESAMTSTRECKE</text>';
  h+='<text id="vac-total" x="50" y="'+f(LAY.mapT+12)+'" text-anchor="middle" font-size="'+sc(7.2*textScale)+'" font-weight="600" fill="'+pal.statValue+'">'+esc(km)+'</text>';
  h+='<text x="50" y="'+f(chartTop)+'" text-anchor="middle" font-size="'+sc(1.8*labelScale)+'" font-weight="500" fill="'+pal.muted+'">Kilometer je Tour</text>';
  var bins=vacationChartBins(sum.daily), maxBin=Math.max.apply(null,bins.map(function(b){return b.value;}));
  if(bins.length){
    h+='<line x1="'+M+'" x2="'+(M+W)+'" y1="'+base+'" y2="'+base+'" stroke="'+pal.ink+'" stroke-opacity=".55" stroke-width=".25"/>';
    var cell=W/bins.length, bw=Math.min(5,cell*.58);
    var chartReserve=sc(1.44*labelScale+2.7*valueScale+1), chartH=Math.max(3,base-chartTop-chartReserve);
    bins.forEach(function(b,i){
      var bh=maxBin?Math.max(.5,b.value/maxBin*chartH):0, x=M+cell*(i+.5)-bw/2;
      h+='<rect x="'+f(x)+'" y="'+f(base-bh)+'" width="'+f(bw)+'" height="'+f(bh)+'" rx=".35" fill="'+pal.route+'"/>';
      h+='<text x="'+f(M+cell*(i+.5))+'" y="'+f(base-bh-1.6*valueScale)+'" text-anchor="middle" font-size="'+sc(1.3*valueScale)+'" font-weight="600" fill="'+pal.statValue+'">'+de(b.value/1000,1)+'</text>';
      h+='<text x="'+f(M+cell*(i+.5))+'" y="'+f(base+5)+'" text-anchor="middle" font-size="'+sc(1.3*labelScale)+'" fill="'+pal.muted+'">'+esc(b.label)+'</text>';
    });
  }else{
    h+='<text x="50" y="'+f(chartTop+10)+'" text-anchor="middle" font-size="'+sc(2.2*textScale)+'" fill="'+pal.muted+'">'+(rows.length?'Keine Zeitstempel für die Tagesübersicht':'GPX-Dateien laden, um die Statistik zu sehen')+'</text>';
  }
  var stats=[
    {key:'tours',v:String(rows.length),l:'Touren'},
    {key:'ascent',v:sum.eleCount?de(sum.ascent)+' m':'—',l:'Höhenmeter'},
    {key:'days',v:sum.days?String(sum.days):'—',l:'Tage'},
    {key:'longest',v:sum.longest?de(sum.longest.total/1000,1)+' km':'—',l:'Längste Tour'},
    {key:'highest',v:sum.highest?de(sum.highest.ele)+' m':'—',l:'Höchster Punkt'},
    {key:'average',v:rows.length?de(sum.total/rows.length/1000,1)+' km':'—',l:'Ø je Tour'},
    {key:'elapsed',v:sum.elapsedCount?formatDuration(sum.elapsed):'—',l:'Gesamtzeit'},
    {key:'moving',v:sum.movingCount?formatDuration(sum.moving):'—',l:'Zeit in Bewegung'}
  ].filter(function(s){return state.vacationStats[s.key];}).sort(function(a,b){return state.vacationStatOrder.indexOf(a.key)-state.vacationStatOrder.indexOf(b.key);});
  var topTextGap=Math.max(0,LAY.titleY-titleFs()*.8);
  var lowerLabelY=H-topTextGap-sc(1.35*labelScale)*.2;
  var topLabelY=LAY.profT+6.7, statRows=Math.ceil(stats.length/4);
  if(statRows){
    for(var row=0;row<statRows;row++){
      var rowLabelY=statRows===1?(topLabelY+lowerLabelY)/2:topLabelY+(lowerLabelY-topLabelY)*row/(statRows-1);
      var rowStats=stats.slice(row*4,row*4+4), rowCenters=rowStats.map(function(s,col){return M+W*(col+.5)/rowStats.length;});
      rowStats.forEach(function(s,col){
        var valueY=rowLabelY-sc(2.7*textScale), fs=sc(2.5*textScale);
        h+='<g class="vac-stat"><text x="'+f(rowCenters[col])+'" y="'+f(valueY)+'" text-anchor="middle" font-size="'+fs+'" font-weight="600" fill="'+pal.statValue+'">'+esc(s.v)+'</text><text x="'+f(rowCenters[col])+'" y="'+f(rowLabelY)+'" text-anchor="middle" font-size="'+sc(1.35*labelScale)+'" fill="'+pal.statLabel+'">'+esc(s.l)+'</text></g>';
      });
    }
  }
  svg.innerHTML=h;
  var title=svg.querySelector('#ptitle');
  if(title){var width=title.getComputedTextLength(), maxW=W-4;if(width>maxW){title.setAttribute('font-size',f(titleFs()*maxW/width));}}
  var total=svg.querySelector('#vac-total');
  if(total){var width2=total.getComputedTextLength(), maxW2=W-4;if(width2>maxW2){total.setAttribute('font-size',f(sc(7.2*textScale)*maxW2/width2));}}
}
