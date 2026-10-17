'use strict';
// ---------- Flags for start and finish ----------
// type: 'start' (pennant), 'finish' or 'both' (checkered). The pole base sits on the route point.
function flagSVG(x,y,type,pal){
  var s=x>M+W-6?-1:1, q=sc(1), H=5.2*q, out='';
  var top=y-H;
  out+='<line x1="'+f(x)+'" y1="'+f(y)+'" x2="'+f(x)+'" y2="'+f(top)+'" stroke="'+pal.ink+'" stroke-width=".45" stroke-linecap="round"/>';
  out+='<circle cx="'+f(x)+'" cy="'+f(y)+'" r=".6" fill="'+pal.ink+'"/>';
  if(type==='start'){
    var pts=[[x,top],[x+s*3.8*q,top+1.2*q],[x,top+2.4*q]].map(function(p){return f(p[0])+','+f(p[1]);}).join(' ');
    out+='<polygon points="'+pts+'" fill="'+pal.route+'" stroke="'+pal.route+'" stroke-width=".2" stroke-linejoin="round"/>';
  }else{
    var cols=4, rows=3, cw=.9*q, ch=.8*q, ox=s>0?x:x-cols*cw;
    out+='<rect x="'+f(ox)+'" y="'+f(top)+'" width="'+f(cols*cw)+'" height="'+f(rows*ch)+'" fill="'+pal.bg+'"/>';
    for(var i=0;i<cols;i++){for(var j=0;j<rows;j++){
      if((i+j)%2===0){out+='<rect x="'+f(ox+i*cw)+'" y="'+f(top+j*ch)+'" width="'+cw+'" height="'+ch+'" fill="'+pal.ink+'"/>';}
    }}
    out+='<rect x="'+f(ox)+'" y="'+f(top)+'" width="'+f(cols*cw)+'" height="'+f(rows*ch)+'" fill="none" stroke="'+pal.ink+'" stroke-width=".2"/>';
  }
  return out;
}

