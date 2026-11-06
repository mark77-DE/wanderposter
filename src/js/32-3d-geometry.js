// ---------- Geographic 3D model geometry ----------
function buildGeographic3MFGeometry(track, routeWidthMm) {
  if (!track || !track.s || track.s.length < 2) throw new Error('Bitte zuerst eine Route laden.');
  if (!track.hasEle) throw new Error('Die GPX-Datei enthält keine ausreichenden Höhenangaben.');
  var points = track.s, minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  points.forEach(function(p){ minX=Math.min(minX,p.px); maxX=Math.max(maxX,p.px); minY=Math.min(minY,p.py); maxY=Math.max(maxY,p.py); });
  var spanX=maxX-minX, spanY=maxY-minY, maxSpan=Math.max(spanX,spanY);
  if (!isFinite(maxSpan) || maxSpan <= 0) throw new Error('Die Routengeometrie ist ungültig.');
  var modelWidth=150, scale=modelWidth/maxSpan, modelDepth=Math.max(20, maxSpan===spanY?spanX*scale:spanY*scale);
  var baseThickness=2, relief=8, route=[];
  var minE=Infinity,maxE=-Infinity;
  points.forEach(function(p){minE=Math.min(minE,p.e);maxE=Math.max(maxE,p.e);});
  var elevSpan=maxE-minE;
  for(var i=0;i<points.length;i++){
    var prev=points[Math.max(0,i-1)], next=points[Math.min(points.length-1,i+1)];
    var dx=(next.px-prev.px)*scale, dy=(next.py-prev.py)*scale, len=Math.hypot(dx,dy)||1;
    var nx=-dy/len, ny=dx/len;
    var cx=(points[i].px-(minX+maxX)/2)*scale;
    var cy=(points[i].py-(minY+maxY)/2)*scale;
    var z=baseThickness+(elevSpan>0.01?(points[i].e-minE)/elevSpan*relief:relief/2);
    var half=routeWidthMm/2;
    route.push({
      tl:[cx+nx*half,cy+ny*half,z], tr:[cx-nx*half,cy-ny*half,z],
      bl:[cx+nx*half,cy+ny*half,baseThickness], br:[cx-nx*half,cy-ny*half,baseThickness]
    });
  }
  var vertices=[], triangles=[];
  route.forEach(function(p){vertices.push(p.tl,p.tr,p.bl,p.br);});
  function quad(a,b,c,d){triangles.push([a,b,c],[a,c,d]);}
  for(i=0;i<route.length-1;i++){
    var a=i*4,b=(i+1)*4;
    quad(a,a+1,b+1,b);             // upper surface
    quad(a+2,b+2,b+3,a+3);          // underside
    quad(a,a+2,b+2,b);              // left wall
    quad(a+1,b+1,b+3,a+3);          // right wall
  }
  quad(0,1,3,2);
  var last=(route.length-1)*4;
  quad(last,last+2,last+3,last+1);
  var halfW=modelWidth/2, halfD=modelDepth/2, baseV=[
    [-halfW,-halfD,0],[halfW,-halfD,0],[halfW,halfD,0],[-halfW,halfD,0],
    [-halfW,-halfD,baseThickness],[halfW,-halfD,baseThickness],[halfW,halfD,baseThickness],[-halfW,halfD,baseThickness]
  ];
  var baseT=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
  return {route:{vertices:vertices,triangles:triangles},base:{vertices:baseV,triangles:baseT},
    width:modelWidth,depth:modelDepth,height:baseThickness+relief,routeWidth:routeWidthMm};
}
