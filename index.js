export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const room = (url.searchParams.get("room") || "DEMO").toUpperCase();
      const id = env.ROOMS.idFromName(room);
      return env.ROOMS.get(id).fetch(request);
    }
    if (url.pathname === "/health") return Response.json({ok:true,service:"mimic-5"});
    return new Response("MIMIC 5 ONLINE");
  }
};

export class Room {
  constructor(state) { this.state=state; this.state.blockConcurrencyWhile(async()=>{this.data=await this.state.storage.get("room")||{players:[],scores:{},started:false,round:1,turn:0};}); }
  async fetch(request) {
    if(request.headers.get("Upgrade")!=="websocket") return new Response("WebSocket required",{status:426});
    const u=new URL(request.url),name=(u.searchParams.get("name")||"Player").slice(0,18);
    const pair=new WebSocketPair();const [client,server]=Object.values(pair);this.state.acceptWebSocket(server);
    if(this.data.players.length>=5){server.close(1008,"Room full");return new Response(null,{status:101,webSocket:client});}
    const host=this.data.players.length===0;
    this.data.players.push({name,ready:true,host});
    if(!(name in this.data.scores))this.data.scores[name]=0;
    server.serializeAttachment({name});
    await this.save();this.broadcast();
    return new Response(null,{status:101,webSocket:client});
  }
  async save(){await this.state.storage.put("room",this.data)}
  sockets(){return this.state.getWebSockets()}
  findSocket(name){return this.sockets().find(s=>(s.deserializeAttachment()||{}).name===name)}
  broadcast(){const msg=JSON.stringify({type:"state",players:this.data.players,host:this.data.players.find(p=>p.host)?.name||""});for(const s of this.sockets())try{s.send(msg)}catch{}}
  async webSocketMessage(ws,raw){
    let m;try{m=JSON.parse(raw)}catch{return}
    const a=ws.deserializeAttachment()||{};
    if(m.type==="start"){
      if(!this.data.players[0]||this.data.players[0].name!==a.name)return;
      this.data.started=true;this.data.round=1;this.data.turn=0;await this.save();
      this.broadcastMsg({type:"start",players:this.data.players,round:1,turn:0,sound:{title:"Random Sound",cat:String(m.mode||"random").toUpperCase(),freq:220,kind:"noise"}});
    }
    if(m.type==="round" && this.data.started){
      this.data.round=Number(m.round)||this.data.round;this.data.turn=Number(m.turn)||0;await this.save();this.broadcastMsg({type:"round",round:this.data.round,turn:this.data.turn,sound:m.sound});
    }
    if(m.type==="score"){
      const n=String(m.name||a.name);if(this.data.scores[n]!==undefined)this.data.scores[n]+=Math.max(0,Math.min(100,Number(m.delta)||0));
      await this.save();this.broadcastMsg({type:"score",scores:this.data.scores});
    }
  }
  broadcastMsg(m){const x=JSON.stringify(m);for(const s of this.sockets())try{s.send(x)}catch{}}
  async webSocketClose(ws){const a=ws.deserializeAttachment()||{};this.data.players=this.data.players.filter(p=>p.name!==a.name);if(this.data.players.length)this.data.players[0].host=true;else this.data={players:[],scores:{},started:false,round:1,turn:0};await this.save();this.broadcast()}
}
