// ---------- Geographic 3D model geometry ----------
function buildGeographic3MFGeometry(track, routeWidthMm, options) {
  options=options||{};
  var withBase=options.withBase!==false;
  var margin=withBase?Number(options.marginMm||0):0;
  if (!track || !track.s || track.s.length < 2) throw new Error('Bitte zuerst eine Route laden.');
  if (!track.hasEle) throw new Error('Die GPX-Datei enthält keine ausreichenden Höhenangaben.');
  if(!isFinite(margin)||margin<0||margin>20) throw new Error('Der Rand muss zwischen 0 und 20 mm liegen.');
  if(!isFinite(maxSize)||maxSize<50||maxSize>250) throw new Error('Die Modellgröße muss zwischen 50 und 250 mm liegen.');
  if(!isFinite(relief)||relief<1||relief>30||!isFinite(routeThickness)||routeThickness<0.4||routeThickness>5||(withBase&&(!isFinite(baseThickness)||baseThickness<0.8||baseThickness>8))) throw new Error('Bitte die 3D-Höhen- und Stärkewerte prüfen.');
  var points = track.s, minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  points.forEach(function(p){ minX=Math.min(minX,p.px); maxX=Math.max(maxX,p.px); minY=Math.min(minY,p.py); maxY=Math.max(maxY,p.py); });
  var spanX=maxX-minX, spanY=maxY-minY, maxSpan=Math.max(spanX,spanY);
  if (!isFinite(maxSpan) || maxSpan <= 0) throw new Error('Die Routengeometrie ist ungültig.');
  var baseThickness=withBase?Number(options.baseThicknessMm??2):0, relief=Number(options.reliefHeightMm??8), maxSize=Number(options.maxSizeMm??150), routeThickness=Number(options.routeThicknessMm??1);
  var outerPad=margin+routeWidthMm/2;
  var available=maxSize-2*outerPad;
  if(available<=0) throw new Error('Der Rand ist für diese Routenbreite zu groß.');
  var scale=available/maxSpan;
  var routeExtentW=spanX*scale+routeWidthMm, routeExtentD=spanY*scale+routeWidthMm;
  var modelWidth=withBase?Math.max(20,routeExtentW+2*margin):Math.max(20,routeExtentW);
  var modelDepth=withBase?Math.max(20,routeExtentD+2*margin):Math.max(20,routeExtentD);
  var route=[];
  var minE=Infinity,maxE=-Infinity;
  points.forEach(function(p){minE=Math.min(minE,p.e);maxE=Math.max(maxE,p.e);});
  var elevSpan=maxE-minE, routeBottom=withBase?baseThickness-0.2:0, routeTopBase=withBase?baseThickness:0, routeBody=routeThickness;
  for(var i=0;i<points.length;i++){
    var prev=points[Math.max(0,i-1)], next=points[Math.min(points.length-1,i+1)];
    var dx=(next.px-prev.px)*scale, dy=(next.py-prev.py)*scale, len=Math.hypot(dx,dy)||1;
    var nx=-dy/len, ny=dx/len;
    var cx=(points[i].px-(minX+maxX)/2)*scale;
    var cy=(points[i].py-(minY+maxY)/2)*scale;
    var z=routeTopBase+routeBody+(elevSpan>0.01?(points[i].e-minE)/elevSpan*relief:relief/2);
    var half=routeWidthMm/2;
    route.push({
      tl:[cx+nx*half,cy+ny*half,z], tr:[cx-nx*half,cy-ny*half,z],
      bl:[cx+nx*half,cy+ny*half,routeBottom], br:[cx-nx*half,cy-ny*half,routeBottom]
    });
  }
  var vertices=[], triangles=[];
  route.forEach(function(p){vertices.push(p.tl,p.tr,p.bl,p.br);});
  function quad(a,b,c,d){triangles.push([a,b,c],[a,c,d]);}
  for(i=0;i<route.length-1;i++){
    var a=i*4,b=(i+1)*4;
    quad(a,a+1,b+1,b);
    quad(a+2,b+2,b+3,a+3);
    quad(a,b,b+2,a+2);
    quad(a+1,a+3,b+3,b+1);
  }
  quad(0,2,3,1);
  var last=(route.length-1)*4;
  quad(last,last+1,last+3,last+2);
  var base=null;
  if(withBase){
    var halfW=modelWidth/2, halfD=modelDepth/2, baseV=[
      [-halfW,-halfD,0],[halfW,-halfD,0],[halfW,halfD,0],[-halfW,halfD,0],
      [-halfW,-halfD,baseThickness],[halfW,-halfD,baseThickness],[halfW,halfD,baseThickness],[-halfW,halfD,baseThickness]
    ];
    var baseT=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
    base={vertices:baseV,triangles:baseT};
  }
  return {route:{vertices:vertices,triangles:triangles},base:base,
    width:modelWidth,depth:modelDepth,height:routeTopBase+routeBody+relief,routeWidth:routeWidthMm,reliefHeight:relief,baseThickness:baseThickness,routeThickness:routeThickness,
    baseMargin:margin,withBase:withBase};
}