// ---------- Rendering ----------
function render(){
  var pal=palette(), t=state.track, geo=geometry(), h='';
  h+='<rect width="100" height="'+f(fmt().H)+'" fill="'+pal.bg+'"/>';
  h+='<text id="ptitle" x="'+M+'" y="'+LAY.titleY+'" font-size="'+titleFs()+'" font-weight="600" fill="'+pal.ink+'">'+esc(state.title||'Titel')+'</text>';
  h+='<text id="preg" x="'+(M+W)+'" y="'+f(LAY.dateY-sc(2.8)*1.1)+'" font-size="'+sc(2.8)+'" font-weight="600" text-anchor="end" fill="'+pal.ink+'">'+esc(state.region)+'</text>';
  h+='<text id="pdate" x="'+(M+W)+'" y="'+LAY.dateY+'" font-size="'+sc(2.8)+'" font-weight="500" text-anchor="end" fill="'+pal.muted+'">'+esc(formatDate(state.date))+'</text>';
  h+='<line x1="'+M+'" x2="'+(M+W)+'" y1="'+LAY.ruleY+'" y2="'+LAY.ruleY+'" stroke="'+pal.ink+'" stroke-opacity=".3" stroke-width=".2"/>';

  if(!t){
    h+='<text x="50" y="'+f(fmt().H/2)+'" font-size="'+sc(3.6)+'" font-weight="500" text-anchor="middle" fill="'+pal.muted+'">GPX-Datei laden oder Beispielroute wählen</text>';
  }else{
    // route
    var d='M'+geo.mp.map(function(p){return f(p[0])+' '+f(p[1]);}).join('L');
    h+='<path d="'+d+'" fill="none" stroke="'+pal.route+'" stroke-width="'+sc(.8)+'" stroke-linecap="round" stroke-linejoin="round"/>';
    var a0=geo.mp[0], a1=geo.mp[geo.mp.length-1];
    if(t.closed){h+=flagSVG(a0[0],a0[1],'both',pal);}
    else{h+=flagSVG(a0[0],a0[1],'start',pal)+flagSVG(a1[0],a1[1],'finish',pal);}

    // elevation profile
    if(t.hasEle){
      var pp=t.s.map(function(p){return [geo.profX(p.d),geo.profY(p.e)];});
      var line='M'+pp.map(function(p){return f(p[0])+' '+f(p[1]);}).join('L');
      h+='<path d="'+line+'L'+f(pp[pp.length-1][0])+' '+LAY.profB+'L'+f(pp[0][0])+' '+LAY.profB+'Z" fill="'+pal.profile+'" fill-opacity=".14"/>';
      h+='<path d="'+line+'" fill="none" stroke="'+pal.profile+'" stroke-width="'+sc(.45)+'" stroke-linejoin="round"/>';
    }else{
      h+='<text x="50" y="'+((LAY.profT+LAY.profB)/2)+'" font-size="3" font-weight="500" text-anchor="middle" fill="'+pal.muted+'">Keine Höhendaten in der GPX-Datei</text>';
    }
    h+='<line x1="'+M+'" x2="'+(M+W)+'" y1="'+LAY.profB+'" y2="'+LAY.profB+'" stroke="'+pal.ink+'" stroke-opacity=".55" stroke-width=".25"/>';

    // distance ticks
    var km=t.total/1000, steps=[0.5,1,2,5,10,20,25,50,100], step=100, q;
    for(q=0;q<steps.length;q++){if(km/steps[q]<=6){step=steps[q];break;}}
    var count=Math.floor(km/step+1e-9);
    for(q=0;q<=count;q++){
      var x=geo.profX(q*step*1000), lab=de(q*step,step<1?1:0)+(q===count?' km':'');
      var anchor=q===0?'start':(x>M+W-5?'end':'middle');
      h+='<line x1="'+f(x)+'" x2="'+f(x)+'" y1="'+LAY.profB+'" y2="'+(LAY.profB+0.9)+'" stroke="'+pal.ink+'" stroke-opacity=".55" stroke-width=".25"/>';
      h+='<text x="'+f(x)+'" y="'+LAY.axisY+'" font-size="'+sc(2.2)+'" font-weight="500" text-anchor="'+anchor+'" fill="'+pal.muted+'">'+lab+'</text>';
    }

    // compact two-line stats, laid out in equal-width columns after rendering
    if(state.showStats){
      var items=[];
      if(state.stats.distance){items.push({value:de(km,1)+' km',label:'Strecke'});}
      if(t.hasEle&&state.stats.ascent){items.push({value:de(t.ascent),label:'HM'});}
      if(t.hasEle&&state.stats.max){items.push({value:de(t.maxE)+' m',label:'Höchster Punkt'});}
      if(t.hasEle&&state.stats.min){items.push({value:de(t.minE)+' m',label:'Tiefster Punkt'});}
      if(t.elapsed!=null&&state.stats.elapsed){items.push({value:formatDuration(t.elapsed),label:'Gesamtzeit'});}
      if(t.movingTime!=null&&state.stats.moving){items.push({value:formatDuration(t.movingTime),label:'Bewegungszeit'});}
      items.forEach(function(item){
        var statsScale=state.statsFontSize/100, valueFs=sc(2.35*statsScale), labelFs=sc(1.5*statsScale);
        var valueOffset=sc(1.8+(state.statsFontSize-100)*0.01);
        h+='<g class="stat"><text class="stat-value" x="0" y="'+f(LAY.statY-valueOffset)+'" font-size="'+valueFs+'" font-weight="600" text-anchor="middle" fill="'+pal.statValue+'">'+esc(item.value)+'</text>'+ 
          '<text class="stat-label" x="0" y="'+LAY.statY+'" font-size="'+labelFs+'" font-weight="500" text-anchor="middle" fill="'+pal.statLabel+'">'+esc(item.label)+'</text></g>';
      });
    }
  }
  if(t&&attrOn()){
    h+='<text id="pattr" x="'+(M+W)+'" y="'+f(fmt().B+sc(0.4))+'" font-size="'+sc(1.9)+'" font-weight="500" text-anchor="end" fill="'+pal.muted+'">'+esc(attrText())+'</text>';
  }
  if(state.fmt==='story'&&state.safe){
    var HH=fmt().H;
    h+='<g class="ui" pointer-events="none"><rect x="0" y="0" width="100" height="'+f(HH*0.13)+'" fill="#000" fill-opacity=".22"/>'+
       '<rect x="0" y="'+f(HH*0.82)+'" width="100" height="'+f(HH*0.18)+'" fill="#000" fill-opacity=".22"/></g>';
  }
  svg.innerHTML=h;
  var anchorNode=svg.children[1]||null;               // first node after the poster background
  if(bgEl&&state.bg){bgApply();svg.insertBefore(bgEl,anchorNode);anchorNode=bgEl.nextSibling;}
  if(mapG&&geo&&mapData&&state.map.style!=='none'){placeMap(geo);svg.insertBefore(mapClip,anchorNode);svg.insertBefore(mapG,anchorNode);}

  // fit title to the available width
  var tt=svg.querySelector('#ptitle');
  if(tt){
    var len=tt.getComputedTextLength(), rw=0;
    ['#preg','#pdate'].forEach(function(sel){
      var el=svg.querySelector(sel);
      if(el&&el.textContent.trim()){rw=Math.max(rw,el.getComputedTextLength());}
    });
    var maxW=W-(rw?rw+4:0);
    if(len>maxW){tt.setAttribute('font-size',f(titleFs()*maxW/len));}
  }
  var pa=svg.querySelector('#pattr');
  if(pa){var pl=pa.getComputedTextLength(); if(pl>W){pa.setAttribute('font-size',f(sc(1.9)*W/pl));}}
  // center each stat in its column and shrink only text that exceeds that column
  var stats=Array.prototype.slice.call(svg.querySelectorAll('.stat'));
  if(stats.length){
    var cellW=W/stats.length;
    stats.forEach(function(g,i){
      var cx=M+cellW*(i+.5);
      Array.prototype.forEach.call(g.children,function(e){
        e.setAttribute('x',f(cx));
        var width=e.getComputedTextLength(), maxW=cellW-1.2;
        if(width>maxW){e.setAttribute('font-size',f(+e.getAttribute('font-size')*maxW/width));}
      });
    });
  }

  if(t){drawHighlights(geo,pal);}
  updateCaption();
  ensureBackdrop();
}

