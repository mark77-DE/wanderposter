// ---------- Embedded font (Barlow Condensed, subset, OFL) ----------
var FONT_M='__FONT_M__';
var FONT_S='__FONT_S__';
var FONT_CSS='@font-face{font-family:"BarlowC";font-weight:500;src:url(data:font/woff2;base64,'+FONT_M+') format("woff2");}'+
             '@font-face{font-family:"BarlowC";font-weight:600;src:url(data:font/woff2;base64,'+FONT_S+') format("woff2");}';
var fontStyle=document.createElement('style');
fontStyle.textContent=FONT_CSS;
document.head.appendChild(fontStyle);
var FF='BarlowC,"Arial Narrow","Helvetica Neue",Arial,sans-serif';
