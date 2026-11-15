// Builds .shots/fx-concepts/index.html (standalone: PNGs + labels + playing boxes) from the strips the lab
// page fx-concepts.html saved as .shots/fxc_<row>_<col>.png.   node scripts/build-fx-concepts.mjs
import fs from "node:fs";
import { ROWS } from "../concept/fx-concepts.js";
const OUT = ".shots/fx-concepts";
fs.mkdirSync(OUT, { recursive: true });
const LABEL = { today: "TODAY", today2: "TODAY (frostnova)", A: "A  clean", B: "B  worked", C: "C  bold", Bdark: "B on dark ground" };
const rows = [];
for (const r of ROWS) {
  const cols = r.cols2 ? ["today", "today2"] : ["today", "A", "B", "C", "Bdark"];
  const strips = [];
  for (const k of cols) {
    const src = `.shots/fxc_${r.id}_${k}.png`;
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, `${OUT}/${r.id}_${k}.png`);
    strips.push({ k, label: r.cols2 && k === "today" ? "firenova (kept)" : LABEL[k], file: `${r.id}_${k}.png` });
  }
  rows.push({ id: r.id, label: r.label, group: r.group, note: r.note, cw: r.cw, ch: r.ch, n: r.N, strips });
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Crownguard FX concepts</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#15171d;color:#d8dbe4;font:14px/1.35 system-ui,sans-serif;padding:0 0 60px}
h1{margin:0;padding:14px 16px;font-size:18px;background:#1e2230;border-bottom:1px solid #353b52}
h1 span{font-weight:400;color:#9aa3c4;font-size:13px;display:block;margin-top:4px}
h2{margin:22px 16px 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#d9b25a}
.row{margin:8px 12px;border:1px solid #2c3146;border-radius:8px;background:#1a1d27;padding:8px 10px}
.row h3{margin:0 0 2px;font-size:16px}.row p{margin:0 0 8px;color:#8b93b3;font-size:12px}
.ln{display:flex;align-items:center;gap:10px;margin:4px 0;overflow-x:auto}
.lb{flex:0 0 92px;font-weight:700;font-size:12px;color:#9fd18a}.lb.t{color:#e8b0a0}.lb.d{color:#9aa3c4}
.st{flex:0 0 auto;image-rendering:pixelated;background-repeat:no-repeat;border:1px solid #2c3146}
.pick{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 2px}.pick button{height:38px;min-width:64px;border-radius:6px;border:1px solid #555d7a;background:#2b3250;color:#fff;font-size:14px}.pick button.on{background:#d9b25a;color:#15171d;border-color:#d9b25a;font-weight:700}
#bar{position:sticky;top:0;z-index:5;background:#1e2230;border-bottom:1px solid #353b52;padding:8px 12px;display:flex;gap:10px;align-items:center}#bar button{height:36px;border-radius:6px;border:1px solid #555d7a;background:#2b3250;color:#fff;padding:0 14px}#bar textarea{display:none;flex:1;height:60px}
.play{flex:0 0 auto;image-rendering:pixelated;background-repeat:no-repeat;border:2px solid #3a4160;border-radius:4px;margin-left:6px}
</style></head><body>
<h1>Crownguard combat effects: concept options<span>One row per effect. TODAY is the game's own code; A clean, B worked, C bold. The box at the end of each strip plays it. Zoom 3, grass ground (and B on a Hollow dark ground).</span></h1>
<div id="bar"><span id="cnt">0 picked</span><button id="cp">Copy my picks</button><textarea id="fb" readonly></textarea></div><div id="root"></div>
<script>
const ROWS=${JSON.stringify(rows)};
let picks={};try{picks=JSON.parse(localStorage.getItem("cg-fx-picks")||"{}")}catch(e){}
const cnt=document.getElementById("cnt"),save=()=>{try{localStorage.setItem("cg-fx-picks",JSON.stringify(picks))}catch(e){}cnt.textContent=Object.keys(picks).length+" picked";};
document.getElementById("cp").onclick=()=>{const t=Object.entries(picks).map(([k,v])=>k+": "+v).join("\\n");const fb=document.getElementById("fb");const fail=()=>{fb.style.display="block";fb.value=t;fb.select();};try{navigator.clipboard.writeText(t).then(()=>{document.getElementById("cp").textContent="Copied";setTimeout(()=>document.getElementById("cp").textContent="Copy my picks",1200)},fail)}catch(e){fail()}};
const root=document.getElementById("root"),players=[];let grp="";
for(const r of ROWS){
  if(r.group!==grp){grp=r.group;const h=document.createElement("h2");h.textContent=grp;root.appendChild(h);}
  const d=document.createElement("div");d.className="row";d.innerHTML="<h3>"+r.label+"</h3><p>"+r.note+"</p>";
  const s=Math.min(0.67,150/(r.cw*3)),fw=Math.round(r.cw*3*s),fh=Math.round(r.ch*3*s);
  for(const st of r.strips){
    const l=document.createElement("div");l.className="ln";
    const lb=document.createElement("div");lb.className="lb"+(st.k.startsWith("today")?" t":st.k==="Bdark"?" d":"");lb.textContent=st.label;
    const im=document.createElement("div");im.className="st";im.style.cssText="width:"+(fw*r.n)+"px;height:"+fh+"px;background-image:url("+st.file+");background-size:"+(fw*r.n)+"px "+fh+"px";
    const pl=document.createElement("div");pl.className="play";const pw=Math.round(fw*1.4),ph=Math.round(fh*1.4);
    pl.style.cssText="width:"+pw+"px;height:"+ph+"px;background-image:url("+st.file+");background-size:"+(pw*r.n)+"px "+ph+"px";
    players.push({pl,pw,n:r.n});l.append(lb,im,pl);d.appendChild(l);
  }
  if(!r.strips.some(x=>x.k==="A")){root.appendChild(d);continue;}
  const pk=document.createElement("div");pk.className="pick";
  for(const o of ["Today","A","B","C"]){const b=document.createElement("button");b.textContent=o;b.onclick=()=>{picks[r.label]=o;save();pk.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));};if(picks[r.label]===o)b.classList.add("on");pk.appendChild(b);}
  d.appendChild(pk);
  root.appendChild(d);
}
save();
setInterval(()=>{const f=Math.floor(Date.now()/110);for(const p of players){p.pl.style.backgroundPosition=(-(f%(p.n+3)>=p.n?p.n-1:f%(p.n+3))*p.pw)+"px 0";}},110);
</script></body></html>`;
fs.writeFileSync(`${OUT}/index.html`, html);
console.log("rows", rows.length, "strips", rows.reduce((a, r) => a + r.strips.length, 0));