function drawHighlights(geo,pal){
  var t=state.track;
  var order=state.hl.slice().sort(function(a,b){return a.d-b.d;});
  var gLead=svgEl('g',{},svg), gLab=svgEl('g',{},svg), gPins=svgEl('g',{},svg);
  var items=[];

  // pass 1: build every label and measure it
  order.forEach(function(hl,i){
    hl.n=i+1;
    var sm=sampleAt(hl.d), mp=geo.mapPt(sm), px=geo.profX(hl.d), py=geo.profY(sm.e);
    var lab=svgEl('g',{'data-drag':'label','data-id':hl.id},gLab);
    var showName=hl.name&&hl.name.trim().length>0, lines=0;
    var showEleLine=state.showEle&&(t.hasEle||hl.ele!=null)&&!hl.hideEle;
    // the bottom line sits on the anchor baseline, further lines grow upwards (keeps the gap to the profile constant)
    if(showName){
      var nl=wrapName(hl.name,hl), base=showEleLine?-hlFs(3.1,hl):0;
      nl.forEach(function(line,k){
        svgEl('text',{x:0,y:f(base-(nl.length-1-k)*hlFs(3.5,hl)),'font-size':hlFs(3.3,hl),'font-weight':600,'text-anchor':'middle',fill:pal.highlight},lab,line);
      });
      lines++;
    }
    if(showEleLine){
      var eleShown=hl.ele!=null?hl.ele:sm.e;
      svgEl('text',{x:0,y:0,'font-size':showName?hlFs(2.4,hl):hlFs(3.1,hl),'font-weight':showName?500:600,'text-anchor':'middle',fill:pal.highlight},lab,de(eleShown)+' m');lines++;
    }
    if(!lines){svgEl('text',{x:0,y:0,'font-size':hlFs(3.3,hl),'font-weight':600,'text-anchor':'middle',fill:pal.highlight},lab,'Highlight');}
    var bb=lab.getBBox(), rr=hl.rot*Math.PI/180;
    var halfW=(bb.width/2+1.3)*Math.abs(Math.cos(rr))+(bb.height/2+1)*Math.abs(Math.sin(rr));
    items.push({hl:hl,lab:lab,bb:bb,halfW:halfW,mp:mp,px:px,py:py,anchor:t.hasEle&&state.labelMode==='profile'?[px,py]:mp});
  });

  // pass 2: automatic layout for labels the user has not moved by hand
  var overlap=false;
  if(t.hasEle&&state.labelMode==='profile'){
    var B0=LAY.profT-state.labelGap, ROWS=3, GAPX=1.2, MAXSHIFT=14, step=0, rows=[[],[],[]];
    items.forEach(function(it){if(!it.hl.manual){step=Math.max(step,it.bb.height+2.6);}});
    items.forEach(function(it){
      if(it.hl.manual){return;}
      var hw=it.halfW, lo=M+hw, hi=M+W-hw, want=clamp(it.px,lo,hi), row, cx, done=false;
      for(row=0;row<ROWS&&!done;row++){
        cx=want;
        for(var tries=0;tries<8;tries++){
          var hit=null;
          rows[row].forEach(function(iv){
            if(iv[0]<cx+hw+GAPX&&iv[1]>cx-hw-GAPX&&(!hit||iv[1]>hit[1])){hit=iv;}
          });
          if(!hit){done=true;break;}
          cx=hit[1]+GAPX+hw;
          if(cx>hi||cx-it.px>MAXSHIFT){break;}
        }
        if(done){break;}
      }
      if(!done){row=ROWS-1;cx=want;overlap=true;}
      rows[row].push([cx-hw,cx+hw]);
      it.hl.lx=cx; it.hl.ly=B0-row*step;
    });
  }else if(state.labelMode==='route'){
    var occupied=[];
    function labelCenter(it){
      var bb=it.bb,a=it.hl.rot*Math.PI/180,cx=bb.x+bb.width/2,cy=bb.y+bb.height/2;
      return [it.hl.lx+cx*Math.cos(a)-cy*Math.sin(a),it.hl.ly+cx*Math.sin(a)+cy*Math.cos(a)];
    }
    function rectFor(it,cx,cy){
      var a=it.hl.rot*Math.PI/180,bb=it.bb,pad=state.plates&&state.plateOpacity>0;
      var w=bb.width+(pad?2.6:0),h=bb.height+(pad?2:0);
      var hw=w/2*Math.abs(Math.cos(a))+h/2*Math.abs(Math.sin(a));
      var hh=w/2*Math.abs(Math.sin(a))+h/2*Math.abs(Math.cos(a));
      return {l:cx-hw,r:cx+hw,t:cy-hh,b:cy+hh};
    }
    items.forEach(function(it){
      if(!it.hl.manual){return;}
      var c=labelCenter(it); occupied.push(rectFor(it,c[0],c[1]));
    });
    items.forEach(function(it){
      if(it.hl.manual){return;}
      var span=Math.max(20,Math.min(100,t.total/100));
      var before=geo.mapPt(sampleAt(Math.max(0,it.hl.d-span)));
      var after=geo.mapPt(sampleAt(Math.min(t.total,it.hl.d+span)));
      var dx=after[0]-before[0],dy=after[1]-before[1],len=Math.hypot(dx,dy)||1;
      var nx=-dy/len,ny=dx/len, clear=state.labelGap+rectFor(it,0,0).b+sc(1.45)+.6;
      var bb=it.bb,a=it.hl.rot*Math.PI/180,cx0=bb.x+bb.width/2,cy0=bb.y+bb.height/2;
      var ox=cx0*Math.cos(a)-cy0*Math.sin(a),oy=cx0*Math.sin(a)+cy0*Math.cos(a);
      var best=null,bestScore=Infinity;
      [[nx,ny],[-nx,-ny]].forEach(function(n){
        var cx=it.mp[0]+n[0]*clear,cy=it.mp[1]+n[1]*clear,r=rectFor(it,cx,cy);
        var overflow=Math.max(0,M+1-r.l,r.r-(M+W-1),LAY.mapT+1-r.t,r.b-(state.mapB-1));
        var hits=0;
        occupied.forEach(function(o){if(r.l<o.r+1&&r.r>o.l-1&&r.t<o.b+1&&r.b>o.t-1){hits++;}});
        var score=overflow*100+hits*20+cy*.001;
        if(score<bestScore){bestScore=score;best={cx:cx,cy:cy,r:r,lx:cx-ox,ly:cy-oy,hits:hits};}
      });
      it.hl.lx=best.lx; it.hl.ly=best.ly;
      if(best.hits){overlap=true;}
      occupied.push(best.r);
    });
  }else{
    items.forEach(function(it){
      if(it.hl.manual){return;}
      it.hl.lx=clamp(it.mp[0],M+it.halfW,M+W-it.halfW); it.hl.ly=clamp(it.mp[1]-6,LAY.mapT,LAY.mapB+4);
    });
  }
  // labels moved by hand stay inside the safe margin
  items.forEach(function(it){
    if(it.hl.manual){it.hl.lx=clamp(it.hl.lx,M+it.halfW,M+W-it.halfW);}
  });
  var covers=false;
  if(state.labelMode==='profile'){
    var topY=Infinity;
    items.forEach(function(it){
      var bb=it.bb,a=it.hl.rot*Math.PI/180,cx=bb.x+bb.width/2,cy=bb.y+bb.height/2;
      var platePad=state.plates&&state.plateOpacity>0,w=bb.width+(platePad?2.6:0),h=bb.height+(platePad?2:0);
      var rotatedCenterY=cx*Math.sin(a)+cy*Math.cos(a);
      var rotatedHalfH=w/2*Math.abs(Math.sin(a))+h/2*Math.abs(Math.cos(a));
      topY=Math.min(topY,it.hl.ly+rotatedCenterY-rotatedHalfH);
    });
    var MAP_FLOOR=LAY.mapT+0.65*(LAY.mapB-LAY.mapT), wantB=isFinite(topY)?clamp(topY-1.5,MAP_FLOOR,LAY.profT-4):LAY.profT-7;
    if(Math.abs(wantB-state.mapB)>0.2&&!state.relayout){
      state.mapB=wantB; state.relayout=true;
      render();
      state.relayout=false;
      return;
    }
    covers=isFinite(topY)&&topY<state.mapB+0.5;
  }
  var ovl=$('#ovl');
  if(ovl){
    ovl.textContent=overlap?'Einige Beschriftungen überlappen. Name kürzen, Label drehen oder von Hand verschieben.'
      :(covers?'Die Beschriftungen reichen in die Karte. Namen kürzen oder den Abstand verkleinern.':'');
  }

  // pass 3: place labels, leader lines and pins
  items.forEach(function(it){
    var hl=it.hl, bb=it.bb, lab=it.lab;
    lab.setAttribute('transform','translate('+f(hl.lx)+' '+f(hl.ly)+') rotate('+hl.rot+')');
    var plate=svgEl('rect',{x:f(bb.x-1.3),y:f(bb.y-1),width:f(bb.width+2.6),height:f(bb.height+2),rx:.7,fill:pal.bg,'fill-opacity':state.plates?state.plateOpacity/100:0},null);
    lab.insertBefore(plate,lab.firstChild);
    // leader line from the pin to the label centre (the plate hides the end of it)
    var cy=state.plates&&state.plateOpacity>0?bb.y+bb.height/2:bb.y+bb.height+0.8, r=hl.rot*Math.PI/180;   // without a visible plate the line stops at the text
    svgEl('line',{x1:f(it.anchor[0]),y1:f(it.anchor[1]),x2:f(hl.lx-cy*Math.sin(r)),y2:f(hl.ly+cy*Math.cos(r)),stroke:pal.ink,'stroke-width':.25,'stroke-opacity':.75},gLead);
    // pins on the map and in the profile
    function pin(cx,cy2,rad,fs,type){
      var g=svgEl('g',{},gPins);
      svgEl('circle',{cx:f(cx),cy:f(cy2),r:rad,fill:pal.ink,stroke:pal.bg,'stroke-width':.3},g);
      svgEl('text',{x:f(cx),y:f(cy2+fs*0.34),'font-size':fs,'font-weight':600,'text-anchor':'middle',fill:pal.bg},g,String(hl.n));
      svgEl('circle',{cx:f(cx),cy:f(cy2),r:rad+1.6,fill:'transparent','data-drag':type,'data-id':hl.id,'class':'ui'},g);
    }
    pin(it.mp[0],it.mp[1],sc(1.45),sc(1.9),'mappin');
    if(t.hasEle){pin(it.px,it.py,sc(1.55),sc(2),'marker');}
  });
}

// split a long name into two lines at the space nearest to the middle
function wrapName(name,hl){
  var res=[name], probe=svgEl('text',{x:0,y:0,'font-size':hlFs(3.3,hl),'font-weight':600,visibility:'hidden'},svg,name);
  var len=probe.getComputedTextLength();
  probe.remove();
  if(len>30&&name.indexOf(' ')>0){
    var mid=name.length/2, best=-1, bd=1e9;
    for(var i=0;i<name.length;i++){
      if(name.charAt(i)===' '&&Math.abs(i-mid)<bd){bd=Math.abs(i-mid);best=i;}
    }
    if(best>0){res=[name.slice(0,best),name.slice(best+1)];}
  }
  return res;
}

function updateCaption(){
  var F=fmt(), txt;
  if(F.print){var px=Math.round(F.mmW/25.4*300), py=Math.round(F.mmH/25.4*300);txt='Vorschau '+de(F.mmW)+' × '+de(F.mmH)+' mm, PNG-Export '+de(px)+' × '+de(py)+' px';}
  else{txt='Vorschau '+F.name+', PNG-Export '+de(F.px[0])+' × '+de(F.px[1])+' px';}
  $('#caption').textContent=txt;
}
