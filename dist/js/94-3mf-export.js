// ---------- 3MF export (ZIP store, no external libraries) ----------
function xmlEscape3mf(value){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function crc32_3mf(bytes){
  var crc=0xffffffff;
  for(var i=0;i<bytes.length;i++){crc^=bytes[i];for(var j=0;j<8;j++){crc=(crc&1)?(crc>>>1)^0xedb88320:crc>>>1;}}
  return (crc^0xffffffff)>>>0;
}
function zipStore3mf(files){
  var enc=new TextEncoder(), local=[], central=[], offset=0;
  files.forEach(function(file){
    var name=enc.encode(file.name), data=enc.encode(file.data), crc=crc32_3mf(data);
    var lh=new Uint8Array(30+name.length+data.length), lv=new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);
    lv.setUint16(8,0,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);
    lv.setUint16(26,name.length,true);lh.set(name,30);lh.set(data,30+name.length);local.push(lh);
    var ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
    cv.setUint16(10,0,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
    cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=lh.length;
  });
  var centralSize=central.reduce(function(s,a){return s+a.length;},0), end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob(local.concat(central,[end]),{type:'application/vnd.ms-package.3dmanufacturing-3dmodel+zip'});
}
function meshXml3mf(mesh, id, name){
  var out='<object id="'+id+'" type="model" name="'+xmlEscape3mf(name)+'"><mesh><vertices>';
  mesh.vertices.forEach(function(v){out+='<vertex x="'+v[0].toFixed(5)+'" y="'+v[1].toFixed(5)+'" z="'+v[2].toFixed(5)+'"/>';});
  out+='</vertices><triangles>';
  mesh.triangles.forEach(function(t){out+='<triangle v1="'+t[0]+'" v2="'+t[1]+'" v3="'+t[2]+'"/>';});
  return out+'</triangles></mesh></object>';
}
function geographic3mfBlob(geometry){
  var objects=geometry.withBase
    ?meshXml3mf(geometry.base,1,'Grundplatte')+meshXml3mf(geometry.route,2,'Höhenroute')
    :meshXml3mf(geometry.route,1,'Höhenroute');
  var build=geometry.withBase?'<item objectid="1"/><item objectid="2"/>':'<item objectid="1"/>';
  var model='<?xml version="1.0" encoding="UTF-8"?>'+
    '<model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter" xml:lang="de-DE">'+
    '<metadata name="Title">Wander-Poster – geografisches Höhenrelief</metadata>'+
    '<resources>'+objects+'</resources><build>'+build+'</build></model>';
  var types='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>';
  var rels='<?xml version="1.0" encoding="UTF-8"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>';
  return zipStore3mf([{name:'[Content_Types].xml',data:types},{name:'_rels/.rels',data:rels},{name:'3D/3dmodel.model',data:model}]);
}
var modelModePreviousHidden=null,modelView={yaw:-0.65,pitch:0.65,zoom:1,panX:0,panY:0,drag:false,lastX:0,lastY:0,geometry:null};
function modelOptions(){return {withBase:document.getElementById('modelBaseEnabled').checked,marginMm:Number(document.getElementById('modelBaseMargin').value),maxSizeMm:Number(document.getElementById('modelSize').value),reliefHeightMm:Number(document.getElementById('modelRelief').value),routeThicknessMm:Number(document.getElementById('modelRouteThickness').value),baseThicknessMm:Number(document.getElementById('modelBaseThickness').value)};}
function buildModelPreview(){
  if(!state.track){modelView.geometry=null;drawModelPreview();return;}
  try{var width=Number(document.getElementById('modelRouteWidth').value),opts=modelOptions();if(!isFinite(width)||width<0.6||width>5)throw Error('Routenbreite: 0,6–5 mm');if(opts.withBase&&(!isFinite(opts.marginMm)||opts.marginMm<0||opts.marginMm>20))throw Error('Rand: 0–20 mm');
    modelView.geometry=buildGeographic3MFGeometry(state.track,width,opts);var g=modelView.geometry;
    document.getElementById('modelDimensions').textContent='Modell: '+g.width.toFixed(1)+' × '+g.depth.toFixed(1)+' × '+g.height.toFixed(1)+' mm'+(g.withBase?' · Grundplatte '+g.baseThickness.toFixed(1)+' mm':' · ohne Grundplatte');drawModelPreview();
  }catch(err){modelView.geometry=null;drawModelPreview();document.getElementById('modelDimensions').textContent=err.message||'Modellparameter ungültig.';}
}
function drawModelPreview(){
  var canvas=document.getElementById('modelCanvas');if(!canvas)return;var rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width*devicePixelRatio)),h=Math.max(1,Math.round(rect.height*devicePixelRatio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  var ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--stage').trim()||'#dfe4dc';ctx.fillRect(0,0,w,h);
  var g=modelView.geometry;if(!g){ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()||'#555';ctx.font=(14*devicePixelRatio)+'px system-ui';ctx.textAlign='center';ctx.fillText('Zuerst eine GPX-Route mit Höhenangaben laden',w/2,h/2);return;}
  var meshes=[];if(g.base)meshes.push(g.base);meshes.push(g.route);var verts=[],faces=[];
  meshes.forEach(function(m){var off=verts.length;m.vertices.forEach(v=>verts.push(v));m.triangles.forEach(t=>faces.push([t[0]+off,t[1]+off,t[2]+off]));});
  // Die exportierte Geometrie liegt bereits um X/Y = 0 zentriert.
  // Den tatsächlichen Bounding-Box-Mittelpunkt verwenden, statt nochmals
  // die halbe Modellbreite/-tiefe abzuziehen (das verschiebt den Orbit-Pivot).
  var bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
  verts.forEach(function(v){bounds.minX=Math.min(bounds.minX,v[0]);bounds.maxX=Math.max(bounds.maxX,v[0]);bounds.minY=Math.min(bounds.minY,v[1]);bounds.maxY=Math.max(bounds.maxY,v[1]);bounds.minZ=Math.min(bounds.minZ,v[2]);bounds.maxZ=Math.max(bounds.maxZ,v[2]);});
  var centerX=(bounds.minX+bounds.maxX)/2,centerY=(bounds.minY+bounds.maxY)/2,centerZ=(bounds.minZ+bounds.maxZ)/2;
  var cy=Math.cos(modelView.yaw),sy=Math.sin(modelView.yaw),cp=Math.cos(modelView.pitch),sp=Math.sin(modelView.pitch);
  var p=verts.map(function(v){var x=v[0]-centerX,y=v[1]-centerY,z=v[2]-centerZ,x1=x*cy-y*sy,y1=x*sy+y*cy;return {x:x1,y:y1*cp-z*sp,z:y1*sp+z*cp};});
  // Nach der Rotation erneut die projizierte Ausdehnung bestimmen und exakt
  // in der Canvas-Mitte platzieren. So bleibt das Modell auch bei Drehung mittig.
  var projected={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  p.forEach(function(v){projected.minX=Math.min(projected.minX,v.x);projected.maxX=Math.max(projected.maxX,v.x);projected.minY=Math.min(projected.minY,v.y);projected.maxY=Math.max(projected.maxY,v.y);});
  var projectedW=Math.max(.001,projected.maxX-projected.minX),projectedH=Math.max(.001,projected.maxY-projected.minY);
  var scale=Math.min(w*.78/projectedW,h*.78/projectedH)*modelView.zoom;
  var cx=w/2-(projected.minX+projected.maxX)/2*scale+modelView.panX*devicePixelRatio;
  var cz=h/2+(projected.minY+projected.maxY)/2*scale+modelView.panY*devicePixelRatio;
  var baseCount=g.base?g.base.vertices.length:0;
  faces.map(function(f){var a=p[f[0]],b=p[f[1]],c=p[f[2]],ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y,nz=ux*vy-uy*vx,shade=Math.max(.28,Math.min(1,.48+Math.abs(nz)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)||1)*.5));return {f:f,z:(a.z+b.z+c.z)/3,shade:shade};}).sort((a,b)=>a.z-b.z).forEach(function(t){
    var a=p[t.f[0]],b=p[t.f[1]],c=p[t.f[2]],route=t.f[0]>=baseCount,rgb=route?[213,107,67]:[174,187,178];ctx.beginPath();ctx.moveTo(cx+a.x*scale,cz-a.y*scale);ctx.lineTo(cx+b.x*scale,cz-b.y*scale);ctx.lineTo(cx+c.x*scale,cz-c.y*scale);ctx.closePath();ctx.fillStyle='rgb('+rgb.map(v=>Math.round(v*t.shade)).join(',')+')';ctx.fill();ctx.strokeStyle='rgba(30,45,40,.16)';ctx.lineWidth=Math.max(.5,devicePixelRatio*.4);ctx.stroke();
  });
}
function setModelMode(active){
  var ids=['routeGroup','tracksGroup','modelGroup','textGroup','vacationGroup','customizeGroup','backgroundGroup','mapGroup','highlightsGroup','exportGroup'];
  if(active&&!modelModePreviousHidden){modelModePreviousHidden={};ids.forEach(function(id){var el=document.getElementById(id);if(el)modelModePreviousHidden[id]=el.hidden;});}
  if(active)ids.forEach(function(id){var el=document.getElementById(id);if(el)el.hidden=id!=='routeGroup'&&id!=='modelGroup';});
  else if(modelModePreviousHidden){ids.forEach(function(id){var el=document.getElementById(id);if(el&&Object.prototype.hasOwnProperty.call(modelModePreviousHidden,id))el.hidden=modelModePreviousHidden[id];});modelModePreviousHidden=null;}
  document.getElementById('posterPreview').hidden=active;document.getElementById('modelViewer').hidden=!active;document.getElementById('modeSelect').value=active?'model':(state.posterMode||'route');
  document.getElementById('lead').textContent=active?'3D-Modell drehen, konfigurieren und als 3MF exportieren.':'GPX laden, Titel eintragen, Highlights platzieren, als Bild exportieren.';
  if(active)buildModelPreview();
}
document.getElementById('modeSelect').addEventListener('change',function(){if(this.value==='model')setModelMode(true);else{setModelMode(false);setPosterMode(this.value);}});
document.getElementById('modelBaseEnabled').addEventListener('change',function(){document.getElementById('modelBaseMargin').disabled=!this.checked;document.getElementById('modelBaseThickness').disabled=!this.checked;buildModelPreview();});
['modelSize','modelRouteWidth','modelRelief','modelRouteThickness','modelBaseThickness','modelBaseMargin'].forEach(id=>document.getElementById(id).addEventListener('input',buildModelPreview));
document.getElementById('modelReset').addEventListener('click',function(){var d={modelSize:150,modelRouteWidth:1.2,modelRelief:8,modelRouteThickness:1,modelBaseThickness:2,modelBaseMargin:3};Object.keys(d).forEach(id=>document.getElementById(id).value=d[id]);document.getElementById('modelBaseEnabled').checked=true;document.getElementById('modelBaseMargin').disabled=false;document.getElementById('modelBaseThickness').disabled=false;buildModelPreview();});
document.getElementById('modelViewReset').addEventListener('click',function(){Object.assign(modelView,{yaw:-.65,pitch:.65,zoom:1,panX:0,panY:0});drawModelPreview();});
document.getElementById('modelViewTop').addEventListener('click',function(){modelView.pitch=0;modelView.yaw=0;drawModelPreview();});
(function(){var c=document.getElementById('modelCanvas');c.addEventListener('pointerdown',e=>{modelView.drag=true;modelView.lastX=e.clientX;modelView.lastY=e.clientY;c.setPointerCapture(e.pointerId);});c.addEventListener('pointermove',e=>{if(!modelView.drag)return;var dx=e.clientX-modelView.lastX,dy=e.clientY-modelView.lastY;modelView.lastX=e.clientX;modelView.lastY=e.clientY;if(e.shiftKey){modelView.panX+=dx;modelView.panY+=dy;}else{modelView.yaw+=dx*.009;modelView.pitch=Math.max(-1.35,Math.min(1.35,modelView.pitch+dy*.009));}drawModelPreview();});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>c.addEventListener(ev,()=>modelView.drag=false));c.addEventListener('wheel',e=>{e.preventDefault();modelView.zoom=Math.max(.35,Math.min(3,modelView.zoom*Math.exp(-e.deltaY*.001)));drawModelPreview();},{passive:false});if(typeof ResizeObserver!=='undefined')new ResizeObserver(drawModelPreview).observe(c);})();
document.getElementById('exp3mf').addEventListener('click',function(){var status=document.getElementById('model3mfStatus');try{if(!state.track)throw Error('Bitte zuerst eine Route laden.');var g=buildGeographic3MFGeometry(state.track,Number(document.getElementById('modelRouteWidth').value),modelOptions());var name=(state.title||'wanderung').toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-+|-+$/g,'')||'wanderung';saveFile(name+'-3d-modell.3mf',geographic3mfBlob(g));status.textContent='3MF erstellt: '+g.width.toFixed(1)+' × '+g.depth.toFixed(1)+' × '+g.height.toFixed(1)+' mm.';status.style.color='';}catch(err){status.textContent=err.message||'3MF-Export fehlgeschlagen.';status.style.color='#b3261e';}});
