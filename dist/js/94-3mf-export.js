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
var modelModePreviousHidden=null;
function setModelMode(active){
  var ids=['routeGroup','tracksGroup','modelGroup','textGroup','vacationGroup','customizeGroup','backgroundGroup','mapGroup','highlightsGroup','exportGroup'];
  if(active&&!modelModePreviousHidden){modelModePreviousHidden={};ids.forEach(function(id){var el=document.getElementById(id);if(el){modelModePreviousHidden[id]=el.hidden;}});}
  if(active){ids.forEach(function(id){var el=document.getElementById(id);if(el){el.hidden=id!=='routeGroup'&&id!=='modelGroup';}});}
  else if(modelModePreviousHidden){ids.forEach(function(id){var el=document.getElementById(id);if(el&&Object.prototype.hasOwnProperty.call(modelModePreviousHidden,id)){el.hidden=modelModePreviousHidden[id];}});modelModePreviousHidden=null;}
  if(active){
    ['routeMode','stagesMode','vacationMode'].forEach(function(id){document.getElementById(id).setAttribute('aria-pressed','false');});
    document.getElementById('modelMode').setAttribute('aria-pressed','true');
    document.getElementById('lead').textContent='GPX laden und als geografisches 3D-Höhenrelief für den 3D-Druck exportieren.';
  }else{
    document.getElementById('modelMode').setAttribute('aria-pressed','false');
  }
}
document.getElementById('modelMode').addEventListener('click',function(){setModelMode(true);});
document.getElementById('modelBaseEnabled').addEventListener('change',function(){
  document.getElementById('modelBaseMarginField').hidden=!this.checked;
});
document.getElementById('exp3mf').addEventListener('click',function(){
  var status=document.getElementById('model3mfStatus');
  try{
    if(!state.track){throw new Error('Bitte zuerst eine Route laden.');}
    var width=Number(document.getElementById('modelRouteWidth').value);
    if(!isFinite(width)||width<0.6||width>5){throw new Error('Die Routenbreite muss zwischen 0,6 und 5,0 mm liegen.');}
    var withBase=document.getElementById('modelBaseEnabled').checked;
    var margin=withBase?Number(document.getElementById('modelBaseMargin').value):0;
    if(withBase&&(!isFinite(margin)||margin<0||margin>20)){throw new Error('Der Rand muss zwischen 0 und 20 mm liegen.');}
    var g=buildGeographic3MFGeometry(state.track,width,{withBase:withBase,marginMm:margin});
    var blob=geographic3mfBlob(g),name=(state.title||'wanderung').toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-+|-+$/g,'')||'wanderung';
    saveFile(name+(withBase?'-3d-mit-grundplatte.3mf':'-3d-route-ohne-grundplatte.3mf'),blob);
    status.textContent='3MF erstellt: '+g.width.toFixed(1)+' × '+g.depth.toFixed(1)+' mm, '+(withBase?'mit '+g.baseMargin.toFixed(1)+' mm Rand und 2 mm Grundplatte':'ohne Grundplatte')+', Route '+width.toFixed(1)+' mm breit.';
    status.style.color=width<1?'#b3261e':'';
    if(width<1){status.textContent+=' Hinweis: Unter 1,0 mm kann die Route mit einer 0,4-mm-Düse schwer zuverlässig druckbar sein.';}
  }catch(err){status.textContent=err.message||'3MF-Export fehlgeschlagen.';status.style.color='#b3261e';}
});
