// ---------- Export ----------
var downloads=null;
(async function(){
  try{if(window.claude&&window.claude.use){downloads=await window.claude.use('downloads');}}catch(err){downloads=null;}
})();

function exportSVGString(wpx,hpx){
  var c=svg.cloneNode(true);
  Array.prototype.forEach.call(c.querySelectorAll('.ui'),function(n){n.remove();});
  Array.prototype.forEach.call(c.querySelectorAll('[data-drag]'),function(n){n.removeAttribute('data-drag');n.removeAttribute('data-id');});
  c.removeAttribute('id'); c.removeAttribute('class'); c.removeAttribute('role'); c.removeAttribute('aria-label');
  c.setAttribute('xmlns',NS);
  c.setAttribute('viewBox','0 0 100 '+f(fmt().H));
  c.setAttribute('width',wpx); c.setAttribute('height',hpx);
  var st=document.createElementNS(NS,'style'); st.textContent=FONT_CSS;
  c.insertBefore(st,c.firstChild);
  return new XMLSerializer().serializeToString(c);
}
function slug(){
  var s=(state.title||'wanderung').toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-+|-+$/g,'');
  var F=fmt();return (s||'wanderung')+'-'+(F.print?F.mm+'mm':F.tag);
}
async function saveFile(name,data){
  if(downloads){
    try{await downloads.save({filename:name,data:data});say('Gespeichert: '+name);}
    catch(err){say(err&&err.code==='declined'?'Speichern abgebrochen.':'Speichern nicht möglich ('+((err&&err.code)||'Fehler')+').');}
    return;
  }
  // fallback outside the viewer: plain anchor download
  var url=URL.createObjectURL(data), a=document.createElement('a');
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},3000);
}
$('#expSvg').addEventListener('click',function(){
  if(!state.track){say('Bitte zuerst eine Route laden.');return;}
  var F=fmt(), xml=F.print?exportSVGString(F.mm+'mm',F.mm+'mm'):exportSVGString(F.px[0],F.px[1]);
  saveFile(slug()+'.svg',new Blob([xml],{type:'image/svg+xml'}));
});
// renders the current poster to a PNG at its export size (300 dpi for print formats, pixel size for social formats)
async function renderPngBlob(){
  var F=fmt(), pw=F.print?Math.round(F.mm/25.4*300):F.px[0], ph=F.print?pw:F.px[1];
  var xml=exportSVGString(pw,ph);
  var img=new Image();
  await new Promise(function(res,rej){img.onload=res;img.onerror=rej;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);});
  var cv=document.createElement('canvas'); cv.width=pw; cv.height=ph;
  var ctx=cv.getContext('2d');
  ctx.drawImage(img,0,0,pw,ph);                                  // first draw lets the embedded font settle
  await new Promise(function(r){setTimeout(r,120);});
  ctx.clearRect(0,0,pw,ph); ctx.drawImage(img,0,0,pw,ph);
  var blob=await new Promise(function(r){cv.toBlob(r,'image/png');});
  if(!blob){throw new Error('PNG konnte nicht erzeugt werden.');}
  return blob;
}
$('#expPng').addEventListener('click',async function(){
  if(!state.track){say('Bitte zuerst eine Route laden.');return;}
  try{saveFile(slug()+'.png',await renderPngBlob());}
  catch(err){say('PNG-Export fehlgeschlagen.');}
});

// share sheet of the phone (WhatsApp, Instagram, ...): only offered when the browser can share files
function canShareFiles(){
  try{return !!(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File(['x'],'x.png',{type:'image/png'})]}));}
  catch(err){return false;}
}
$('#shareBtn').hidden=!canShareFiles();
$('#shareBtn').addEventListener('click',async function(){
  if(!state.track){say('Bitte zuerst eine Route laden.');return;}
  try{
    var file=new File([await renderPngBlob()],slug()+'.png',{type:'image/png'});
    await navigator.share({files:[file],title:state.title||'Wander-Poster'});
  }catch(err){
    if(!err||err.name!=='AbortError'){say('Teilen ist hier nicht möglich.');}
  }
});
