const MAX=5, TOTAL_ROUNDS=10;
const PACKS=[
 {id:"laugh",title:"Laugh Attack",cat:"MEME",kind:"noise",freq:220},
 {id:"wow",title:"Dramatic WOW",cat:"MEME",kind:"noise",freq:330},
 {id:"sad",title:"Tiny Violin",cat:"MEME",kind:"melody",freq:196},
 {id:"robot",title:"Robot BEEP",cat:"WEIRD",kind:"robot",freq:420},
 {id:"win",title:"Victory Jingle",cat:"MUSIC",kind:"melody",freq:523},
 {id:"villain",title:"Villain Laugh",cat:"MEME",kind:"noise",freq:150},
 {id:"bass",title:"Bass Drop",cat:"MUSIC",kind:"bass",freq:90},
 {id:"slip",title:"Cartoon WHOOPS",cat:"MEME",kind:"slide",freq:600},
 {id:"alarm",title:"Crazy Alarm",cat:"WEIRD",kind:"alarm",freq:700},
 {id:"suspense",title:"Suspense Hit",cat:"SFX",kind:"bass",freq:110}
];
const S={room:null,name:null,host:false,players:[],mode:"random",round:1,turn:0,scores:{},socket:null,rec:null,stream:null,recording:false,current:null,roundStart:0};
const $=id=>document.getElementById(id);
function view(id){document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));$(id).classList.add("active")}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
function esc(x){return String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
document.addEventListener("click",e=>{const a=e.target.closest("[data-action]");if(!a)return;const x=a.dataset.action;if(x==="create")create();if(x==="join")view("join");if(x==="joinRoom")join();if(x==="home")location.reload();if(x==="copy")copy();if(x==="start")start();if(x==="mic")toggleMic()});
function create(){S.room=Math.random().toString(36).slice(2,8).toUpperCase();S.name="Host";S.host=true;S.players=[{name:S.name,ready:true,host:true}];S.scores[S.name]=0;openLobby();connect()}
function join(){const n=$("nameInput").value.trim(),c=$("codeInput").value.trim().toUpperCase();if(!n||c.length<4)return toast("دخل الاسم والكود");S.name=n;S.room=c;S.players=[{name:n,ready:true}];S.scores[n]=0;openLobby();connect()}
function openLobby(){$("roomCode").textContent=S.room;renderLobby();view("lobby")}
function connect(){const base=localStorage.getItem("MIMIC_WS");if(!base){$("onlineText").textContent="DEMO";return}try{S.socket=new WebSocket(base+"?room="+encodeURIComponent(S.room)+"&name="+encodeURIComponent(S.name));S.socket.onopen=()=>{$("onlineText").textContent="ONLINE"};S.socket.onclose=()=>{$("onlineText").textContent="OFFLINE"};S.socket.onmessage=e=>server(JSON.parse(e.data))}catch{toast("تعذر الاتصال بالسيرفر")}}
function send(m){if(S.socket?.readyState===1)S.socket.send(JSON.stringify(m))}
function server(m){if(m.type==="state"){S.players=m.players.slice(0,MAX);S.host=m.host===S.name;renderLobby()}if(m.type==="start"){S.players=m.players||S.players;S.round=m.round||1;S.turn=m.turn||0;begin(m.sound||randomSound())}if(m.type==="round"){S.round=m.round;S.turn=m.turn;begin(m.sound)}}if(m.type==="score"){S.scores=m.scores;renderResults()}}
function renderLobby(){$("playerCount").textContent=S.players.length+"/"+MAX;$("playerList").innerHTML=S.players.map(p=>`<div class="player"><div class="avatar">${esc(p.name[0]||"?")}</div><div class="pname">${esc(p.name)}</div>${p.host?'<span class="badge">HOST</span>':""}<span class="ready">${p.ready?"READY":"WAIT"}</span></div>`).join("");$("startGame").disabled=!(S.host&&S.players.length>=2);$("lobbyHint").textContent=S.players.length<2?"خاص لاعب آخر على الأقل.":S.host?"أنت المضيف. اللعبة جاهزة.":"بانتظار المضيف."}
function modes(){const data=[["random","RANDOM","خلطة"],["memes","MEMES","ميمز"],["music","MUSIC","موسيقى"],["weird","WEIRD","أصوات غريبة"]];$("modeGrid").innerHTML=data.map((m,i)=>`<button class="mode ${i===0?"active":""}" data-mode="${m[0]}"><b>${m[1]}</b><small>${m[2]}</small></button>`).join("");$("modeGrid").onclick=e=>{const b=e.target.closest(".mode");if(!b)return;document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");S.mode=b.dataset.mode}}
modes();
function randomSound(){let p=PACKS;if(S.mode==="memes")p=p.filter(x=>x.cat==="MEME");if(S.mode==="music")p=p.filter(x=>x.cat==="MUSIC");if(S.mode==="weird")p=p.filter(x=>x.cat==="WEIRD");return p[Math.floor(Math.random()*p.length)]}
function start(){if(!S.host)return;send({type:"start",mode:S.mode});begin(randomSound())}
function begin(sound){S.current=sound;S.recording=false;$("round").textContent=S.round;$("turnName").textContent=S.players[S.turn%S.players.length]?.name||"PLAYER";$("category").textContent=sound.cat;$("soundTitle").textContent=sound.title;$("roundScore").textContent="—";$("micStatus").textContent=S.turn%S.players.length===S.players.findIndex(p=>p.name===S.name)?"دورك — قلد الآن":"استمع وانتظر دورك";$("mic").classList.remove("recording");view("game");startClock()}
let clockId;
function startClock(){clearInterval(clockId);let t=10;$("clock").textContent=t;clockId=setInterval(()=>{t--;$("clock").textContent=t;if(t<=0){clearInterval(clockId);if(S.recording)toggleMic();if(S.turn%S.players.length===S.players.findIndex(p=>p.name===S.name))finishTurn()}},1000)}
function audioCtx(){return new(window.AudioContext||window.webkitAudioContext)()}
function playReference(){const c=audioCtx(),g=c.createGain();g.gain.value=.045;g.connect(c.destination);const s=S.current||PACKS[0],now=c.currentTime;let seq=s.kind==="melody"?[s.freq,s.freq*1.25,s.freq*1.5]:s.kind==="slide"?[s.freq,s.freq*.65,s.freq*.4]:[s.freq,s.freq];seq.forEach((f,i)=>{const o=c.createOscillator();o.type=s.kind==="robot"?"square":"sine";o.frequency.setValueAtTime(f,now+i*.25);if(s.kind==="slide")o.frequency.exponentialRampToValueAtTime(Math.max(60,f*.5),now+i*.25+.3);o.connect(g);o.start(now+i*.25);o.stop(now+i*.25+.23)});setTimeout(()=>c.close(),1500)}
$("reference").onclick=playReference;
async function toggleMic(){if(S.turn%S.players.length!==S.players.findIndex(p=>p.name===S.name))return toast("انتظر دورك");if(S.recording){S.recording=false;S.rec?.stop();$("mic").classList.remove("recording");return}try{S.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});S.chunks=[];S.roundStart=performance.now();S.rec=new MediaRecorder(S.stream);S.rec.ondataavailable=e=>S.chunks.push(e.data);S.rec.onstop=()=>{S.stream.getTracks().forEach(t=>t.stop());score();};S.rec.start();S.recording=true;$("mic").classList.add("recording");$("micStatus").textContent="سجّل الآن..."}catch{toast("اسمح بالميكروفون من المتصفح")}}
function score(){const elapsed=performance.now()-S.roundStart;const ideal=2500;const timing=Math.max(0,1-Math.abs(elapsed-ideal)/4000);const s=Math.round(55+timing*45);S.scores[S.name]=(S.scores[S.name]||0)+s;$("roundScore").textContent=s;send({type:"score",name:S.name,delta:s});setTimeout(finishTurn,900)}
function finishTurn(){if(S.round>=TOTAL_ROUNDS){renderResults();view("results");return}S.round++;S.turn=(S.turn+1)%S.players.length;const sound=randomSound();send({type:"round",round:S.round,turn:S.turn,sound});begin(sound)}
function renderResults(){const a=Object.entries(S.scores).sort((x,y)=>y[1]-x[1]);$("resultsList").innerHTML=a.map((x,i)=>`<div class="result"><div class="pos">#${i+1}</div><div class="rname">${esc(x[0])}</div><div class="score">${x[1]}</div></div>`).join("")}
function copy(){navigator.clipboard?.writeText(S.room);toast("تم نسخ الكود")}
