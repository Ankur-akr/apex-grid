import React, {useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {motion} from "framer-motion";
import {Upload, Play, Trophy, Flag, BrainCircuit, BookOpen, Database, Gauge, Download, ChevronRight, Info, Zap, CircleDot, Timer, Wind, Gauge as SpeedIcon, CircleHelp, CarFront, Radio, MapPin, Circle, Users, Linkedin, Github, Instagram, ExternalLink} from "lucide-react";
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar} from "recharts";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const models = [
  {id:"linear", name:"Linear Regression", type:"Baseline regression", desc:"A transparent baseline for estimating finishing position from race features."},
  {id:"mlp", name:"MLP Regressor", type:"Neural network", desc:"Learns nonlinear relationships between driver, constructor and race features."},
  {id:"xgboost", name:"XGBoost", type:"Gradient boosting", desc:"Boosted decision trees for complex feature interactions and nonlinear patterns."}
];

const glossary = [
  ["Grid","The starting position of a driver on the race grid."],
  ["Pole","First starting position, normally earned through the fastest qualifying performance."],
  ["Podium","The top three finishing positions."],
  ["DNF","Did Not Finish."],
  ["VSC","Virtual Safety Car; a controlled speed-neutralisation procedure."],
  ["Safety Car","A physical safety car that controls the field during certain incidents."],
  ["Undercut","Pitting earlier to use fresh tyres and gain track position when the rival stops later."],
  ["Overcut","Staying out longer and using clear track or tyre timing to gain position."],
  ["Stint","The period a driver spends on one set of tyres between pit stops."],
  ["Constructor","The team/constructor competing with its cars and drivers."],
];

function App(){
  const [page,setPage]=useState("overview");
  const [model,setModel]=useState("xgboost");
  const [file,setFile]=useState(null);
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [demo,setDemo]=useState(null);

  const run = async (path="/api/predict")=>{
    if(!file){setError("Upload a CSV or XLSX file first.");return}
    setBusy(true); setError("");
    try{
      const form=new FormData(); form.append("file",file);
      const res=await fetch(`${API}${path}?model=${model}`,{method:"POST",body:form});
      if(!res.ok) throw new Error(await res.text());
      const json=await res.json(); setData(json); setPage(path.includes("simulate")?"championship":"race");
    }catch(e){setError(e.message || "Prediction failed.");}
    finally{setBusy(false)}
  };

  const validate = async (f)=>{
    setFile(f); setError(""); setData(null);
    try{
      const form=new FormData(); form.append("file",f);
      const r=await fetch(`${API}/api/validate`,{method:"POST",body:form});
      if(!r.ok) throw new Error(await r.text());
      setDemo(await r.json());
    }catch(e){setError("Could not validate file. Is the FastAPI server running?")}
  };

  const loadDemo=async()=>{try{const r=await fetch(`${API}/api/demo`);setDemo(await r.json());}catch{}};

  const nav=[
    ["overview","Overview",Gauge],["race","Race Prediction",Flag],["championship","Championship",Trophy],
    ["models","Model Lab",BrainCircuit],["data","Data Explorer",Database],["learn","Learn F1",BookOpen],["team","Team",Users]
  ];

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandMark">AG</div><div><b>APEX GRID</b><span>F1 PREDICTION INTELLIGENCE</span></div></div>
      <nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><Icon size={17}/>{label}</button>)}</nav>
      <div className="sideNote"><span className="dot"></span> Prediction engine online</div>
    </aside>

    <main>
      <header className="topbar">
        <div><span className="eyebrow">FORMULA 1 / MACHINE LEARNING</span><h1>{pageTitle(page)}</h1></div>
        <div className="topActions">
          <label className="uploadBtn"><Upload size={16}/> Upload Dataset<input type="file" accept=".csv,.xlsx,.xls" onChange={e=>e.target.files[0]&&validate(e.target.files[0])}/></label>
          <button className="modelPill" onClick={()=>setPage("models")}><BrainCircuit size={15}/>{models.find(m=>m.id===model)?.name}</button>
        </div>
      </header>

      {error && <div className="error"><Info size={16}/>{error}</div>}

      {page==="overview" && <Overview setPage={setPage} loadDemo={loadDemo} demo={demo} file={file} model={model} setModel={setModel} run={run} busy={busy}/>}
      {page==="models" && <ModelLab model={model} setModel={setModel} file={file} run={run} busy={busy}/>}
      {page==="race" && <Race data={data}/>}
      {page==="championship" && <Championship data={data}/>}
      {page==="data" && <DataExplorer file={file} demo={demo}/>}
      {page==="learn" && <LearnF1/>}
      {page==="team" && <Team/>}
    </main>
  </div>
}

