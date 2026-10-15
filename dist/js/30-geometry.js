'use strict';
// ---------- Geometry ----------
// with a visible map box the route needs some air to the box edges
function mapPad(){return (state.map.style!=='none'&&state.map.ext==='box')?sc(3.5):0;}
function geometry(){
  var t=state.track; if(!t){return null;}
  var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  t.s.forEach(function(p){
    if(p.px<minX){minX=p.px;} if(p.px>maxX){maxX=p.px;}
    if(p.py<minY){minY=p.py;} if(p.py>maxY){maxY=p.py;}
  });
  var bw=Math.max(maxX-minX,1), bh=Math.max(maxY-minY,1);
  var mh=state.mapB-LAY.mapT;
  var pad=mapPad();
  var sc=Math.min((W-2*pad)/bw,(mh-2*pad)/bh);
  var ox=M+(W-bw*sc)/2, oy=LAY.mapT+(mh-bh*sc)/2;
  function mapPt(p){return [ox+(p.px-minX)*sc, oy+(maxY-p.py)*sc];}
  var e0=t.minE, e1=t.maxE;
  if(e1-e0<60){var c=(e0+e1)/2;e0=c-30;e1=c+30;}
  return {
    mapPt:mapPt,
    mp:t.s.map(mapPt),
    minX:minX, maxY:maxY, ox:ox, oy:oy, sc:sc,
    profX:function(d){return M+d/t.total*W;},
    profY:function(e){return LAY.profB-(e-e0)/(e1-e0)*(LAY.profB-LAY.profT);}
  };
}
function sampleAt(d){
  var t=state.track, s=t.s, n=s.length-1;
  var u=clamp(d/t.total,0,1)*n, i=Math.min(Math.floor(u),n-1), fr=u-i;
  var a=s[i], b=s[i+1];
  return {px:a.px+(b.px-a.px)*fr, py:a.py+(b.py-a.py)*fr, e:a.e+(b.e-a.e)*fr};
}
function nearestD(x,y,geo){
  var best=0,bd=Infinity;
  for(var i=0;i<geo.mp.length;i++){
    var dx=geo.mp[i][0]-x, dy=geo.mp[i][1]-y, dd=dx*dx+dy*dy;
    if(dd<bd){bd=dd;best=i;}
  }
  return state.track.s[best].d;
}