function pageTitle(p){return {overview:"Command Center",race:"Race Prediction",championship:"Championship",models:"Model Lab",data:"Data Explorer",learn:"Learn F1",team:"The Team"}[p]}

function Overview({setPage,loadDemo,demo,file,model,setModel,run,busy}){
 return <div className="content">
   <section className="hero">
     <div className="heroCopy"><div className="kicker"><span></span> LIVE PREDICTION ENGINE</div>
       <h2>Predict the grid.<br/><em>Understand the race.</em></h2>
       <p>Upload an F1 dataset, choose a machine-learning model, simulate race outcomes and explore how championship standings could evolve.</p>
       <div className="heroBtns"><button className="primary" onClick={()=>document.querySelector('input[type=file]').click()}><Upload size={17}/> Upload Dataset</button><button className="ghost" onClick={()=>setPage("learn")}><BookOpen size={17}/> Learn F1</button></div>
     </div>
     <div className="heroImage"><img src="/images/apex-hero.svg" alt="Abstract F1 race circuit visualization"/></div><div className="telemetry">
       <div className="telemetryTop"><span>APEX / TELEMETRY</span><b>SIMULATION READY</b></div>
       <div className="track"><div className="trackLine"></div><div className="car">▰</div><div className="speed">312 <small>KM/H</small></div></div>
       <div className="telemetryGrid"><span>SECTOR <b>02</b></span><span>LAP <b>14 / 57</b></span><span>GAP <b>+0.482</b></span></div>
     </div>
   </section>
   <div className="stats">
     <Stat label="DATASET" value={demo?.rows?.toLocaleString() || "10,779"} sub="historical records"/>
     <Stat label="SEASONS" value={demo?.seasons?.length || "40"} sub={demo?.seasons ? `${demo.seasons[0]} — ${demo.seasons.at(-1)}` : "1983 — 2022"}/>
     <Stat label="DRIVERS" value={demo?.drivers || "—"} sub="detected drivers"/>
     <Stat label="MODELS" value="03" sub="ML engines"/>
   </div>
   <section className="panel predictionPanel">
     <div className="sectionHead"><div><span className="eyebrow">PREDICTION WORKSPACE</span><h3>Race Weekend Simulator</h3></div><span className="status">● READY</span></div>
     <div className="workspace">
       <div className="drop" onClick={()=>document.querySelector('input[type=file]').click()}><Upload size={25}/><b>{file ? file.name : "Drop your dataset here"}</b><span>{file ? `${(file.size/1024/1024).toFixed(2)} MB selected` : "CSV or XLSX • click to browse"}</span></div>
       <div className="modelSelect"><label>MODEL</label><select value={model} onChange={e=>setModel(e.target.value)}>{models.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select><p>{models.find(m=>m.id===model).desc}</p></div>
       <button className="runBtn" disabled={busy} onClick={()=>run("/api/simulate")}>{busy?<span className="loader"></span>:<Play size={17}/>} {busy?"Running...":"Run Prediction"}</button>
     </div>
   </section>
   <section className="visualFeature"><img src="/images/f1-weekend.svg" alt="F1 weekend timeline"/><div><span className="eyebrow">BEGINNER GUIDE</span><h3>From Practice to Podium</h3><p>Understand the F1 weekend before diving into predictions.</p></div></section><section className="threeCards">
     <Feature icon={BrainCircuit} title="3 ML Models" text="Compare Linear Regression, MLP Regressor and XGBoost." onClick={()=>setPage("models")}/>
     <Feature icon={Trophy} title="Championship Engine" text="Convert predicted finishes into championship points and standings." onClick={()=>setPage("championship")}/>
     <Feature icon={BookOpen} title="F1 Beginner Guide" text="Learn qualifying, tyres, points, flags, strategy and race rules." onClick={()=>setPage("learn")}/>
   </section>
 </div>
}

function ModelLab({model,setModel,file,run,busy}){
 return <div className="content"><section className="intro"><span className="eyebrow">MODEL LAB</span><h2>Three engines. One race.</h2><p>Select a model to power the prediction pipeline. Evaluation metrics are calculated from actual test data when available.</p></section>
 <div className="modelCards">{models.map(m=><motion.div whileHover={{y:-5}} className={"modelCard "+(model===m.id?"selected":"")} key={m.id} onClick={()=>setModel(m.id)}><div className="modelIcon"><BrainCircuit/></div><span className="tag">{m.type}</span><h3>{m.name}</h3><p>{m.desc}</p><div className="metrics"><div><b>MAE</b><span>—</span></div><div><b>RMSE</b><span>—</span></div><div><b>R²</b><span>—</span></div></div><button>{model===m.id?"SELECTED":"SELECT MODEL"} <ChevronRight size={15}/></button></motion.div>)}</div>
 <div className="infoStrip"><Zap size={19}/><div><b>Leakage protection</b><p>The prediction pipeline treats the race outcome as the target and keeps inference columns aligned by name. For production training, use only pre-race information for point/standing features.</p></div></div>
 <button className="primary wide" disabled={!file||busy} onClick={()=>run("/api/simulate")}><Play size={17}/> Run {models.find(m=>m.id===model).name}</button>
 </div>
}

function Race({data}){
 const rows=data?.predictions||data?.race_predictions||[];
 const podium=rows.slice(0,3);
 const colors=["#f0c75e","#c8cbd1","#b57b4d"];
 return <div className="content"><section className="intro split"><div><span className="eyebrow">RACE CLASSIFICATION</span><h2>Predicted Grid</h2><p>Model: <b>{data?.model || "—"}</b></p></div>{rows[0]?.round&&<div className="roundBox">ROUND <b>{rows[0].round}</b></div>}</section>
 <section className="driverShowcase">
   <div className="sectionHead"><div><span className="eyebrow">DRIVER CARDS</span><h3>Front Row Intelligence</h3></div><span className="microLabel">TOP 3 / PREDICTED</span></div>
   <div className="driverCards">{podium.map((r,i)=><motion.div whileHover={{y:-6}} className="driverCard" key={r.driver}>
     <div className="driverCardTop"><span className="driverRank" style={{color:colors[i]}}>P{i+1}</span><span className="driverBadge">{i===0?'POLE WATCH':i===1?'FRONT ROW':'PODIUM'}</span></div>
     <div className="driverAvatar"><DriverHelmet index={i}/></div>
     <div className="driverName">{r.driver}</div><div className="driverTeam">{r.constructor || '—'}</div>
     <div className="driverStats"><span><b>{r["Predicted"] ?? '—'}</b><small>MODEL SCORE</small></span><span><b>{r["Predicted Points"] ?? 0}</b><small>PTS</small></span><span><b>{r.grid ?? '—'}</b><small>GRID</small></span></div>
   </motion.div>)}
   {!podium.length && <div className="empty">Run a prediction to generate driver cards.</div>}
   </div>
 </section>
 <section className="panel circuitPanel"><div className="sectionHead"><div><span className="eyebrow">CIRCUIT VIEW</span><h3>Predicted Race Flow</h3></div><span className="microLabel">SIMULATED TELEMETRY</span></div><CircuitGraphic rows={rows}/></section>
 <div className="podium">{rows.slice(0,3).map((r,i)=><div className={"pod "+["p2","p1","p3"][i]} key={r.driver}><span>P{i===1?1:i===0?2:3}</span><strong>{r.driver}</strong><small>{r.constructor}</small><b>{r["Predicted Points"]||0} PTS</b></div>)}</div>
 <Table rows={rows} cols={["Predicted Position","driver","constructor","grid","Predicted","Predicted Points"]}/></div>
}

function DriverHelmet({index}){return <div className={`helmet h${index}`}><div className="helmetVisor"></div><div className="helmetStripe"></div><span>{index+1}</span></div>}
function CircuitGraphic({rows}){
 const top=rows.slice(0,5);
 return <div className="circuitGraphic"><svg viewBox="0 0 900 300" role="img" aria-label="Stylized F1 circuit race flow"><path d="M75 215 C80 80 240 55 330 125 C420 195 500 230 595 170 C690 110 820 115 825 215 C830 270 690 275 615 230 C540 185 470 90 350 80 C230 70 160 155 190 220 C220 280 340 270 420 215" fill="none" stroke="#2a2e35" strokeWidth="24" strokeLinecap="round"/><path d="M75 215 C80 80 240 55 330 125 C420 195 500 230 595 170 C690 110 820 115 825 215 C830 270 690 275 615 230 C540 185 470 90 350 80 C230 70 160 155 190 220 C220 280 340 270 420 215" fill="none" stroke="#e10600" strokeWidth="3" strokeDasharray="7 9"/><circle cx="75" cy="215" r="7" fill="#fff"/><circle cx="825" cy="215" r="7" fill="#e10600"/>
 {top.map((r,i)=><g key={i}><circle cx={150+i*150} cy={150+(i%2)*45} r="5" fill="#fff"/><text x={160+i*150} y={146+(i%2)*45} fill="#c9cbd0" fontSize="11">P{i+1} {r.driver}</text></g>)}
 </svg><div className="circuitLegend"><span><i className="legendDot red"></i>Racing line</span><span><i className="legendDot white"></i>Predicted driver</span><span><MapPin size={12}/>Track map concept</span></div></div>
}

function Championship({data}){
 const drivers=data?.drivers||[];
 const constructors=data?.constructors||[];
 const chart=drivers.slice(0,10).map((d,i)=>({name:d.driver,points:d["Predicted Points"]}));
 const trend=drivers.slice(0,5).map((d,i)=>({race:"R"+(i+1), ...Object.fromEntries(drivers.slice(0,3).map((x,j)=>[x.driver, Math.max(0,(i+1)*(x["Predicted Points"]||0)/2)]))}));
 const leaders=drivers.slice(0,3);
 return <div className="content"><section className="intro"><span className="eyebrow">SEASON SIMULATION</span><h2>Championship Standings</h2><p>Aggregated predicted points from the uploaded race rounds.</p></section>
 <div className="champLeaderStrip">{leaders.map((d,i)=><motion.div whileHover={{scale:1.02}} className="leaderMini" key={d.driver}><span className="leaderPos">0{i+1}</span><div className="leaderAvatar"><DriverHelmet index={i}/></div><div><b>{d.driver}</b><small>{d.constructor || '—'}</small></div><strong>{d["Predicted Points"]||0}<small> PTS</small></strong></motion.div>)}{!leaders.length&&<div className="empty">Run a prediction to populate the championship.</div>}</div>
 <div className="champGrid"><div className="panel"><div className="sectionHead"><h3>Drivers</h3><Trophy size={18}/></div><Table rows={drivers} cols={["Position","driver","constructor","Predicted Points"]}/></div>
 <div className="panel"><div className="sectionHead"><h3>Points Distribution</h3></div><ResponsiveContainer width="100%" height={280}><BarChart data={chart} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#25282d"/><XAxis type="number" stroke="#777"/><YAxis type="category" dataKey="name" stroke="#aaa" width={70}/><Tooltip contentStyle={{background:"#111318",border:"1px solid #333"}}/><Bar dataKey="points" fill="#e10600" radius={[0,3,3,0]}/></BarChart></ResponsiveContainer></div></div>
 <section className="panel raceLines"><div className="sectionHead"><div><span className="eyebrow">CHAMPIONSHIP PULSE</span><h3>Predicted Points Trajectory</h3></div><Radio size={18}/></div><ResponsiveContainer width="100%" height={270}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="#25282d"/><XAxis dataKey="race" stroke="#777"/><YAxis stroke="#777"/><Tooltip contentStyle={{background:"#111318",border:"1px solid #333"}}/><Line type="monotone" dataKey={drivers[0]?.driver||"Driver 1"} stroke="#e10600" strokeWidth={3} dot={false}/><Line type="monotone" dataKey={drivers[1]?.driver||"Driver 2"} stroke="#8f96a0" strokeWidth={2} dot={false}/><Line type="monotone" dataKey={drivers[2]?.driver||"Driver 3"} stroke="#d9b65c" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></section>
 <div className="panel"><div className="sectionHead"><h3>Constructors</h3></div><Table rows={constructors} cols={["Position","constructor","Predicted Points"]}/></div>
 </div>
}

function DataExplorer({file,demo}){return <div className="content"><section className="intro"><span className="eyebrow">DATA EXPLORER</span><h2>Know your data.</h2><p>Upload a dataset to validate its structure before prediction.</p></section><div className="stats"><Stat label="FILE" value={file?.name||"Demo dataset"} sub={file?"uploaded":"bundled sample"}/><Stat label="ROWS" value={demo?.rows?.toLocaleString()||"10,779"} sub="records"/><Stat label="COLUMNS" value={demo?.columns||78} sub="features / fields"/><Stat label="MISSING" value={demo?.missing_values??"—"} sub="cells"/></div><div className="panel"><div className="sectionHead"><h3>Expected core fields</h3></div><div className="chips">{["season","round","driver","constructor","grid","podium","driver_points","driver_wins","driver_standings_pos","qualifying_time","driver_age"].map(x=><span key={x}>{x}</span>)}</div></div></div>}

function TyreLab(){
 const tyres=[{name:"SOFT",abbr:"S",life:"Low",grip:"Highest",tone:"soft"},{name:"MEDIUM",abbr:"M",life:"Medium",grip:"Balanced",tone:"medium"},{name:"HARD",abbr:"H",life:"High",grip:"Lower",tone:"hard"},{name:"INTERMEDIATE",abbr:"I",life:"Wet track",grip:"Grooved",tone:"inter"},{name:"WET",abbr:"W",life:"Heavy rain",grip:"Maximum wet",tone:"wet"}];
 const [active,setActive]=useState(0); const t=tyres[active];
 return <section className="tyreLab panel"><div className="sectionHead"><div><span className="eyebrow">TYRE VISUALIZER</span><h3>Choose a compound</h3></div><CircleDot size={18}/></div><div className="tyreGrid">{tyres.map((x,i)=><button key={x.name} className={`tyreTile ${x.tone} ${active===i?'active':''}`} onClick={()=>setActive(i)}><div className="tyre"><span>{x.abbr}</span></div><b>{x.name}</b><small>{x.grip}</small></button>)}</div><div className="tyreReadout"><div><span>COMPOUND</span><b>{t.name}</b></div><div><span>EXPECTED LIFE</span><b>{t.life}</b></div><div><span>CHARACTER</span><b>{t.grip}</b></div><div className="tyrePulse"><div style={{width:`${25+active*17}%`}}></div></div></div></section>
}

function CarDiagram(){
 const [part,setPart]=useState("frontWing");
 const info={frontWing:["Front Wing","Creates front-end downforce and influences airflow into the car."],floor:["Floor / Ground Effect","The floor generates a large share of aerodynamic downforce."],halo:["Halo","Cockpit protection structure designed to protect the driver's head."],rearWing:["Rear Wing","Balances downforce and drag at the rear of the car."],tyres:["Tyres","The only contact patch with the track; compound choice changes grip and longevity."]};
 return <div className="carDiagram"><div className="carStage"><svg viewBox="0 0 900 300" role="img" aria-label="Interactive Formula 1 car diagram"><ellipse cx="450" cy="150" rx="265" ry="55" fill="#17191e" stroke="#333842"/><path d="M180 150 L290 128 L360 116 L540 116 L610 128 L720 150 L610 172 L540 184 L360 184 L290 172 Z" fill="#e10600"/><path d="M320 127 L385 85 L515 85 L580 127" fill="#242831" stroke="#555" strokeWidth="5"/><rect x="420" y="92" width="60" height="35" rx="16" fill="#090a0c"/><path d="M150 136 L265 136 L250 164 L150 164" fill="#d9dce0"/><path d="M650 136 L750 136 L765 164 L650 164" fill="#d9dce0"/><g fill="#050608" stroke="#555"><circle cx="285" cy="125" r="28"/><circle cx="285" cy="175" r="28"/><circle cx="615" cy="125" r="28"/><circle cx="615" cy="175" r="28"/></g><path d="M425 74 Q450 45 475 74" fill="none" stroke="#e10600" strokeWidth="6"/>
 {[[180,120,'frontWing'],[360,106,'floor'],[450,57,'halo'],[720,120,'rearWing'],[285,215,'tyres']].map(([x,y,key])=><g key={key} onClick={()=>setPart(key)} className="carHotspot"><circle cx={x} cy={y} r="11" fill={part===key?'#fff':'#e10600'}/><circle cx={x} cy={y} r="4" fill="#e10600"/></g>)}
 </svg><div className="carHint"><CircleHelp size={13}/> Click a hotspot</div></div><div className="carInfo"><span className="eyebrow">CAR SYSTEM</span><h4>{info[part][0]}</h4><p>{info[part][1]}</p><div className="carInfoLine"><span>WHY IT MATTERS</span><b>Performance + race strategy</b></div></div></div>
}

function LearnF1(){
 const [tab,setTab]=useState("basics");
 const topics={
 basics:["What is F1?","Formula 1 is the world's top single-seater circuit racing championship. A season is made up of multiple Grands Prix, with drivers and constructors collecting points across races.","The two championships","The Drivers' Championship ranks individual drivers. The Constructors' Championship ranks teams using the points scored by their cars."],
 weekend:["Race Weekend","A standard weekend normally includes practice sessions, qualifying and the Grand Prix. Some events use a Sprint format, so the exact schedule can vary by season.","Qualifying","Qualifying generally uses Q1, Q2 and Q3 to determine the starting order. The fastest driver in the final qualifying segment normally starts on pole."],
 points:["Points","Under the default modern race scoring used by this app, the top ten score 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1 points.","Why points matter","A driver can finish lower in one race and still lead the championship through consistent results across a season."],
 rules:["Race Rules","Flags, safety procedures, track limits, tyre requirements, penalties and sporting procedures govern how a Grand Prix is run.","Safety Car & VSC","A Safety Car physically controls the field during certain incidents. A Virtual Safety Car imposes a controlled speed limit without bunching the field in the same way."],
 strategy:["Strategy","Teams choose tyre compounds, pit-stop timing and pace management to balance speed and track position.","Undercut / Overcut","An undercut means stopping earlier to use fresh tyres; an overcut means staying out longer. Traffic, tyre degradation and safety cars can change which approach works."],
 tyres:["Tyres","Dry-weather compounds are generally Soft, Medium and Hard; Intermediate and Wet tyres are used for sufficiently wet conditions.","Pit Stop","A pit stop can change tyres and make other permitted adjustments. Timing is a major part of race strategy."]
 };
 return <div className="content"><section className="intro"><span className="eyebrow">LEARN F1 / BEGINNER MODE</span><h2>Welcome to Formula 1.</h2><p>No prior F1 knowledge required. Learn the rules and vocabulary before exploring predictions.</p></section>
 <div className="learnTabs">{Object.keys(topics).map(k=><button className={tab===k?"active":""} onClick={()=>setTab(k)} key={k}>{topics[k][0]}</button>)}</div>
 <div className="learnHero"><img className="learnCar" src="/images/f1-car.svg" alt="Stylized Formula 1 car"/><div className="learnIcon"><Flag size={28}/></div><div><h3>{topics[tab][0]}</h3><p>{topics[tab][1]}</p></div></div>
 <div className="learnCards"><div className="panel"><h3>{topics[tab][2]}</h3><p>{topics[tab][3]}</p></div><div className="panel"><h3>Quick glossary</h3><div className="glossary">{glossary.slice(0,5).map(([a,b])=><div key={a}><b>{a}</b><span>{b}</span></div>)}</div></div></div><TyreLab/><section className="panel carSection"><div className="sectionHead"><div><span className="eyebrow">INTERACTIVE CAR</span><h3>What makes an F1 car fast?</h3></div><CarFront size={18}/></div><CarDiagram/></section>
 <div className="ruleNote"><Info size={17}/><span>F1 regulations evolve. This guide is a beginner overview; season-specific rules and scoring should be tied to the selected season in a production deployment.</span></div>
 </div>
}

const teamMembers = [
  {name:"Pranjal Joshi", role:"Model Development & Training", bio:"Builds and trains the machine-learning models that power the prediction engine.", initials:"PJ", socials:[{label:"LinkedIn", icon:Linkedin, href:"#"},{label:"GitHub", icon:Github, href:"#"}]},
  {name:"Rudransh Verma", role:"Dataset Collection", bio:"Handles dataset collection, sourcing and preparation for the F1 prediction pipeline.", initials:"RV", socials:[{label:"LinkedIn", icon:Linkedin, href:"#"},{label:"GitHub", icon:Github, href:"#"}]},
  {name:"Anjali Kumari", role:"Frontend Development", bio:"Works on the frontend experience, interface components and visual presentation.", initials:"AK", socials:[{label:"LinkedIn", icon:Linkedin, href:"#"},{label:"GitHub", icon:Github, href:"#"}]},
  {name:"Ankur Kumar Rai", role:"Frontend & Backend Development", bio:"Works across the frontend and backend, connecting the prediction workflow into the full-stack application.", initials:"AR", socials:[{label:"LinkedIn", icon:Linkedin, href:"#"},{label:"GitHub", icon:Github, href:"#"}]},
];

function Team(){
 return <div className="content">
   <section className="intro teamIntro"><span className="eyebrow">APEX GRID / THE TEAM</span><h2>Built by four minds.<br/><em>Driven by data.</em></h2><p>Meet the people behind APEX GRID — from collecting the data and training the models to building the interface and connecting the full-stack experience.</p></section>
   <section className="teamHero panel"><div><span className="eyebrow">PROJECT CREW</span><h3>From dataset to prediction.</h3><p>Every part of APEX GRID has a role: reliable data, trained models, an intuitive frontend and a backend that turns the pipeline into a usable product.</p></div><div className="teamHeroMark"><Users size={42}/><span>04<br/>MEMBERS</span></div></section>
   <div className="teamGrid">{teamMembers.map((member,i)=><motion.article className="teamCard" key={member.name} whileHover={{y:-6}}>
     <div className="teamCardTop"><span className="teamIndex">0{i+1}</span><span className="teamRole">{member.role}</span></div>
     <div className="teamPhotoPlaceholder"><div className="placeholderInitials">{member.initials}</div><span>PHOTO PLACEHOLDER</span></div>
     <div className="teamInfo"><h3>{member.name}</h3><p>{member.bio}</p></div>
     <div className="socialRow">{member.socials.map(({label,icon:Icon,href})=><a key={label} href={href} aria-label={`${member.name} ${label}`} onClick={e=>{if(href==="#")e.preventDefault()}}><Icon size={17}/><span>{label}</span><ExternalLink size={11}/></a>)}</div>
   </motion.article>)}</div>
   <section className="panel teamFooter"><div><span className="eyebrow">ACKNOWLEDGEMENT</span><h3>One project. Multiple disciplines.</h3><p>Model engineering, data preparation, frontend design and backend development come together to create the APEX GRID experience.</p></div><div className="teamStack"><span>DATA</span><span>ML</span><span>FRONTEND</span><span>BACKEND</span></div></section>
   <div className="teamNote"><Info size={16}/><span>Social profile buttons are ready as placeholders. Replace the <b>#</b> links in <code>teamMembers</code> inside <code>main.jsx</code> with the team members' actual profile URLs.</span></div>
 </div>
}

function Table({rows=[],cols=[]}){
 return <div className="tableWrap"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.length?rows.map((row,i)=><tr key={row.driver||row.constructor||i}>{cols.map(c=><td key={c}>{row[c] ?? "—"}</td>)}</tr>):<tr><td colSpan={Math.max(cols.length,1)}><div className="empty">No prediction data available yet.</div></td></tr>}</tbody></table></div>
}

function Stat({label,value,sub}){return <div className="stat"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Feature({icon:Icon,title,text,onClick}){return <button className="feature" onClick={onClick}><Icon/><h3>{title}</h3><p>{text}</p><ChevronRight/></button>}

class AppErrorBoundary extends React.Component {
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return {error}}
 componentDidCatch(error,info){console.error("APEX GRID frontend error",error,info)}
 render(){
  if(this.state.error) return <div className="fatalError"><div><div className="eyebrow">APEX GRID / FRONTEND ERROR</div><h1>The interface could not load.</h1><p>{this.state.error?.message || "Unknown frontend error"}</p><button onClick={()=>window.location.reload()}>Reload App</button><small>Open the browser console (F12) if the problem continues.</small></div></div>;
  return this.props.children;
 }
}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App/></AppErrorBoundary>);
