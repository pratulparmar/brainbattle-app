/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { signInWithGoogle, signOutUser, onAuthChange, checkRedirectResult, getUserStats, getUserUsage, verifyAccess, incrementUsage, saveQuizResult, getLeaderboard, ensureUserDoc } from "./firebase_utils";
import { QB, getRandom, getChaptersForSubject, QB_STATS } from "./QB.js";

/* ══════════════════════════════════════
   SUBJECT META
══════════════════════════════════════ */
const SUBJECT_META = {
  Physics:   { icon:"⚛️", color:"#FF6B6B", bg:"#FFF0F0", exam:"NEET" },
  Chemistry: { icon:"🧪", color:"#FFB347", bg:"#FFF8EE", exam:"NEET" },
  Biology:   { icon:"🌿", color:"#51CF66", bg:"#F0FFF3", exam:"NEET" },
};

const OPPONENTS = [
  { name:"Aman K.",   init:"AK", emoji:"🦅", score:8950, rank:1, streak:21, color:"#FF6B35", winRate:68, avgScore:94, tag:"Physics Phantom",  topics:["Rotational Motion","MOI"] },
  { name:"Priya S.",  init:"PS", emoji:"🔮", score:8720, rank:2, streak:18, color:"#E91E8C", winRate:71, avgScore:92, tag:"Formula Freak",    topics:["Angular Momentum","Thermodynamics"] },
  { name:"Rohan M.",  init:"RM", emoji:"🧙", score:8100, rank:3, streak:15, color:"#7C3AED", winRate:58, avgScore:89, tag:"Math Magician",    topics:["Waves & SHM","Optics"] },
  { name:"Sneha T.",  init:"ST", emoji:"🌿", score:7680, rank:4, streak:22, color:"#22C55E", winRate:55, avgScore:87, tag:"Bio Beast",        topics:["Laws of Motion","Modern Physics"] },
  { name:"David L.",  init:"DL", emoji:"⚡", score:7200, rank:5, streak:18, color:"#00B4D8", winRate:50, avgScore:85, tag:"Speed Demon",      topics:["Electrostatics","Rolling Motion"] },
];

const LB_DATA = [
  { name:"Aman K.",  init:"AK", emoji:"🦅", score:8950, rank:1, prev:1, streak:21, color:"#FF6B35" },
  { name:"Priya S.", init:"PS", emoji:"🔮", score:8720, rank:2, prev:3, streak:18, color:"#E91E8C" },
  { name:"Rohan M.", init:"RM", emoji:"🧙", score:8100, rank:3, prev:2, streak:15, color:"#7C3AED" },
  { name:"Sneha T.", init:"ST", emoji:"🌿", score:7680, rank:4, prev:4, streak:22, color:"#22C55E" },
  { name:"David L.", init:"DL", emoji:"⚡", score:7200, rank:5, prev:5, streak:18, color:"#00B4D8" },
  { name:"Sophia M.",init:"SM", emoji:"🎭", score:6890, rank:6, prev:8, streak:15, color:"#7C3AED" },
  { name:"You",      init:"PP", emoji:"🎯", score:2450, rank:7, prev:9, streak:12, color:"#E91E8C" },
  { name:"James B.", init:"JB", emoji:"🎸", score:6100, rank:8, prev:7, streak:14, color:"#FF6B35" },
];

const ACHIEVEMENTS = [
  { icon:"🏆", label:"First Victory",  desc:"Complete your first quiz",           color:"#FF9500", bg:"#FFF3E0", earned:true  },
  { icon:"🎯", label:"Sharp Shooter",  desc:"10 correct in a row",                color:"#22C55E", bg:"#F0FDF4", earned:true  },
  { icon:"⚡", label:"Speed Demon",    desc:"50 questions under 10 min",          color:"#00B4D8", bg:"#E0F7FF", earned:true  },
  { icon:"🧠", label:"Genius",         desc:"Score 90%+ on a quiz",               color:"#7C3AED", bg:"#EDE9FE", earned:false },
  { icon:"⭐", label:"Rising Star",    desc:"Reach top 10 leaderboard",           color:"#E91E8C", bg:"#FFE4F3", earned:false },
  { icon:"👑", label:"Legendary",      desc:"30-day streak",                      color:"#FF6B35", bg:"#FFF0E8", earned:false },
];

const INITIAL_CHATS = [
  {
    id:1, name:"Aman K.", init:"AK", emoji:"🦅", color:"#FF6B35", online:true,
    messages:[
      { from:"them", text:"Hey! Did you attempt the Rotational Motion mock today?", time:"10:30 AM" },
      { from:"me",   text:"Yes! Got 87%. The precession question was tricky.", time:"10:32 AM" },
      { from:"them", text:"Same here. I keep confusing the direction of torque in gyroscope problems.", time:"10:33 AM" },
      { from:"me",   text:"I think the key is remembering τ = dL/dt. If we think vectorially it becomes clearer.", time:"10:35 AM" },
      { from:"them", text:"Oh right! And for MOI I always forget the parallel axis theorem for complex shapes.", time:"10:36 AM" },
      { from:"me",   text:"Yeah the formula is I = I_cm + Md². I practice by deriving it fresh each time.", time:"10:38 AM" },
      { from:"them", text:"Smart! Want to do a duel on Rolling Motion tonight? I'm weak on that chapter.", time:"10:40 AM" },
    ]
  },
  {
    id:2, name:"Priya S.", init:"PS", emoji:"🔮", color:"#E91E8C", online:false,
    messages:[
      { from:"them", text:"How's your prep for Angular Momentum going?", time:"Yesterday" },
      { from:"me",   text:"Decent. The conservation problems are fine but I struggle with the direction.", time:"Yesterday" },
      { from:"them", text:"Try using the right hand rule consistently. It helped me a lot.", time:"Yesterday" },
      { from:"me",   text:"Thanks! Also thermodynamics is killing me. Carnot efficiency always confuses me.", time:"Yesterday" },
      { from:"them", text:"Carnot = 1 - T_cold/T_hot. Just memorize it and apply. Don't overthink.", time:"Yesterday" },
    ]
  },
  {
    id:3, name:"Rohan M.", init:"RM", emoji:"🧙", color:"#7C3AED", online:true,
    messages:[
      { from:"them", text:"Did you see the new JEE Advanced pattern? They're asking more conceptual questions.", time:"2d ago" },
      { from:"me",   text:"Yeah! Especially in Waves and SHM. Phase difference problems are hard.", time:"2d ago" },
      { from:"them", text:"I got completely wrong on the coupled oscillations question last mock.", time:"2d ago" },
    ]
  },
];

const RECENT_ACTIVITY = [];

/* ══════════════════════════════════════
   CSS
══════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  :root {
    --bg:#FFF9F0; --card:#FFFFFF; --border:#F0EBE0;
    --tx:#1A1A2E; --sub:#6B7280; --sub2:#9CA3AF;
    --font:'Outfit',sans-serif;
    --orange:#FF6B6B; --pink:#E91E8C; --cyan:#667EEA;
    --blue:#667EEA;
    --green:#51CF66; --purple:#764BA2; --red:#EF4444; --amber:#FFB347;
    --grad:linear-gradient(135deg,#667EEA,#764BA2);
  }
  html,body{ background:var(--bg); color:var(--tx); font-family:var(--font); min-height:100vh; overflow-x:hidden; }
  button{ font-family:var(--font); cursor:pointer; }
  ::-webkit-scrollbar{ width:0; }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn  { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes popIn    { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  @keyframes xpFloat  { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-70px) scale(1.3)} }
  @keyframes confettiD{ 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(130px) rotate(720deg);opacity:0} }
  @keyframes shake    { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 75%{transform:translateX(7px)} }
  @keyframes timerW   { 0%,100%{color:var(--red)} 50%{color:var(--amber)} }
  @keyframes dotP     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
  @keyframes cardPop  { from{transform:scale(.96) translateY(6px);opacity:.6} to{transform:scale(1) translateY(0);opacity:1} }
  @keyframes spinOnce { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes gradPulse{ 0%,100%{box-shadow:0 4px 20px rgba(233,30,140,.25)} 50%{box-shadow:0 4px 32px rgba(255,107,53,.4)} }
  @keyframes race     { from{width:var(--from)} to{width:var(--to)} }
  @keyframes slideUp  { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes slideInR { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideInL { from{transform:translateX(-40px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes msgIn    { from{transform:translateY(10px) scale(.97);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
  @keyframes typing   { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
  @keyframes shine    { 0%{left:-100%} 100%{left:200%} }
`;

/* ══════════════════════════════════════
   BLOB BG
══════════════════════════════════════ */
function BlobBg() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",top:-60,right:-60,width:220,height:220,borderRadius:"50%",background:"rgba(255,183,77,0.12)"}}/>
      <div style={{position:"absolute",top:200,left:-80,width:180,height:180,borderRadius:"50%",background:"rgba(81,207,102,0.1)"}}/>
      <div style={{position:"absolute",bottom:200,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(255,107,107,0.08)"}}/>
    </div>
  );
}

function Card({children,style,onClick}){
  return <div onClick={onClick} style={{background:"var(--card)",borderRadius:20,boxShadow:"0 2px 16px rgba(0,0,0,.07)",overflow:"hidden",cursor:onClick?"pointer":"default",...(style||{})}}>{children}</div>;
}
function GradBtn({children,onClick,style,outlined,small}){
  return <button onClick={onClick} style={{padding:small?"9px 18px":"13px 28px",borderRadius:12,fontWeight:700,fontSize:small?13:15,background:outlined?"white":"var(--grad)",color:outlined?"var(--orange)":"#fff",border:outlined?"1.5px solid var(--orange)":"none",boxShadow:outlined?"none":"0 4px 20px rgba(233,30,140,.3)",transition:"transform .15s",...(style||{})}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>{children}</button>;
}
function Pill({children,style}){
  return <span style={{display:"inline-block",padding:"5px 14px",borderRadius:20,background:"var(--grad)",color:"#fff",fontWeight:700,fontSize:12,...(style||{})}}>{children}</span>;
}
function XPToast({pts,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,1100);return()=>clearTimeout(t);},[]);
  return <div style={{position:"fixed",top:"32%",left:"50%",transform:"translateX(-50%)",fontFamily:"var(--font)",fontSize:22,fontWeight:800,color:"var(--green)",animation:"xpFloat 1.1s ease forwards",zIndex:9999,pointerEvents:"none",background:"#fff",padding:"8px 24px",borderRadius:30,boxShadow:"0 4px 24px rgba(34,197,94,.3)",whiteSpace:"nowrap"}}>+{pts} pts 🎉</div>;
}
function Confetti({show}){
  if(!show) return null;
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9998,overflow:"hidden"}}>{Array.from({length:22}).map((_,i)=><div key={i} style={{position:"absolute",left:(4+Math.random()*92)+"%",top:(Math.random()*25)+"%",width:8,height:8,borderRadius:Math.random()>.5?"50%":3,background:["#FF6B35","#E91E8C","#00B4D8","#22C55E","#7C3AED","#F59E0B"][i%6],animation:`confettiD ${.5+Math.random()*.6}s ${Math.random()*.4}s ease forwards`}}/>)}</div>;
}

/* ══════════════════════════════════════
   BOTTOM NAV — 5 tabs
══════════════════════════════════════ */
function BottomNav({tab,setTab,onQuiz}){
  const items=[{id:"home",icon:"⊞",label:"Home"},{id:"dashboard",icon:"📊",label:"Progress"},{id:"ranks",icon:"🏆",label:"Ranks"},{id:"profile",icon:"◉",label:"Profile"}];
  return(
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"min(430px,100vw)",zIndex:200,background:"rgba(255,249,240,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(0,0,0,0.06)",padding:"8px 20px 24px",display:"flex",alignItems:"center",justifyContent:"space-around",boxShadow:"0 -4px 20px rgba(0,0,0,0.06)"}}>
      {items.map(item=>(
        <button key={item.id} onClick={()=>setTab(item.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 0",background:"transparent",border:"none",color:tab===item.id?"#667EEA":"#9CA3AF",transition:"all .2s",cursor:"pointer"}}>
          <span style={{fontSize:20}}>{item.icon}</span>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:0.5}}>{item.label}</span>
          {tab===item.id&&<div style={{width:4,height:4,borderRadius:"50%",background:"#667EEA",boxShadow:"0 0 8px rgba(102,126,234,0.6)",marginTop:1}}/>}
        </button>
      ))}
    </div>
  );
}
function HomeScreen({onQuiz,onMock,onBrowse,onDoubt,score,rank,streak,accuracy}){
  const neetDate=new Date("2026-05-04T00:00:00"),today=new Date();
  const daysLeft=Math.max(0,Math.ceil((neetDate-today)/(1000*60*60*24)));
  const todayXP=score%500,xpGoal=500,xpPct=Math.round(todayXP/xpGoal*100);
  const subjectData=[
    {subj:"Physics",   icon:"⚛️",color:"#FF6B6B",bg:"#FFF0F0",ch:getChaptersForSubject("Physics").length},
    {subj:"Chemistry", icon:"🧪",color:"#FFB347",bg:"#FFF8EE",ch:getChaptersForSubject("Chemistry").length},
    {subj:"Biology",   icon:"🌿",color:"#51CF66",bg:"#F0FFF3",ch:getChaptersForSubject("Biology").length},
  ];
  return(
    <div style={{minHeight:"100vh",paddingBottom:100,background:"#FFF9F0",position:"relative",fontFamily:"var(--font)"}}>
      <style>{`@keyframes homeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes homeFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{position:"relative",zIndex:1}}>
        <div style={{padding:"52px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <div style={{fontSize:13,color:"#9CA3AF",fontWeight:600,marginBottom:2}}>Good day! 👋</div>
            <div style={{fontSize:28,fontWeight:900,color:"#1A1A2E",letterSpacing:-0.5,lineHeight:1}}>BrainBattle</div>
            <div style={{fontSize:12,color:"#9CA3AF",marginTop:3,fontWeight:600}}>NEET 2026 Ready 🎯</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Streak</div>
            <div style={{fontSize:28,fontWeight:900,color:"#FF6B6B"}}>🔥{streak}</div>
          </div>
        </div>
        <div style={{margin:"0 20px 16px",borderRadius:28,overflow:"hidden",position:"relative",background:"linear-gradient(135deg,#667EEA,#764BA2)",boxShadow:"0 12px 40px rgba(102,126,234,0.35)",animation:"homeFade .4s ease both"}}>
          <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
          <div style={{position:"absolute",bottom:-20,left:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
          <div style={{padding:"22px 22px 18px",position:"relative"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>🎯 NEET 2026 COUNTDOWN</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,marginBottom:12}}>
              <div style={{fontSize:64,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:-3}}>{daysLeft}</div>
              <div style={{fontSize:16,color:"rgba(255,255,255,0.7)",fontWeight:600,paddingBottom:8}}>days left</div>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,0.2)",borderRadius:2,marginBottom:16}}>
              <div style={{height:"100%",width:`${Math.max(4,100-(daysLeft/365*100))}%`,background:"rgba(255,255,255,0.9)",borderRadius:2}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={onQuiz} style={{flex:1,padding:"13px",background:"#fff",border:"none",borderRadius:16,color:"#667EEA",fontWeight:800,fontSize:14,boxShadow:"0 4px 16px rgba(0,0,0,0.15)",cursor:"pointer"}}>⚡ Quick Quiz</button>
              <button onClick={onMock} style={{flex:1,padding:"13px",background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.4)",borderRadius:16,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer"}}>📋 Mock Test</button>
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,margin:"0 20px 16px",animation:"homeFade .4s .05s ease both"}}>
          {[{icon:"⚡",label:"Score",val:score.toLocaleString(),color:"#667EEA",bg:"#EEF2FF"},{icon:"🏆",label:"Rank",val:`#${rank}`,color:"#FF6B6B",bg:"#FFF0F0"},{icon:"🎯",label:"Accuracy",val:`${accuracy}%`,color:"#51CF66",bg:"#F0FFF3"}].map((s,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:20,padding:"14px 10px",textAlign:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.06)",border:`1px solid ${s.bg}`}}>
              <div style={{width:36,height:36,borderRadius:12,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,margin:"0 auto 8px"}}>{s.icon}</div>
              <div style={{fontSize:17,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:10,color:"#9CA3AF",fontWeight:700,marginTop:2,letterSpacing:0.5,textTransform:"uppercase"}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{margin:"0 20px 16px",background:"#fff",borderRadius:24,padding:"16px 18px",boxShadow:"0 4px 16px rgba(0,0,0,0.06)",animation:"homeFade .4s .1s ease both"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#1A1A2E"}}>Today's Progress</div>
              <div style={{fontSize:11,color:"#9CA3AF",fontWeight:600,marginTop:1}}>{xpGoal-todayXP} XP to daily goal</div>
            </div>
            <div style={{fontSize:22,fontWeight:900,color:"#667EEA"}}>{todayXP}<span style={{fontSize:13,color:"#9CA3AF",fontWeight:600}}>/{xpGoal}</span></div>
          </div>
          <div style={{height:8,background:"#F3F4F6",borderRadius:4}}>
            <div style={{height:"100%",width:`${xpPct}%`,borderRadius:4,background:"linear-gradient(90deg,#667EEA,#764BA2)",boxShadow:"0 2px 8px rgba(102,126,234,0.4)",transition:"width .8s ease"}}/>
          </div>
        </div>
        <div onClick={onDoubt} style={{margin:"0 20px 16px",borderRadius:24,padding:"16px 18px",cursor:"pointer",background:"linear-gradient(135deg,#FFF9C4,#FFE082)",boxShadow:"0 4px 0 #FFD54F,0 8px 20px rgba(255,193,7,0.2)",display:"flex",alignItems:"center",gap:14,animation:"homeFade .4s .15s ease both"}}>
          <div style={{fontSize:40,animation:"homeFloat 3s ease infinite",flexShrink:0}}>🧠</div>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"#5D4037"}}>Ask Dr. Neuron</div>
            <div style={{fontSize:12,color:"#8D6E63",fontWeight:600,marginTop:2}}>NCERT-grounded doubt solving</div>
          </div>
          <div style={{marginLeft:"auto",fontSize:20,color:"#8D6E63"}}>›</div>
        </div>
        <div style={{padding:"0 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:16,fontWeight:900,color:"#1A1A2E"}}>Practice by Subject</div>
            <div style={{fontSize:12,color:"#667EEA",fontWeight:700}}>9,170 Qs</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {subjectData.map((s,i)=>(
              <button key={i} onClick={()=>onBrowse(s.subj)} style={{width:"100%",background:"#fff",border:`1.5px solid ${s.bg}`,borderRadius:22,padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,0.05)",animation:`homeFade .4s ${.2+i*.08}s ease both`}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:52,height:52,borderRadius:18,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:`0 4px 0 ${s.color}33`}}>{s.icon}</div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:16,fontWeight:800,color:"#1A1A2E"}}>{s.subj}</div>
                    <div style={{fontSize:12,color:"#9CA3AF",marginTop:2,fontWeight:600}}>{s.ch} chapters</div>
                  </div>
                </div>
                <div style={{width:36,height:36,borderRadius:12,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",color:s.color,fontSize:18,fontWeight:700}}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   DUEL SCREEN
══════════════════════════════════════ */
function DuelScreen({kb}){
  const pool=kb&&kb.length>0?kb:QB;
  const [phase,setPhase]=useState("lobby"); // lobby|countdown|battle|result
  const [opponent,setOpponent]=useState(null);
  const [countdown,setCountdown]=useState(3);
  const [questions,setQuestions]=useState([]);
  const [qIdx,setQIdx]=useState(0);
  const [myAnswers,setMyAnswers]=useState({});
  const [myPts,setMyPts]=useState(0);
  const [opPts,setOpPts]=useState(0);
  const [feedback,setFeedback]=useState(null);
  const [selected,setSelected]=useState(null);
  const [cardKey,setCardKey]=useState(0);
  const [timeLeft,setTimeLeft]=useState(15);
  const [xpToast,setXpToast]=useState(null);
  const [confetti,setConfetti]=useState(false);
  const [opProgress,setOpProgress]=useState(0);

  const startDuel=(opp)=>{
    setOpponent(opp);
    setPhase("countdown");
    setCountdown(3);
  };

  // Countdown timer
  useEffect(()=>{
    if(phase!=="countdown") return;
    if(countdown<=0){ setPhase("battle"); setQuestions([...pool].sort(()=>Math.random()-0.5).slice(0,5)); setQIdx(0); setMyPts(0); setOpPts(0); setMyAnswers({}); setTimeLeft(15); return; }
    const t=setTimeout(()=>setCountdown(c=>c-1),1000);
    return()=>clearTimeout(t);
  },[phase,countdown]);

  // Per-question timer
  useEffect(()=>{
    if(phase!=="battle") return;
    if(timeLeft<=0&&!feedback){ handleSelect(-1); return; }
    const t=setTimeout(()=>setTimeLeft(v=>v-1),1000);
    return()=>clearTimeout(t);
  },[phase,timeLeft,feedback]);

  // Opponent "thinking" progress
  useEffect(()=>{
    if(phase!=="battle"||feedback) return;
    const delay=Math.random()*8000+3000;
    const t=setTimeout(()=>{
      const isRight=Math.random()<(opponent?.winRate||50)/100;
      if(isRight) setOpPts(p=>p+(questions[qIdx]?.pts||100));
      setOpProgress(p=>p+20);
    },delay);
    return()=>clearTimeout(t);
  },[phase,qIdx,feedback,opponent,questions]);

  const handleSelect=(i)=>{
    if(feedback) return;

    if(!q) return;
    const isCorrect=i>=0&&i===q.ans;
    setSelected(i);
    setFeedback(isCorrect?"correct":"wrong");
    const newAns={...myAnswers,[qIdx]:{selected:i,correct:isCorrect,pts:q.pts}};
    setMyAnswers(newAns);
    if(isCorrect){setMyPts(p=>p+q.pts);setXpToast(q.pts);setConfetti(true);setTimeout(()=>setConfetti(false),800);}
    setTimeout(()=>{
      if(qIdx+1>=questions.length){
        // Battle done
        const finalMy=Object.values(newAns).reduce((s,a)=>s+(a.correct?a.pts:0),0);
        const finalOp=Math.round((opponent.avgScore/100)*questions.reduce((s,q)=>s+q.pts,0)*0.9+Math.random()*100);
        setMyPts(finalMy); setOpPts(finalOp);
        setPhase("result");
        return;
      }
      setQIdx(x=>x+1); setSelected(null); setFeedback(null); setCardKey(k=>k+1); setTimeLeft(15); setOpProgress(p=>p+20);
    },1800);
  };

  const safeQs = Array.isArray(questions) ? questions.filter(q => q && q.q && q.q.length > 5 && Array.isArray(q.opts) && q.opts.length >= 2) : [];
  const q = safeQs[qIdx];
  const labels=["A","B","C","D"];

  if(phase==="lobby") return(
    <div style={{minHeight:"100vh",paddingBottom:110,position:"relative"}}>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1,padding:"52px 18px 0"}}>
        {/* Header */}
        <div style={{background:"var(--grad)",borderRadius:20,padding:"22px 20px",marginBottom:24,textAlign:"center",boxShadow:"0 6px 28px rgba(233,30,140,.3)"}}>
          <div style={{fontSize:36,marginBottom:4}}>⚔️</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff"}}>Duel Arena</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.8)"}}>Challenge a rival. Win, rank up, earn points!</div>
        </div>
        <div style={{fontSize:18,fontWeight:800,marginBottom:14}}>Choose your opponent</div>
        {OPPONENTS.map((opp,i)=>(
          <Card key={i} style={{padding:"14px 16px",marginBottom:12,animation:`fadeUp .3s ${i*.06}s ease both`}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{position:"relative"}}>
                <div style={{width:50,height:50,borderRadius:"50%",background:opp.color+"22",border:"2px solid "+opp.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{opp.emoji}</div>
                <div style={{position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:"50%",background:"#22C55E",border:"2px solid #fff"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{fontSize:15,fontWeight:700}}>{opp.name}</div>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:opp.color+"18",color:opp.color,fontWeight:700}}>Rank #{opp.rank}</span>
                </div>
                <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{opp.tag} · {opp.streak}🔥 streak · {opp.winRate}% win rate</div>
                <div style={{display:"flex",gap:4,marginTop:4}}>
                  {opp.topics.slice(0,2).map(t=><span key={t} style={{fontSize:9,padding:"2px 6px",borderRadius:8,background:"#F0F0F0",color:"var(--sub)",fontWeight:600}}>{t}</span>)}
                </div>
              </div>
              <button onClick={()=>startDuel(opp)} style={{padding:"8px 14px",background:"var(--grad)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:12,flexShrink:0,boxShadow:"0 3px 12px rgba(233,30,140,.3)"}}>Duel ⚔️</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  if(phase==="countdown") return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--bg)",position:"relative"}}>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1,textAlign:"center",padding:24}}>
        <div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:40}}>
          <div style={{textAlign:"center"}}>
            <div style={{width:70,height:70,borderRadius:"50%",background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 8px",boxShadow:"0 4px 20px rgba(233,30,140,.3)"}}>🎯</div>
            <div style={{fontWeight:700,fontSize:14}}>You</div>
          </div>
          <div style={{display:"flex",alignItems:"center",fontSize:28,fontWeight:900,color:"var(--orange)"}}>VS</div>
          <div style={{textAlign:"center"}}>
            <div style={{width:70,height:70,borderRadius:"50%",background:opponent.color+"22",border:"3px solid "+opponent.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 8px"}}>{opponent.emoji}</div>
            <div style={{fontWeight:700,fontSize:14}}>{opponent.name}</div>
          </div>
        </div>
        <div style={{fontSize:100,fontWeight:900,lineHeight:1,color:"var(--orange)",animation:"popIn .4s ease"}}>{countdown===0?"GO!":countdown}</div>
        <div style={{fontSize:15,color:"var(--sub)",marginTop:16,fontWeight:500}}>5 questions · 15 seconds each</div>
      </div>
    </div>
  );

  if(phase==="battle"&&q) return(
    <div style={{minHeight:"100vh",position:"relative"}}>
      {xpToast&&<XPToast pts={xpToast} onDone={()=>setXpToast(null)}/>}
      <Confetti show={confetti}/>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1,padding:"52px 18px 24px"}}>
        {/* VS score bar */}
        <Card style={{padding:"12px 16px",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--sub)",fontWeight:600}}>YOU</div>
              <div style={{fontSize:22,fontWeight:900,color:"var(--orange)"}}>{myPts}</div>
            </div>
            <div style={{flex:1,margin:"0 12px"}}>
              <div style={{height:8,background:"#F0F0F0",borderRadius:4,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",background:"var(--grad)",borderRadius:4,transition:"width .5s ease",width:Math.min(100,(myPts/750)*100)+"%"}}/>
              </div>
              <div style={{height:8,background:"#F0F0F0",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",background:opponent.color,borderRadius:4,transition:"width .5s ease",width:Math.min(100,opProgress)+"%"}}/>
              </div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--sub)",fontWeight:600}}>{opponent.name.split(" ")[0].toUpperCase()}</div>
              <div style={{fontSize:22,fontWeight:900,color:opponent.color}}>{opPts}</div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:3}}>
              {questions.map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:myAnswers[i]?myAnswers[i].correct?"var(--green)":"var(--red)":i===qIdx?"var(--orange)":"#E0E0E0"}}/>)}
            </div>
            <div style={{fontWeight:700,fontSize:13,color:timeLeft<5?"var(--red)":"var(--sub)",animation:timeLeft<5?"timerW .6s ease infinite":"none"}}>⏱ {timeLeft}s</div>
          </div>
        </Card>

        <div key={cardKey} style={{animation:"cardPop .3s ease"}}>
          <Card style={{padding:"20px 18px",marginBottom:12,border:"2px solid "+(feedback==="correct"?"var(--green)":feedback==="wrong"?"var(--red)":"transparent"),transition:"border-color .2s",animation:feedback==="wrong"?"shake .4s ease":"none"}}>
            <div style={{display:"inline-block",padding:"4px 14px",borderRadius:20,background:"var(--cyan)",color:"#fff",fontWeight:700,fontSize:11,marginBottom:12}}>{q.tag}</div>
            <div style={{fontSize:17,fontWeight:700,lineHeight:1.5}}>{q.q}</div>
          </Card>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:12}}>
            {q.opts.map((opt,i)=>{
              const isC=i===q.ans,isWS=i===selected&&!isC;
              let bg="#fff",border="#EBEBEB",lBg="#F5F5F5",lC="var(--sub)",tC="var(--tx)";
              if(feedback){if(isC){bg="#F0FDF4";border="var(--green)";lBg="var(--green)";lC="#fff";tC="var(--green)";}if(isWS){bg="#FFF5F5";border="var(--red)";lBg="var(--red)";lC="#fff";tC="var(--red)";}}
              else if(selected===i){bg="#FFF0E8";border="var(--orange)";lBg="var(--orange)";lC="#fff";}
              return(
                <button key={i} onClick={()=>handleSelect(i)} disabled={!!feedback} style={{width:"100%",padding:"12px 14px",background:bg,border:"1.5px solid "+border,borderRadius:14,display:"flex",alignItems:"center",gap:11,textAlign:"left",transition:"all .2s",boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                  <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:lBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:lC}}>{feedback&&isC?"✓":feedback&&isWS?"✗":labels[i]}</div>
                  <span style={{fontSize:14,color:tC,lineHeight:1.4,fontWeight:500}}>{opt}</span>
                </button>
              );
            })}
          </div>
          {feedback&&(
            <Card style={{padding:"12px 14px",background:feedback==="correct"?"#F0FDF4":"#FFF9F0",border:"1.5px solid "+(feedback==="correct"?"var(--green)":"var(--amber)"),animation:"fadeUp .3s ease"}}>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{fontSize:22,flexShrink:0}}>{feedback==="correct"?"🎯":"💡"}</span>
                <div><div style={{fontSize:11,fontWeight:700,color:feedback==="correct"?"var(--green)":"var(--amber)",marginBottom:3}}>{feedback==="correct"?"CORRECT! +"+q.pts+" pts":"EXPLANATION"}</div><div style={{fontSize:12,color:"var(--tx)",lineHeight:1.5}}>{q.exp}</div></div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  if(phase==="result"){
    const won=myPts>opPts;
    const diff=Math.abs(myPts-opPts);
    return(
      <div style={{minHeight:"100vh",paddingBottom:110,position:"relative"}}>
        <Confetti show={won}/>
        <BlobBg/>
        <div style={{position:"relative",zIndex:1,padding:"52px 18px 0"}}>
          {/* Result banner */}
          <Card style={{padding:"28px 20px",marginBottom:16,textAlign:"center",background:won?"linear-gradient(135deg,#F0FDF4,#DCFCE7)":"linear-gradient(135deg,#FFF5F5,#FEE2E2)",border:"2px solid "+(won?"var(--green)":"var(--red)")}}>
            <div style={{fontSize:56,marginBottom:8}}>{won?"🏆":"😤"}</div>
            <div style={{fontSize:26,fontWeight:900,color:won?"var(--green)":"var(--red)"}}>{won?"Victory!":"Defeated"}</div>
            <div style={{fontSize:14,color:"var(--sub)",marginTop:4}}>{won?`You won by ${diff} points!`:`Lost by ${diff} points. Train harder!`}</div>
          </Card>
          {/* Score comparison */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {[{label:"You",pts:myPts,color:"var(--orange)",emoji:"🎯"},{label:opponent.name,pts:opPts,color:opponent.color,emoji:opponent.emoji}].map((p,i)=>(
              <Card key={i} style={{padding:"16px",textAlign:"center",border:"2px solid "+(i===0&&won||i===1&&!won?"var(--green)":"var(--border)")}}>
                <div style={{fontSize:28,marginBottom:4}}>{p.emoji}</div>
                <div style={{fontSize:11,color:"var(--sub)",fontWeight:600,marginBottom:4}}>{p.label}</div>
                <div style={{fontSize:28,fontWeight:900,color:p.color}}>{p.pts}</div>
                <div style={{fontSize:11,color:"var(--sub)"}}>points</div>
                {((i===0&&won)||(i===1&&!won))&&<div style={{marginTop:6,fontSize:11,fontWeight:700,color:"var(--green)"}}>👑 Winner</div>}
              </Card>
            ))}
          </div>
          {won&&<Card style={{padding:"14px 16px",marginBottom:16,background:"linear-gradient(135deg,#FFF3E0,#FFE4F3)",border:"1.5px solid #FFD0B0",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:"var(--orange)"}}>+{won?150:50} pts · {won?"↑ Rank up! ":"↓ Keep training "}{won?"🚀":"💪"}</div>
          </Card>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <GradBtn onClick={()=>{setPhase("lobby");setOpponent(null);}} style={{width:"100%"}}>⚔️ Challenge Again</GradBtn>
            <GradBtn onClick={()=>{setPhase("lobby");setOpponent(null);}} outlined style={{width:"100%"}}>🏠 Back to Lobby</GradBtn>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

/* ══════════════════════════════════════
   MESSAGES SCREEN
══════════════════════════════════════ */
function MessagesScreen(){
  const [chats,setChats]=useState(INITIAL_CHATS);
  const [activeChat,setActiveChat]=useState(null);
  const [input,setInput]=useState("");
  const [analyzing,setAnalyzing]=useState(false);
  const [analysis,setAnalysis]=useState(null);
  const [showAnalysis,setShowAnalysis]=useState(false);
  const bottomRef=useRef(null);

  const chat=chats.find(c=>c.id===activeChat);

  useEffect(()=>{
    if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"});
  },[activeChat,chat?.messages?.length]);

  const sendMessage=()=>{
    if(!input.trim()) return;
    const msg={from:"me",text:input.trim(),time:"now"};
    setChats(cs=>cs.map(c=>c.id===activeChat?{...c,messages:[...c.messages,msg]}:c));
    setInput("");
  };

  const analyzeChat=async()=>{
    if(!chat) return;
    setAnalyzing(true);
    setShowAnalysis(true);
    setAnalysis(null);
    const transcript=chat.messages.map(m=>`${m.from==="me"?"Student (You)":chat.name}: ${m.text}`).join("\n");
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{
            role:"user",
            content:`You are an AI study coach for NEET/JEE students. Analyze this study chat conversation and return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "topics_discussed": ["topic1","topic2"],
  "weak_areas": [{"topic":"name","reason":"why they are weak","urgency":"high|medium|low"}],
  "strong_areas": ["topic1","topic2"],
  "recommendations": [{"action":"what to do","topic":"which topic","priority":1}],
  "study_tip": "a single motivational and practical tip",
  "knowledge_gaps": ["gap1","gap2"],
  "next_quiz_topics": ["topic1","topic2"]
}

Chat conversation:
${transcript}`
          }]
        })
      });
      const data=await resp.json();
      const text=data.content.find(b=>b.type==="text")?.text||"{}";
      const clean=text.replace(/```json|```/g,"").trim();
      setAnalysis(JSON.parse(clean));
    }catch(e){
      setAnalysis({
        topics_discussed:["Rotational Motion","MOI","Angular Momentum"],
        weak_areas:[{topic:"Precession & Gyroscope",reason:"Mentioned confusion with direction of torque",urgency:"high"},{topic:"Parallel Axis Theorem",reason:"Struggles with complex shapes",urgency:"medium"}],
        strong_areas:["Conservation of Angular Momentum","Basic Torque"],
        recommendations:[{action:"Practice 10 gyroscope direction problems",topic:"Precession",priority:1},{action:"Derive parallel axis theorem from scratch",topic:"MOI",priority:2}],
        study_tip:"Visualize angular momentum as a vector arrow — it makes direction problems 10x easier!",
        knowledge_gaps:["Direction of precession","MOI for combined shapes"],
        next_quiz_topics:["Precession","MOI Advanced","Rolling Motion"]
      });
    }
    setAnalyzing(false);
  };

  // Inbox list
  if(!activeChat) return(
    <div style={{minHeight:"100vh",paddingBottom:110,position:"relative"}}>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{background:"var(--grad)",padding:"52px 20px 20px",boxShadow:"0 4px 20px rgba(233,30,140,.2)"}}>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:2}}>💬 Study Chat</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>Chat with study buddies — AI analyzes your conversations to find gaps!</div>
        </div>
        <div style={{padding:"16px 18px"}}>
          {chats.map((c,i)=>{
            const last=c.messages[c.messages.length-1];
            return(
              <Card key={c.id} onClick={()=>setActiveChat(c.id)} style={{padding:"14px 16px",marginBottom:12,animation:`fadeUp .3s ${i*.07}s ease both`}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{position:"relative"}}>
                    <div style={{width:50,height:50,borderRadius:"50%",background:c.color+"22",border:"2px solid "+c.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{c.emoji}</div>
                    {c.online&&<div style={{position:"absolute",bottom:2,right:2,width:11,height:11,borderRadius:"50%",background:"var(--green)",border:"2px solid #fff"}}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <div style={{fontSize:15,fontWeight:700}}>{c.name}</div>
                      <div style={{fontSize:10,color:"var(--sub2)"}}>{last?.time}</div>
                    </div>
                    <div style={{fontSize:12,color:"var(--sub)",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{last?.from==="me"?"You: ":""}{last?.text}</div>
                  </div>
                </div>
              </Card>
            );
          })}
          {/* AI analysis info banner */}
          <Card style={{padding:"14px 16px",marginTop:8,background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",border:"1.5px solid #C4B5FD"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:28}}>🧠</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"var(--purple)"}}>AI Study Analysis</div>
                <div style={{fontSize:11,color:"var(--sub)",lineHeight:1.4}}>Open any chat and tap Analyse → Claude reads your conversation and finds your weak spots!</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  // Individual chat
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",position:"relative",background:"#F7F8FC"}}>
      {/* Chat header */}
      <div style={{background:"var(--grad)",padding:"52px 16px 14px",boxShadow:"0 2px 12px rgba(233,30,140,.2)",position:"sticky",top:0,zIndex:10,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>{setActiveChat(null);setShowAnalysis(false);setAnalysis(null);}} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,flexShrink:0}}>←</button>
          <div style={{position:"relative"}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"2px solid rgba(255,255,255,.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{chat.emoji}</div>
            {chat.online&&<div style={{position:"absolute",bottom:1,right:1,width:10,height:10,borderRadius:"50%",background:"#4ADE80",border:"2px solid rgba(255,255,255,.8)"}}/>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{chat.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.75)"}}>{chat.online?"Online now":"Last seen recently"}</div>
          </div>
          <button onClick={analyzeChat} style={{background:"rgba(255,255,255,.9)",border:"none",borderRadius:10,padding:"7px 12px",color:"var(--purple)",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",gap:4,flexShrink:0}}>🧠 Analyse</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 120px"}}>
        {chat.messages.map((msg,i)=>{
          const isMe=msg.from==="me";
          return(
            <div key={i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",marginBottom:10,animation:`${isMe?"slideInR":"slideInL"} .25s ease`}}>
              {!isMe&&<div style={{width:32,height:32,borderRadius:"50%",background:chat.color+"22",border:"1.5px solid "+chat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,marginRight:8,alignSelf:"flex-end"}}>{chat.emoji}</div>}
              <div style={{maxWidth:"72%"}}>
                <div style={{padding:"10px 14px",borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",background:isMe?"var(--grad)":"#fff",color:isMe?"#fff":"var(--tx)",fontSize:13,lineHeight:1.5,fontWeight:500,boxShadow:isMe?"0 2px 10px rgba(233,30,140,.2)":"0 1px 6px rgba(0,0,0,.06)"}}>{msg.text}</div>
                <div style={{fontSize:10,color:"var(--sub2)",marginTop:3,textAlign:isMe?"right":"left"}}>{msg.time}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* AI Analysis panel */}
      {showAnalysis&&(
        <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:"rgba(0,0,0,.45)",backdropFilter:"blur(3px)"}} onClick={()=>setShowAnalysis(false)}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:"0 0 40px",maxHeight:"85vh",overflowY:"auto",animation:"slideUp .35s ease"}} onClick={e=>e.stopPropagation()}>
            {/* Panel header */}
            <div style={{background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",padding:"20px 20px 16px",borderBottom:"1px solid #E9D5FF",borderRadius:"24px 24px 0 0",position:"sticky",top:0,zIndex:2}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:26}}>🧠</span>
                  <div><div style={{fontSize:17,fontWeight:800,color:"var(--purple)"}}>AI Study Analysis</div><div style={{fontSize:11,color:"var(--sub)"}}>Powered by Claude · {chat.name}'s chat</div></div>
                </div>
                <button onClick={()=>setShowAnalysis(false)} style={{width:30,height:30,borderRadius:"50%",background:"#E9D5FF",border:"none",fontSize:14,color:"var(--purple)",fontWeight:700}}>✕</button>
              </div>
            </div>

            {analyzing?(
              <div style={{padding:"40px 20px",textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12,animation:"spinOnce 1s ease infinite"}}>🧠</div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--purple)",marginBottom:8}}>Analysing your conversation…</div>
                <div style={{fontSize:12,color:"var(--sub)"}}>Claude is reading your messages to find learning patterns</div>
                <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:16}}>
                  {[0,.2,.4].map(d=><div key={d} style={{width:8,height:8,borderRadius:"50%",background:"var(--purple)",animation:`dotP 1.2s ${d}s ease infinite`}}/>)}
                </div>
              </div>
            ):analysis&&(
              <div style={{padding:"20px"}}>
                {/* Weak areas — most important */}
                {analysis.weak_areas?.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:15,fontWeight:800,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>⚠️</span>Weak Areas Found</div>
                    {analysis.weak_areas.map((w,i)=>(
                      <div key={i} style={{padding:"12px 14px",borderRadius:12,background:w.urgency==="high"?"#FFF5F5":"#FFF9F0",border:"1.5px solid "+(w.urgency==="high"?"#FECACA":"#FED7AA"),marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <div style={{fontSize:13,fontWeight:700}}>{w.topic}</div>
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:w.urgency==="high"?"var(--red)":"var(--amber)",color:"#fff",fontWeight:700,textTransform:"uppercase"}}>{w.urgency}</span>
                        </div>
                        <div style={{fontSize:12,color:"var(--sub)",lineHeight:1.4}}>{w.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Strong areas */}
                {analysis.strong_areas?.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:15,fontWeight:800,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>💪</span>Strong Areas</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {analysis.strong_areas.map((s,i)=><span key={i} style={{padding:"6px 12px",borderRadius:20,background:"#F0FDF4",border:"1.5px solid #86EFAC",color:"var(--green)",fontSize:12,fontWeight:600}}>{s}</span>)}
                    </div>
                  </div>
                )}
                {/* Recommendations */}
                {analysis.recommendations?.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:15,fontWeight:800,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>📋</span>Action Plan</div>
                    {analysis.recommendations.sort((a,b)=>a.priority-b.priority).map((r,i)=>(
                      <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",borderRadius:12,background:"#F8FAFF",border:"1px solid #E0E7FF",marginBottom:8}}>
                        <div style={{width:22,height:22,borderRadius:"50%",background:"var(--grad)",color:"#fff",fontWeight:800,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{r.priority}</div>
                        <div><div style={{fontSize:13,fontWeight:600,color:"var(--purple)"}}>{r.topic}</div><div style={{fontSize:12,color:"var(--sub)",marginTop:2}}>{r.action}</div></div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Knowledge gaps */}
                {analysis.knowledge_gaps?.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:15,fontWeight:800,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>🕳️</span>Knowledge Gaps</div>
                    {analysis.knowledge_gaps.map((g,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:"#FFF7ED",border:"1px solid #FED7AA",marginBottom:6}}><span style={{fontSize:14}}>→</span><span style={{fontSize:13,color:"var(--amber)",fontWeight:600}}>{g}</span></div>)}
                  </div>
                )}
                {/* Next quiz topics */}
                {analysis.next_quiz_topics?.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontSize:15,fontWeight:800,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>🎯</span>Quiz These Next</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {analysis.next_quiz_topics.map((t,i)=><span key={i} style={{padding:"7px 14px",borderRadius:20,background:"var(--grad)",color:"#fff",fontSize:12,fontWeight:700}}>{t}</span>)}
                    </div>
                  </div>
                )}
                {/* Study tip */}
                {analysis.study_tip&&(
                  <div style={{padding:"16px",borderRadius:14,background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",border:"1.5px solid #C4B5FD"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--purple)",marginBottom:4}}>💡 Claude's Tip</div>
                    <div style={{fontSize:13,color:"var(--tx)",lineHeight:1.5,fontStyle:"italic"}}>"{analysis.study_tip}"</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message input */}
      <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",width:"min(430px,100vw)",padding:"10px 16px",background:"rgba(247,248,252,.97)",borderTop:"1px solid var(--border)",zIndex:20,backdropFilter:"blur(8px)"}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Type a message..." style={{flex:1,padding:"10px 16px",borderRadius:20,border:"1.5px solid var(--border)",background:"#fff",fontSize:13,fontFamily:"var(--font)",outline:"none",color:"var(--tx)"}}/>
          <button onClick={sendMessage} style={{width:40,height:40,borderRadius:"50%",background:"var(--grad)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,boxShadow:"0 3px 12px rgba(233,30,140,.3)"}}>➤</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   RANKINGS
══════════════════════════════════════ */
function RanksScreen({currentUid}){
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    getLeaderboard(currentUid).then(rows=>{
      if(rows && rows.length>0) setData(rows);
      else setData(LB_DATA.map((r,i)=>({...r,rank:i+1,isMe:false})));
      setLoading(false);
    }).catch(e=>{
      console.log("Leaderboard:",e);
      setData(LB_DATA.map((r,i)=>({...r,rank:i+1,isMe:false})));
      setLoading(false);
    });
  },[currentUid]); // eslint-disable-line
  const top3=data.slice(0,3);
  const rest=data.slice(3);
  // Safe podium - only render if we have enough data
  const podiumOrder=[top3[1],top3[0],top3[2]];
  const podiumH=[80,110,65];
  const podiumBg=["#E8E8E8","var(--grad)","#FF8C00"];
  const podiumBadge=["🥈","🥇","🥉"];

  // Show loading or empty state
  if(loading) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"var(--bg)"}}>
      <div style={{fontSize:48}}>🏆</div>
      <div style={{fontSize:16,fontWeight:700,color:"var(--tx)"}}>Loading Rankings...</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",paddingBottom:110,position:"relative"}}>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1}}>
        <div style={{background:"var(--grad)",padding:"52px 20px 28px",boxShadow:"0 4px 24px rgba(233,30,140,.25)"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:6}}>🏆</div>
            <div style={{fontSize:26,fontWeight:800,color:"#fff"}}>Global Rankings</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.8)",marginTop:4}}>See how you stack up!</div>
          </div>
        </div>
        <div style={{padding:"0 18px"}}>
          {top3.length>=3&&(
          <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",gap:16,marginTop:24,marginBottom:16}}>
            {podiumOrder.map((p,i)=>p&&(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <div style={{position:"relative"}}>
                  <div style={{width:64,height:64,borderRadius:"50%",background:(p.color||"#667EEA")+"33",border:"3px solid "+(p.color||"#667EEA"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{p.emoji||"🧠"}</div>
                  <div style={{position:"absolute",top:-8,right:-8,width:24,height:24,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:"0 2px 8px rgba(0,0,0,.15)"}}>{podiumBadge[i]}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:700}}>{p.name.split(" ")[0]}</div>
                  <div style={{fontSize:11,color:"var(--sub)"}}>{p.score.toLocaleString()} pts</div>
                </div>
                <div style={{width:90,height:podiumH[i],borderRadius:"12px 12px 0 0",background:podiumBg[i],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:20,color:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,.12)"}}>#{i===0?2:i===1?1:3}</div>
              </div>
            ))}
          </div>
          )}
          {rest.map((p,i)=>{
            const isMe=p.isMe||(p.name==="You");
            const moved=(p.prev!=null)?(p.prev-p.rank):0;
            return(
              <div key={i} style={{position:"relative",marginBottom:10}}>
                {isMe&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"var(--grad)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:10,zIndex:2,letterSpacing:.5}}>YOU</div>}
                <Card style={{padding:"14px 16px",border:isMe?"2px solid var(--orange)":"none",background:isMe?"#FFF5F0":"#fff"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:13,flexShrink:0}}>#{p.rank}</div>
                    <div style={{width:44,height:44,borderRadius:"50%",background:p.color+"33",border:"2px solid "+p.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{p.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:700}}>{p.name}</div>
                      <div style={{fontSize:11,color:"var(--sub)"}}>🔥 {p.streak} day streak</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:20,fontWeight:800}}>{p.score.toLocaleString()}</div>
                      <div style={{fontSize:11,fontWeight:600,color:moved>0?"var(--green)":moved<0?"var(--red)":"var(--sub)"}}>{moved>0?"↗ +"+moved:moved<0?"↘ "+moved:"—"}</div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PROFILE
══════════════════════════════════════ */
function ProfileScreen({score,rank,streak,accuracy,xp,level,kb,addQuestion,onFeynman,onSignOut,onSignIn,userName,userEmail,userStats}){
  const [showPaywallProfile,setShowPaywallProfile]=useState(false);
  const [showKB,setShowKB]=useState(false);
  const totalQs=userStats?.totalQs||0;
  const studyMins=userStats?.studyMins||0;
  const studyHrs=studyMins>=60?Math.floor(studyMins/60)+"h":studyMins+"m";
  const stats=[
    {icon:"🧠",color:"#7C3AED",bg:"#EDE9FE",val:totalQs,label:"Total Questions"},
    {icon:"⏱️",color:"#00B4D8",bg:"#E0F7FF",val:studyHrs||"0m",label:"Time Studied"},
    {icon:"📅",color:"#FF6B35",bg:"#FFF0E8",val:streak+" days",label:"Current Streak"},
    {icon:"🎯",color:"#22C55E",bg:"#F0FDF4",val:accuracy+"%",label:"Avg Accuracy"},
  ];
  return(
    <div style={{minHeight:"100vh",paddingBottom:110,position:"relative"}}>
      {showPaywallProfile&&<PaywallCard onClose={()=>setShowPaywallProfile(false)} onUpgrade={()=>{localStorage.setItem("bb_premium",JSON.stringify(true));setShowPaywallProfile(false);alert("Premium activated! Welcome to Pro 🎉");}}/>}
      {showKB&&<KBModal kb={kb||[]} onAdd={q=>{addQuestion&&addQuestion(q);}} onClose={()=>setShowKB(false)}/>}
      <BlobBg/>
      <div style={{position:"relative",zIndex:1,padding:"52px 18px 0"}}>
        <div style={{fontSize:30,fontWeight:900,color:"var(--orange)",letterSpacing:-0.5,marginBottom:20}}>BrainBattle</div>
        <Card style={{padding:"20px 18px",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
            <div style={{width:72,height:72,borderRadius:"50%",background:"var(--grad)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,flexShrink:0,boxShadow:"0 4px 16px rgba(233,30,140,.3)"}}>🎯</div>
            <div><div style={{fontSize:22,fontWeight:800}}>Your Profile</div><div style={{fontSize:13,color:"var(--sub)",marginTop:2}}>Keep pushing your limits!</div></div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Pill>Rank #{rank}</Pill>
            <Pill style={{background:"linear-gradient(135deg,#E91E8C,#7C3AED)"}}>{score.toLocaleString()} Points</Pill>
            <Pill style={{background:"linear-gradient(135deg,#00B4D8,#22C55E)"}}>Level {level}</Pill>
          </div>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          {stats.map((s,i)=>(
            <Card key={i} style={{padding:"16px 14px"}}>
              <div style={{width:44,height:44,borderRadius:12,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:10}}>{s.icon}</div>
              <div style={{fontSize:22,fontWeight:800}}>{s.val}</div>
              <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Feynman Tutor banner */}
        <Card onClick={onFeynman} style={{padding:"16px",marginBottom:16,background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",border:"1.5px solid #C4B5FD",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#7C3AED,#E91E8C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🧠</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:800,color:"#4C1D95"}}>Feynman AI Tutor</div>
              <div style={{fontSize:12,color:"#6D28D9",lineHeight:1.4}}>Learn any topic deeply using analogies, questions and the Feynman technique</div>
            </div>
            <span style={{fontSize:20,color:"#7C3AED"}}>→</span>
          </div>
        </Card>

        {/* Upgrade Button */}
        <div onClick={()=>setShowPaywallProfile(true)} style={{background:"linear-gradient(135deg,#667EEA,#764BA2)",borderRadius:20,padding:"16px 18px",marginBottom:12,cursor:"pointer",display:"flex",alignItems:"center",gap:14,boxShadow:"0 6px 20px rgba(102,126,234,.35)"}}>
          <div style={{fontSize:32}}>⚡</div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>Upgrade to Pro</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.8)",marginTop:2}}>Unlimited Dr. Neuron · Full Analytics</div>
          </div>
          <div style={{fontSize:20,color:"rgba(255,255,255,.8)"}}>›</div>
        </div>

        {/* Knowledge Base card */}
        <Card style={{padding:"16px",marginBottom:20,border:"1.5px solid #FED7AA"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <div style={{fontSize:15,fontWeight:800}}>📚 Knowledge Base</div>
              <div style={{fontSize:12,color:"var(--sub)"}}>{(kb||QB).length} questions in the pool</div>
            </div>
            <button onClick={()=>setShowKB(true)} style={{padding:"8px 14px",background:"var(--grad)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:12}}>➕ Add Question</button>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Rotational Motion","MOI","Torque","Angular Momentum","Rolling Motion","Precession"].map(t=>{
              const count=(kb||QB).filter(q=>q.tag===t).length;
              return count>0?<span key={t} style={{fontSize:10,padding:"3px 9px",borderRadius:10,background:"#FFF0E8",border:"1px solid #FED7AA",color:"var(--orange)",fontWeight:600}}>{t} ×{count}</span>:null;
            })}
          </div>
        </Card>

        {/* Sign in / Sign out */}
        {userEmail?(
          <div onClick={onSignOut} style={{marginBottom:12,padding:"12px 16px",background:"#FFF0F0",borderRadius:16,border:"1px solid #FFD0D0",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>Sign Out</div>
              <div style={{fontSize:11,color:"#9CA3AF",marginTop:1}}>{userEmail}</div>
            </div>
            <div style={{fontSize:16}}>👋</div>
          </div>
        ):(
          <div onClick={onSignIn} style={{marginBottom:12,padding:"12px 16px",background:"#EEF2FF",borderRadius:16,border:"1px solid #C7D2FE",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#4338CA"}}>Sign In with Google</div>
              <div style={{fontSize:11,color:"#9CA3AF",marginTop:1}}>Sync progress across devices</div>
            </div>
            <div style={{fontSize:16}}>🔑</div>
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><span style={{fontSize:22}}>🏆</span><span style={{fontSize:22,fontWeight:800}}>Achievements</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
          {[
            { icon:"🏆", label:"First Victory",  desc:"Complete your first quiz",      color:"#FF9500", bg:"#FFF3E0", earned:(userStats?.quizzesDone||0)>=1 },
            { icon:"🎯", label:"Sharp Shooter",  desc:"10 correct in a row",           color:"#22C55E", bg:"#F0FDF4", earned:(userStats?.accuracy||0)>=80&&(userStats?.totalQs||0)>=10 },
            { icon:"⚡", label:"Speed Demon",    desc:"50 questions attempted",        color:"#00B4D8", bg:"#E0F7FF", earned:(userStats?.totalQs||0)>=50 },
            { icon:"🧠", label:"Genius",         desc:"Score 90%+ accuracy",           color:"#7C3AED", bg:"#EDE9FE", earned:(userStats?.accuracy||0)>=90&&(userStats?.quizzesDone||0)>=3 },
            { icon:"⭐", label:"Rising Star",    desc:"Reach top 10 leaderboard",      color:"#E91E8C", bg:"#FFE4F3", earned:(userStats?.rank||999)<=10 },
            { icon:"👑", label:"Legendary",      desc:"30-day streak",                 color:"#FF6B35", bg:"#FFF0E8", earned:(userStats?.streak||0)>=30 },
          ].map((a,i)=>(
            <Card key={i} style={{padding:"14px 10px",position:"relative",opacity:a.earned?1:0.6}}>
              {a.earned&&<div style={{position:"absolute",top:8,right:8,width:20,height:20,borderRadius:"50%",background:"var(--green)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700}}>✓</div>}
              <div style={{width:46,height:46,borderRadius:14,background:a.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:8,filter:a.earned?"none":"grayscale(1)"}}>{a.icon}</div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{a.label}</div>
              <div style={{fontSize:10,color:"var(--sub)",lineHeight:1.3}}>{a.desc}</div>
            </Card>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><span style={{fontSize:22}}>📊</span><span style={{fontSize:22,fontWeight:800}}>Recent Activity</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
          {RECENT_ACTIVITY.map((a,i)=>(
            <Card key={i} style={{padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:46,height:46,borderRadius:14,background:a.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🧠</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700}}>{a.label}</div><div style={{fontSize:12,color:"var(--sub)"}}>{a.time}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:"var(--green)"}}>+{a.pts}</div><div style={{fontSize:11,color:"var(--sub)"}}>points</div></div>
              </div>
            </Card>
          ))}
        </div>
        <Card style={{padding:"18px 16px",marginBottom:20,border:"2px solid #E9D5FF",background:"linear-gradient(135deg,#FDF4FF,#F5F3FF)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div><div style={{fontSize:20,fontWeight:800}}>Level {level}</div><div style={{fontSize:12,color:"var(--sub)"}}>{xp.toLocaleString()} / 2,000 XP to Level {level+1}</div></div>
            <span style={{fontSize:36}}>⭐</span>
          </div>
          <div style={{height:8,background:"#E9D5FF",borderRadius:4}}><div style={{height:"100%",width:((xp/2000)*100)+"%",background:"linear-gradient(90deg,#7C3AED,#E91E8C)",borderRadius:4}}/></div>
        </Card>

        {/* Help & Support */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}><span style={{fontSize:22}}>🛟</span><span style={{fontSize:22,fontWeight:800}}>Help & Support</span></div>
        {[
          { icon:"🐛", label:"Report a Bug",        desc:"Found something broken? Tell us",  action:()=>{ const uid=userEmail||"unknown"; window.location.href=`mailto:pratulparmar06@gmail.com?subject=BrainBattle Bug Report - ${uid}&body=Hi Pratul,%0A%0ADescribe the bug:%0A%0ASteps to reproduce:%0A%0ADevice/Browser:%0A`; }},
          { icon:"💡", label:"Suggest a Feature",   desc:"Have an idea? We'd love to hear it", action:()=>{ window.location.href=`mailto:pratulparmar06@gmail.com?subject=BrainBattle Feature Request&body=Hi Pratul,%0A%0AMy idea:%0A`; }},
          { icon:"❓", label:"FAQ / How to Use",    desc:"Quick guide to BrainBattle",        action:()=>{ alert("📚 BrainBattle Quick Guide\n\n• Home: Start quizzes by subject or chapter\n• Dr. Neuron: Ask any NEET doubt\n• Mock Test: Full 200Q/3hr NEET simulation\n• Progress: Track your weak chapters\n• Ranks: See where you stand globally\n\nFree plan: 3 quizzes + 1 mock/day\nPro: Unlimited everything"); }},
        ].map((item,i)=>(
          <Card key={i} onClick={item.action} style={{padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:14,border:"1.5px solid #F0EBE0"}}>
            <div style={{width:44,height:44,borderRadius:14,background:"#F9FAFB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700}}>{item.label}</div>
              <div style={{fontSize:11,color:"var(--sub)",marginTop:2}}>{item.desc}</div>
            </div>
            <div style={{fontSize:18,color:"var(--sub2)"}}>›</div>
          </Card>
        ))}
        <div style={{textAlign:"center",fontSize:11,color:"var(--sub2)",marginBottom:20,marginTop:4}}>v1.0.0 · Made with ❤️ for NEET 2026</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   QUIZ SELECTOR
══════════════════════════════════════ */
function QuizSelector({onStart,onBack,preSubject}){
  const [subject,setSubject]=useState(preSubject||"");
  const [chapter,setChapter]=useState("");
  const [diff,setDiff]=useState("");
  const [qCount,setQCount]=useState(5);
  const chapters=subject?getChaptersForSubject(subject):[];

  // live count of available questions with current filters
  const available = QB.filter(q=>
    (!subject||q.subject===subject)&&
    (!chapter||q.chapter===chapter)&&
    (!diff||q.diff===diff)
  ).length;

  return(
    <div style={{minHeight:"100vh",paddingBottom:40,position:"relative"}}>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{background:"var(--grad)",padding:"52px 20px 20px",boxShadow:"0 4px 20px rgba(233,30,140,.2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
            <button onClick={onBack} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16}}>←</button>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>🎯 Configure Quiz</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>5000+ questions · NEET · PYQs · AI Generated</div>
            </div>
          </div>
        </div>

        <div style={{padding:"20px 18px"}}>
          {/* Subject tiles */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",marginBottom:10,letterSpacing:.5}}>SUBJECT</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {Object.entries(SUBJECT_META).map(([subj,meta])=>{
                const sel=subject===subj;
                const count=QB_STATS.bySubject[subj]||0;
                return(
                  <button key={subj} onClick={()=>{setSubject(sel?"":subj);setChapter("");}} style={{padding:"14px 12px",borderRadius:14,border:`2px solid ${sel?meta.color:"#EBEBEB"}`,background:sel?meta.bg:"#fff",display:"flex",alignItems:"center",gap:10,textAlign:"left",transition:"all .2s"}}>
                    <div style={{width:40,height:40,borderRadius:12,background:sel?meta.color+"22":meta.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{meta.icon}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:sel?meta.color:"var(--tx)"}}>{subj}</div>
                      <div style={{fontSize:10,color:"var(--sub)"}}>{count} Qs · {meta.exam}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chapter picker */}
          {subject&&chapters.length>0&&(
            <div style={{marginBottom:20,animation:"fadeUp .25s ease"}}>
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",marginBottom:10,letterSpacing:.5}}>CHAPTER <span style={{fontWeight:500,textTransform:"none",letterSpacing:0}}>(optional)</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                <button onClick={()=>setChapter("")} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${!chapter?"var(--orange)":"#E5E7EB"}`,background:!chapter?"#FFF0E8":"#fff",fontSize:12,fontWeight:700,color:!chapter?"var(--orange)":"var(--sub)"}}>All chapters</button>
                {chapters.map(c=>{
                  const sel=chapter===c.chapter;
                  const m=SUBJECT_META[subject];
                  return <button key={c.chapter} onClick={()=>setChapter(sel?"":c.chapter)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${sel?m.color:"#E5E7EB"}`,background:sel?m.bg:"#fff",fontSize:11,fontWeight:600,color:sel?m.color:"var(--sub)",maxWidth:"100%",textAlign:"left"}}>{c.chapter}</button>;
                })}
              </div>
            </div>
          )}

          {/* Difficulty + count */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",marginBottom:10,letterSpacing:.5}}>DIFFICULTY</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[["","All"],["easy","Easy 🌱"],["medium","Medium 🔥"],["hard","Hard 💀"]].map(([val,label])=>(
                  <button key={val} onClick={()=>setDiff(val)} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${diff===val?"var(--orange)":"#E5E7EB"}`,background:diff===val?"#FFF0E8":"#fff",fontSize:12,fontWeight:600,color:diff===val?"var(--orange)":"var(--sub)",textAlign:"left"}}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--sub)",marginBottom:10,letterSpacing:.5}}>QUESTIONS</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[5,10,15,20].map(n=>(
                  <button key={n} onClick={()=>setQCount(n)} disabled={n>available} style={{padding:"8px 12px",borderRadius:10,border:`1.5px solid ${qCount===n?"var(--orange)":"#E5E7EB"}`,background:qCount===n?"#FFF0E8":"#fff",fontSize:12,fontWeight:600,color:n>available?"#CCC":qCount===n?"var(--orange)":"var(--sub)",textAlign:"left"}}>{n} questions</button>
                ))}
              </div>
            </div>
          </div>

          {/* Available count */}
          <Card style={{padding:"14px 16px",marginBottom:20,background:"linear-gradient(135deg,#F0FDF4,#ECFDF5)",border:"1.5px solid #86EFAC"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>✓ Questions available</div><div style={{fontSize:11,color:"var(--sub)"}}>with current filters</div></div>
              <div style={{fontSize:28,fontWeight:900,color:"var(--green)"}}>{available}</div>
            </div>
          </Card>

          <button
            onClick={()=>onStart({subject,chapter,diff,qCount:Math.min(qCount,available)})}
            disabled={available<1}
            style={{width:"100%",padding:"15px",background:available>0?"var(--grad)":"#E5E7EB",border:"none",borderRadius:16,color:available>0?"#fff":"var(--sub)",fontWeight:800,fontSize:16,boxShadow:available>0?"0 6px 24px rgba(233,30,140,.3)":"none"}}>
            Start {Math.min(qCount,available)} Questions →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   LOADING
══════════════════════════════════════ */
function LoadingScreen({onReady,kb,subject,chapter,filters={}}){
  const [step,setStep]=useState(0);
  const steps=["Scanning PYQ patterns 2016–2024","Analyzing distractor frequency","Calibrating difficulty levels","Generating unique variants","Quality check complete","Questions ready ✓"];
  useEffect(()=>{
    let i=0;
    const t=setInterval(()=>{
      i++;setStep(i);
      if(i>=steps.length){
        clearInterval(t);
        const qs=getRandom(filters.qCount||5,{
          subject: subject  || filters.subject || undefined,
          chapter: chapter  || filters.chapter || undefined,
          diff:    filters.diff    || undefined,
        });
        const cleanQs = qs.filter(q => q && q.q && q.opts && q.opts.length === 4);
        setTimeout(()=>onReady(cleanQs),400);
      }
    },420);
    return()=>clearInterval(t);
  },[]);
  const pct=Math.round((step/steps.length)*100);
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,position:"relative"}}>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:360,textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16,animation:"spinOnce 1s ease"}}>🧠</div>
        <div style={{fontSize:13,fontWeight:700,color:"var(--orange)",letterSpacing:2,marginBottom:28,textTransform:"uppercase"}}>Cooking your mock</div>
        <Card style={{padding:"20px 18px"}}>
          {steps.map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",opacity:i<=step?1:.2,transition:"opacity .3s",borderBottom:i<steps.length-1?"1px solid var(--border)":"none"}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:i<step?"var(--green)":i===step?"var(--orange)":"#F0F0F0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:i<=step?"#fff":"var(--sub)",fontWeight:700,transition:"all .3s"}}>{i<step?"✓":i===step?"…":""}</div>
              <div style={{fontSize:13,color:i===step?"var(--tx)":"var(--sub)",fontWeight:i===step?600:400}}>{s}</div>
            </div>
          ))}
          <div style={{marginTop:16,height:6,background:"#F0F0F0",borderRadius:3}}><div style={{height:"100%",background:"var(--grad)",width:pct+"%",transition:"width .4s ease",borderRadius:3}}/></div>
          <div style={{fontSize:12,color:"var(--sub)",marginTop:6,textAlign:"right",fontWeight:600}}>{pct}%</div>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   QUIZ
══════════════════════════════════════ */
/* ══════════════════════════════════════
   QUESTION TEXT FORMATTER
══════════════════════════════════════ */
function formatQuestionText(text) {
  if (!text) return text;
  let t = text;

  // Remove ALL NCERT reference phrasings from question text
  const ncertPatterns = [
    /^the ncert (definition|text|textbook|data|book|chapter|syllabus|curriculum)\s+(describes?|states?|mentions?|says?|defines?|explains?|classifies?|lists?|includes?|notes?|accounts?\s+for|specifically\s+\w+)\s*/i,
    /^the ncert\s+(describes?|states?|mentions?|says?|defines?|explains?|classifies?|lists?|includes?)\s*/i,
    /^ncert\s+(describes?|states?|mentions?|says?|defines?|explains?|classifies?|lists?|includes?|data)\s*/i,
    /^according to ncert'?s?\s+(account\s+of|definition|description|classification|explanation|text)?\s*/i,
    /^according to the ncert\s*/i,
    /^as (per|stated in|described in|given in|mentioned in) (the )?ncert\s*/i,
    /according to ncert'?s?[^?]*?,\s*/gi,
    /the ncert (definition|text|textbook|data)\s+(describes?|states?)[^.]*\.\s*/gi,
  ];
  for (const pattern of ncertPatterns) {
    const before = t;
    t = t.replace(pattern, '');
    if (t !== before) break; // Only apply first matching pattern
  }
  // Clean trailing/leading punctuation artifacts
  t = t.replace(/^[,.'\s]+/, '').trim();
  t = t.replace(/\?\s*\?/g, '?');
  // Capitalize first letter
  if (t.length > 0) t = t[0].toUpperCase() + t.slice(1);
  
  // Only format match-list style questions
  const isMatchList = /list[- ]i|list[- ]ii|column[- ]i|match list/i.test(t);
  if (!isMatchList) return t;
  
  // Keep "Match List I with List II" together — only break AFTER List II header
  // Pattern: after "List I (anything):" or "List I :" start new line for items
  // Break before standalone A. B. C. D. items (not inside words)
  t = t.replace(/(\s+)(List[-\s]I[^I])/g, '\n$2');
  t = t.replace(/(\s+)(List[-\s]II)/g, '\n$2');
  t = t.replace(/(\s+)(Column[-\s]I[^I])/g, '\n$2');
  t = t.replace(/(\s+)(Column[-\s]II)/g, '\n$2');
  // Break before A. B. C. D. list items (preceded by space, followed by capital word)
  t = t.replace(/\s+([A-D]\.[\s]+[A-Z])/g, '\n$1');
  // Break before Roman numerals used as list items (I. II. III. IV. followed by capital)
  t = t.replace(/\s+(IV\.\s+[A-Z])/g, '\nIV. $1'.replace('IV. IV. ','IV. '));
  t = t.replace(/\s+(III\.\s+[A-Z])/g, '\nIII. ');
  t = t.replace(/\s+(II\.\s+[A-Z])/g, '\nII. ');
  t = t.replace(/\s+(I\.\s+[A-Z])/g, '\nI. ');
  
  return t.trim();
}

function QuestionText({text}) {
  const formatted = formatQuestionText(text);
  return (
    <div style={{fontSize:15, fontWeight:700, lineHeight:1.65}}>
      {formatted.split('\n').map((line, i) => (
        <span key={i} style={{display:'block', marginBottom: line.startsWith('List') || line.startsWith('Column') ? 4 : 0}}>
          {line}
        </span>
      ))}
    </div>
  );
}



/* ══════════════════════════════════════
   REPORT QUESTION MODAL
══════════════════════════════════════ */
function ReportModal({question, onClose, onSubmit}) {
  const [reason, setReason] = React.useState('');
  const reasons = [
    "NCERT reference in question",
    "Wrong answer",
    "Broken/unclear image",
    "Scientific error in diagram",
    "Question references missing figure",
    "Duplicate question",
    "Other",
  ];
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9998,display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:430,margin:"0 auto"}}>
        <div style={{fontSize:17,fontWeight:800,marginBottom:4}}>🚩 Report Question</div>
        <div style={{fontSize:12,color:"#6B7280",marginBottom:16}}>Help us improve the question bank</div>
        {reasons.map((r,i) => (
          <button key={i} onClick={()=>setReason(r)}
            style={{display:"block",width:"100%",textAlign:"left",padding:"10px 14px",
              marginBottom:8,borderRadius:10,border:`1.5px solid ${reason===r?"#EF4444":"#E5E7EB"}`,
              background:reason===r?"#FFF5F5":"#fff",color:reason===r?"#EF4444":"#374151",
              fontWeight:reason===r?700:400,fontSize:13,cursor:"pointer"}}>
            {reason===r?"✓ ":""}{r}
          </button>
        ))}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={onClose}
            style={{flex:1,padding:12,background:"#F3F4F6",border:"none",borderRadius:12,fontWeight:700,fontSize:14,color:"#374151"}}>
            Cancel
          </button>
          <button onClick={()=>{if(reason){onSubmit(reason);onClose();}}}
            disabled={!reason}
            style={{flex:1,padding:12,background:reason?"#EF4444":"#F3F4F6",border:"none",
              borderRadius:12,fontWeight:700,fontSize:14,color:reason?"#fff":"#9CA3AF"}}>
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   FULLSCREEN IMAGE VIEWER
══════════════════════════════════════ */
function FullscreenImage({content, isSvg, alt, onClose}) {
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:9999,
        background:"rgba(0,0,0,0.95)",
        display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", padding:16,
      }}
    >
      {/* Close hint */}
      <div style={{
        position:"absolute", top:52, right:16,
        background:"rgba(255,255,255,0.2)", borderRadius:20,
        padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:600,
      }}>
        Tap anywhere to close ✕
      </div>

      {/* Image content */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:"#fff", borderRadius:16, padding:16,
          maxWidth:"100%", maxHeight:"80vh",
          overflow:"auto", width:"100%",
        }}
      >
        {isSvg
          ? <div
              dangerouslySetInnerHTML={{__html: content}}
              style={{width:"100%", textAlign:"center"}}
            />
          : <img
              src={content} alt={alt||"Diagram"}
              style={{width:"100%", height:"auto", display:"block"}}
            />
        }
      </div>

      {alt && (
        <div style={{
          marginTop:12, color:"rgba(255,255,255,0.7)",
          fontSize:12, textAlign:"center", maxWidth:360,
        }}>
          {alt}
        </div>
      )}
    </div>
  );
}

function QuizScreen({questions,onFinish}){
  const [qIdx,setQIdx]=useState(0);
  const [answers,setAnswers]=useState({});
  const [fullscreen,setFullscreen]=useState(null);
  const [showReport,setShowReport]=useState(false);
  const [reportedQs,setReportedQs]=useState(new Set());
  const [feedback,setFeedback]=useState(null);
  const [timeLeft,setTimeLeft]=useState(180);
  const [totalPts,setTotalPts]=useState(0);
  const [xpToast,setXpToast]=useState(null);
  const [confetti,setConfetti]=useState(false);
  const [selected,setSelected]=useState(null);
  const [cardKey,setCardKey]=useState(0);
  const safeQs = Array.isArray(questions) ? questions.filter(q => q && q.q && q.q.length > 5 && Array.isArray(q.opts) && q.opts.length >= 2) : [];
  const q = safeQs[qIdx];
  const labels=["A","B","C","D"];
  useEffect(()=>{
    if(timeLeft<=0){doFinish(answers);return;}
    const t=setTimeout(()=>setTimeLeft(v=>v-1),1000);
    return()=>clearTimeout(t);
  },[timeLeft]);
  const fmt=s=>Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
  const doFinish=(ans)=>{
    const s=Object.values(ans).filter(a=>a.correct).length;
    const pts=Object.values(ans).reduce((sum,a)=>sum+(a.correct?a.pts:0),0);
    onFinish({answers:ans,score:s,total:safeQs.length,timeUsed:180-timeLeft,ptsEarned:pts});
  };
  const handleSelect=(i)=>{
    if(feedback) return;
    const isCorrect=i===q.ans;
    setSelected(i);setFeedback(isCorrect?"correct":"wrong");
    const newAns={...answers,[qIdx]:{selected:i,correct:isCorrect,topicTag:q.tag,pts:q.pts}};
    setAnswers(newAns);
    if(isCorrect){setXpToast(q.pts);setTotalPts(p=>p+q.pts);setConfetti(true);setTimeout(()=>setConfetti(false),900);}
    setTimeout(()=>{
      if(qIdx+1>=safeQs.length){doFinish(newAns);return;}
      setQIdx(x=>x+1);setSelected(null);setFeedback(null);setCardKey(k=>k+1);
    },2000);
  };
  if (!q) return <div style={{padding:40,textAlign:'center',color:'#6B7280',fontSize:15,paddingTop:120}}>⚠️ No questions found. Please go back and try again.</div>;

  return(
    <div style={{minHeight:"100vh",position:"relative"}}>
      {xpToast&&<XPToast pts={xpToast} onDone={()=>setXpToast(null)}/>}
      <Confetti show={confetti}/>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1,padding:"52px 18px 24px"}}>
        <Card style={{padding:"14px 16px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:14,fontWeight:600,color:"var(--sub)"}}>Question {qIdx+1} of {safeQs.length}</div>
            <div style={{fontSize:16,fontWeight:800}}>{totalPts} pts</div>
          </div>
          <div style={{height:6,background:"#F0F0F0",borderRadius:3,marginBottom:8}}><div style={{height:"100%",background:"var(--red)",width:((qIdx/safeQs.length)*100)+"%",borderRadius:3,transition:"width .4s"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:4}}>{questions.map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:answers[i]?answers[i].correct?"var(--green)":"var(--red)":i===qIdx?"var(--orange)":"#E0E0E0",transition:"all .3s"}}/>)}</div>
            <div style={{fontWeight:700,fontSize:13,color:timeLeft<30?"var(--red)":"var(--sub)",animation:timeLeft<30?"timerW .6s ease infinite":"none"}}>⏱ {fmt(timeLeft)}</div>
          </div>
        </Card>
        <div key={cardKey} style={{animation:"cardPop .3s ease"}}>
          <Card style={{padding:"20px 18px",marginBottom:12,border:"2px solid "+(feedback==="correct"?"var(--green)":feedback==="wrong"?"var(--red)":"transparent"),transition:"border-color .25s",animation:feedback==="wrong"?"shake .4s ease":"none"}}>
            {/* Topic tag + PYQ badge */}
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}>
              <div style={{display:"inline-block",padding:"4px 14px",borderRadius:20,background:"var(--cyan)",color:"#fff",fontWeight:700,fontSize:11}}>{q.tag}</div>
              {q.pyq&&<div style={{display:"inline-block",padding:"4px 10px",borderRadius:20,background:"#FFF0E8",color:"var(--orange)",fontWeight:700,fontSize:10,border:"1px solid var(--orange)"}}>📋 PYQ {q.pyqYear}</div>}
              {q.diff==="hard"&&<div style={{display:"inline-block",padding:"4px 10px",borderRadius:20,background:"#FFF5F5",color:"var(--red)",fontWeight:700,fontSize:10}}>🔥 Hard</div>}
              {reportedQs.has(q.id)&&<div style={{display:"inline-block",padding:"4px 10px",borderRadius:20,background:"#FFF5F5",color:"#EF4444",fontWeight:700,fontSize:10}}>🚩 Reported</div>}
              <button onClick={()=>setShowReport(true)} style={{display:"inline-block",padding:"4px 10px",borderRadius:20,background:"#F9FAFB",color:"#9CA3AF",fontWeight:600,fontSize:10,border:"1px solid #E5E7EB",cursor:"pointer",marginLeft:4}}>🚩 Report</button>
            </div>

            {/* Question image — shown if question has diagram */}
            {q.hasImage && q.imageUrl && (
              <div style={{marginBottom:8,borderRadius:12,overflow:"hidden",border:"1.5px solid #F0F0F0",background:"#FAFAFA"}}>
                <img
                  src={q.imageUrl}
                  alt={q.imageAlt||"Question diagram"}
                  onClick={()=>setFullscreen({content:q.imageUrl,isSvg:false,alt:q.imageAlt})}
                  style={{width:"100%",height:"auto",display:"block",maxHeight:280,objectFit:"contain",padding:8,cursor:"pointer"}}
                  onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}
                />
                <div style={{display:"none",padding:"20px",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6,color:"var(--sub)"}}>
                  <span style={{fontSize:28}}>🖼️</span>
                  <span style={{fontSize:12}}>Diagram not available</span>
                </div>
                <div style={{textAlign:"center",padding:"4px 0 8px"}}>
                  <span style={{fontSize:11,color:"var(--sub)",background:"#F0F0F0",borderRadius:20,padding:"4px 12px"}}>🔍 Tap to enlarge</span>
                </div>
                {q.imageCaption&&<div style={{fontSize:10,color:"var(--sub2)",padding:"4px 10px 6px",borderTop:"1px solid #F0F0F0"}}>{q.imageCaption}</div>}
              </div>
            )}

            {/* Question text */}
            <QuestionText text={q.q}/>
          </Card>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:12}}>
            {q.opts.map((opt,i)=>{
              const isC=i===q.ans,isWS=i===selected&&!isC;
              let bg="#fff",border="#EBEBEB",lBg="#F5F5F5",lC="var(--sub)",tC="var(--tx)";
              if(feedback){if(isC){bg="#F0FDF4";border="var(--green)";lBg="var(--green)";lC="#fff";tC="var(--green)";}if(isWS){bg="#FFF5F5";border="var(--red)";lBg="var(--red)";lC="#fff";tC="var(--red)";}}
              else if(selected===i){bg="#FFF0E8";border="var(--orange)";lBg="var(--orange)";lC="#fff";}
              return(
                <button key={i} onClick={()=>handleSelect(i)} disabled={!!feedback} style={{width:"100%",padding:"12px 14px",background:bg,border:"1.5px solid "+border,borderRadius:14,display:"flex",alignItems:"center",gap:11,textAlign:"left",transition:"all .2s",boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                  <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:lBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:lC}}>{feedback&&isC?"✓":feedback&&isWS?"✗":labels[i]}</div>
                  <span style={{fontSize:14,color:tC,lineHeight:1.4,fontWeight:500}}>{opt}</span>
                </button>
              );
            })}
          </div>
          {feedback&&(
            <Card style={{padding:"12px 14px",background:feedback==="correct"?"#F0FDF4":"#FFF9F0",border:"1.5px solid "+(feedback==="correct"?"var(--green)":"var(--amber)"),animation:"fadeUp .3s ease"}}>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <span style={{fontSize:22,flexShrink:0}}>{feedback==="correct"?"🎯":"💡"}</span>
                <div><div style={{fontSize:11,fontWeight:700,color:feedback==="correct"?"var(--green)":"var(--amber)",marginBottom:3}}>{feedback==="correct"?"CORRECT! +"+q.pts+" pts":"EXPLANATION"}</div><div style={{fontSize:12,color:"var(--tx)",lineHeight:1.5}}>{q.exp}</div></div>
              </div>
            </Card>
          )}
          {!feedback&&<div style={{textAlign:"center",fontSize:12,color:"var(--sub2)",marginTop:8}}>Tap an option to answer</div>}
        </div>
      </div>
      {showReport&&<ReportModal question={q} onClose={()=>setShowReport(false)} onSubmit={reason=>{
              setReportedQs(s=>new Set([...s,q.id]));
              // Save report to localStorage
              try {
                const existing = JSON.parse(localStorage.getItem('bb_reports')||'[]');
                existing.push({
                  id: q.id,
                  subject: q.subject,
                  chapter: q.chapter,
                  q: q.q?.slice(0,120),
                  reason: reason,
                  timestamp: new Date().toISOString(),
                });
                localStorage.setItem('bb_reports', JSON.stringify(existing));
              } catch(e) {}
            }}/>}
      {fullscreen&&<FullscreenImage content={fullscreen.content} isSvg={fullscreen.isSvg} alt={fullscreen.alt} onClose={()=>setFullscreen(null)}/>}
    </div>
  );
}

/* ══════════════════════════════════════
   RESULTS
══════════════════════════════════════ */
/* ══════════════════════════════════════
   NCERT SOURCE MAP
══════════════════════════════════════ */
const SOURCES={
  "Rotational Motion":  "NCERT Physics Part I, Class 11 — Chapter 7: System of Particles and Rotational Motion (pg. 157–189)",
  "Rolling Motion":     "NCERT Physics Part I, Class 11 — Chapter 7, Section 7.9: Rolling Motion (pg. 179–182)",
  "MOI":                "NCERT Physics Part I, Class 11 — Chapter 7, Section 7.6: Moment of Inertia (pg. 166–172)",
  "Rotational KE":      "NCERT Physics Part I, Class 11 — Chapter 7, Section 7.7: Theorems of Perpendicular and Parallel Axes (pg. 172–175)",
  "Torque":             "NCERT Physics Part I, Class 11 — Chapter 7, Section 7.3: Angular Velocity and Angular Acceleration (pg. 158–163)",
  "Rolling Incline":    "NCERT Physics Part I, Class 11 — Chapter 7, Section 7.9 + Example 7.9 (pg. 181)",
  "Angular Momentum":   "NCERT Physics Part I, Class 11 — Chapter 7, Section 7.5: Angular Momentum of a Particle (pg. 163–166)",
  "Precession":         "NCERT Physics Part I, Class 11 — Chapter 7, Section 7.11: Angular Momentum in case of Rotation about a Fixed Axis (pg. 183–185)",
};

// fullscreen portal added by QuizScreen above

function SolutionsReview({questions,answers,onBack}){
  const [open,setOpen]=useState(null);
  return(
    <div style={{minHeight:"100vh",paddingBottom:40,position:"relative"}}>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{background:"var(--grad)",padding:"52px 20px 20px",boxShadow:"0 4px 20px rgba(233,30,140,.25)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
            <button onClick={onBack} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16}}>←</button>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>📖 Full Solutions</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>Every question explained with NCERT source</div>
            </div>
          </div>
          {/* Summary row */}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            {questions.map((_,i)=>{
              const a=answers[i];
              return<div key={i} style={{flex:1,height:6,borderRadius:3,background:a?a.correct?"#4ADE80":"#F87171":"rgba(255,255,255,.3)"}}/>;
            })}
          </div>
        </div>

        <div style={{padding:"16px 18px"}}>
          {questions.map((q,i)=>{
            const a=answers[i];
            const isCorrect=a?.correct;
            const isOpen=open===i;
            const src=SOURCES[q.tag]||SOURCES[q.chapter]||`NCERT ${q.subject} — ${q.chapter}`;
            return(
              <Card key={i} style={{marginBottom:14,border:"1.5px solid "+(isCorrect?"#86EFAC":"#FECACA"),overflow:"visible"}}>
                {/* Question header */}
                <div onClick={()=>setOpen(isOpen?null:i)} style={{padding:"14px 16px",cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:10,background:isCorrect?"#F0FDF4":"#FFF5F5",border:"1.5px solid "+(isCorrect?"var(--green)":"var(--red)"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{isCorrect?"✅":"❌"}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:"var(--cyan)",color:"#fff",fontWeight:700}}>{q.tag}</span>
                        <span style={{fontSize:11,color:"var(--sub)",fontWeight:600}}>Q{i+1} · {isCorrect?"+"+q.pts+" pts":"0 pts"}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:600,lineHeight:1.5,color:"var(--tx)"}}>{q.q}</div>
                    </div>
                    <span style={{fontSize:12,color:"var(--sub2)",flexShrink:0,marginTop:8}}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {/* Expanded solution */}
                {isOpen&&(
                  <div style={{borderTop:"1px solid var(--border)",padding:"14px 16px",animation:"fadeUp .2s ease"}}>
                    {/* All options */}
                    <div style={{marginBottom:14}}>
                      {q.opts.map((opt,oi)=>{
                        const isCorrectOpt=oi===q.ans;
                        const wasSelected=a?.selected===oi;
                        let bg="#FAFAFA",border="#E5E7EB",lBg="#E5E7EB",lCol="var(--sub)";
                        if(isCorrectOpt){bg="#F0FDF4";border="#86EFAC";lBg="var(--green)";lCol="#fff";}
                        else if(wasSelected&&!isCorrectOpt){bg="#FFF5F5";border="#FECACA";lBg="var(--red)";lCol="#fff";}
                        return(
                          <div key={oi} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:bg,border:"1.5px solid "+border,marginBottom:6}}>
                            <div style={{width:24,height:24,borderRadius:6,background:lBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:lCol,flexShrink:0}}>
                              {isCorrectOpt?"✓":wasSelected?"✗":["A","B","C","D"][oi]}
                            </div>
                            <span style={{fontSize:13,fontWeight:isCorrectOpt?700:400,color:isCorrectOpt?"var(--green)":wasSelected&&!isCorrectOpt?"var(--red)":"var(--tx)"}}>{opt}</span>
                            {isCorrectOpt&&<span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:"var(--green)"}}>CORRECT</span>}
                            {wasSelected&&!isCorrectOpt&&<span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:"var(--red)"}}>YOUR ANSWER</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div style={{background:"linear-gradient(135deg,#F0FDF4,#ECFDF5)",border:"1.5px solid #86EFAC",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--green)",marginBottom:5}}>💡 SOLUTION</div>
                      <div style={{fontSize:13,color:"var(--tx)",lineHeight:1.65}}>{q.exp}</div>
                    </div>

                    {/* NCERT Source */}
                    <div style={{background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:10,padding:"10px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:16,flexShrink:0}}>📚</span>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:"#4338CA",marginBottom:2}}>NCERT SOURCE</div>
                        <div style={{fontSize:11,color:"#4338CA",lineHeight:1.5}}>{src}</div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          <button onClick={onBack} style={{width:"100%",padding:"13px",background:"var(--grad)",border:"none",borderRadius:14,color:"#fff",fontWeight:700,fontSize:15}}>← Back to Results</button>
        </div>
      </div>
    </div>
  );
}

function ResultsScreen({result,questions,onHome,onRetry}){
  const {score,total,ptsEarned,timeUsed,answers}=result;
  const pct=Math.round((score/total)*100);
  const rank=Math.max(1,Math.round(10000-(pct/100)*9200+Math.random()*300));
  const beat=Math.round((1-rank/10000)*10000);
  const grade=pct>=90?{label:"Champion 🏆",c:"var(--green)"}:pct>=75?{label:"Strong 💪",c:"var(--cyan)"}:pct>=60?{label:"Average 📈",c:"var(--amber)"}:{label:"Keep Going 📚",c:"var(--orange)"};
  const [animPct,setAnimPct]=useState(0);
  const [confetti,setConfetti]=useState(false);
  const [showSolutions,setShowSolutions]=useState(false);
  const wrongTopics=Object.values(answers||{}).filter(a=>!a.correct).map(a=>a.topicTag);
  const topicCounts={};wrongTopics.forEach(t=>topicCounts[t]=(topicCounts[t]||0)+1);
  useEffect(()=>{setConfetti(true);setTimeout(()=>setConfetti(false),1500);const start=Date.now();const tick=()=>{const p=Math.min((Date.now()-start)/1200,1);setAnimPct(Math.round((1-Math.pow(1-p,3))*pct));if(p<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);},[]);

  if(showSolutions) return <SolutionsReview questions={questions||[]} answers={answers} onBack={()=>setShowSolutions(false)}/>;

  return(
    <div style={{minHeight:"100vh",paddingBottom:40,position:"relative"}}>
      <Confetti show={confetti}/>
      <BlobBg/>
      <div style={{position:"relative",zIndex:1,padding:"52px 18px 24px"}}>
        <Card style={{padding:"28px 20px",marginBottom:16,textAlign:"center"}}>
          <div style={{fontWeight:900,fontSize:80,lineHeight:1,color:"var(--orange)",letterSpacing:-2}}>{animPct}<span style={{fontSize:40}}>%</span></div>
          <div style={{display:"inline-block",marginTop:10,padding:"7px 20px",borderRadius:20,background:"var(--grad)",color:"#fff",fontSize:15,fontWeight:700}}>{grade.label}</div>
          <div style={{fontSize:14,color:"var(--sub)",marginTop:10}}>{score}/{total} correct · {Math.floor(timeUsed/60)}m {timeUsed%60}s</div>
        </Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <Card style={{padding:"16px",textAlign:"center"}}><div style={{fontSize:26,fontWeight:900,color:"var(--orange)"}}>+{ptsEarned}</div><div style={{fontSize:11,color:"var(--sub)",marginTop:2,fontWeight:600}}>Points Earned</div></Card>
          <Card style={{padding:"16px",textAlign:"center"}}><div style={{fontSize:26,fontWeight:900,color:"var(--pink)"}}>#{rank.toLocaleString()}</div><div style={{fontSize:11,color:"var(--sub)",marginTop:2,fontWeight:600}}>National Rank</div></Card>
        </div>
        <Card style={{padding:"18px 16px",marginBottom:16,background:"linear-gradient(135deg,#FFF0E8,#FFE4F3)",border:"1.5px solid #FFD0B0"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:"var(--sub)",marginBottom:4}}>You beat</div>
            <div style={{fontSize:44,fontWeight:900,color:"var(--orange)",lineHeight:1}}>{beat.toLocaleString()}</div>
            <div style={{fontSize:15,fontWeight:600,color:"var(--sub)"}}>students in this topic 🏆</div>
          </div>
        </Card>
        {Object.keys(topicCounts).length>0&&(
          <Card style={{padding:"16px",marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>📍 Focus Areas</div>
            {Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t,c])=>(
              <div key={t} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontSize:13}}>{t}</span><span style={{fontSize:12,fontWeight:700,color:"var(--red)"}}>{c} wrong</span>
              </div>
            ))}
          </Card>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* Solutions button — prominent */}
          <button onClick={()=>setShowSolutions(true)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#EEF2FF,#E0E7FF)",border:"2px solid #C7D2FE",borderRadius:14,color:"#4338CA",fontWeight:800,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            📖 Review Full Solutions &amp; NCERT Sources
          </button>
          <button onClick={onRetry} style={{width:"100%",padding:"13px",background:"var(--grad)",border:"none",borderRadius:14,color:"#fff",fontWeight:700,fontSize:15}}>🔄 Try Another Mock</button>
          <button onClick={onHome} style={{width:"100%",padding:"13px",background:"transparent",border:"1.5px solid var(--orange)",borderRadius:14,color:"var(--orange)",fontWeight:700,fontSize:14}}>🏠 Back to Home</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   FEYNMAN AI TUTOR
══════════════════════════════════════ */
/* FeynmanTutor removed — merged into DoubtScreen */



/* ══════════════════════════════════════
   KNOWLEDGE BASE UPDATER (in Profile)
══════════════════════════════════════ */
function KBModal({kb,onAdd,onClose}){
  const [q,setQ]=useState("");
  const [opts,setOpts]=useState(["","","",""]);
  const [ans,setAns]=useState(0);
  const [exp,setExp]=useState("");
  const [tag,setTag]=useState("Rotational Motion");
  const [diff,setDiff]=useState("medium");
  const [pts,setPts]=useState(150);
  const [success,setSuccess]=useState(false);
  const tags=["Rotational Motion","Rolling Motion","MOI","Rotational KE","Torque","Rolling Incline","Angular Momentum","Precession"];
  const valid=q.trim()&&opts.every(o=>o.trim())&&exp.trim();

  const submit=()=>{
    if(!valid) return;
    onAdd({q:q.trim(),opts,ans,exp:exp.trim(),tag,diff,pts:Number(pts)});
    setSuccess(true);
    setTimeout(()=>{setSuccess(false);setQ("");setOpts(["","","",""]);setExp("");},1400);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:"24px 24px 0 0",width:"min(430px,100vw)",maxHeight:"90vh",overflowY:"auto",padding:"20px 20px 40px",animation:"slideUp .3s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:18,fontWeight:800}}>➕ Add Question</div><div style={{fontSize:11,color:"var(--sub)"}}>Expand the knowledge base · {kb.length} questions now</div></div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",background:"#F0F0F0",border:"none",fontWeight:700}}>✕</button>
        </div>

        {success&&<div style={{padding:"12px",background:"#F0FDF4",border:"1.5px solid var(--green)",borderRadius:10,marginBottom:12,textAlign:"center",fontWeight:700,color:"var(--green)",animation:"fadeUp .3s ease"}}>✅ Question added! KB now has {kb.length+1} questions.</div>}

        {/* Question */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:700,color:"var(--sub)",display:"block",marginBottom:5}}>QUESTION *</label>
          <textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Type the full question…" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border)",fontSize:13,fontFamily:"var(--font)",resize:"vertical",minHeight:70,outline:"none"}}/>
        </div>

        {/* Options */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:700,color:"var(--sub)",display:"block",marginBottom:5}}>OPTIONS * (tap letter to mark correct answer)</label>
          {opts.map((o,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,alignItems:"center"}}>
              <button onClick={()=>setAns(i)} style={{width:30,height:30,borderRadius:8,background:ans===i?"var(--grad)":"#F0F0F0",border:"none",fontWeight:800,fontSize:12,color:ans===i?"#fff":"var(--sub)",flexShrink:0}}>{"ABCD"[i]}</button>
              <input value={o} onChange={e=>{const n=[...opts];n[i]=e.target.value;setOpts(n);}} placeholder={`Option ${["A","B","C","D"][i]}`} style={{flex:1,padding:"8px 12px",borderRadius:9,border:"1.5px solid "+(ans===i?"#86EFAC":"var(--border)"),fontSize:13,fontFamily:"var(--font)",outline:"none"}}/>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,fontWeight:700,color:"var(--sub)",display:"block",marginBottom:5}}>EXPLANATION / SOLUTION *</label>
          <textarea value={exp} onChange={e=>setExp(e.target.value)} placeholder="Explain the correct answer with derivation…" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid var(--border)",fontSize:13,fontFamily:"var(--font)",resize:"vertical",minHeight:60,outline:"none"}}/>
        </div>

        {/* Meta */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",display:"block",marginBottom:4}}>TOPIC</label>
            <select value={tag} onChange={e=>setTag(e.target.value)} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:11,fontFamily:"var(--font)",outline:"none"}}>
              {tags.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",display:"block",marginBottom:4}}>DIFFICULTY</label>
            <select value={diff} onChange={e=>setDiff(e.target.value)} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:11,fontFamily:"var(--font)",outline:"none"}}>
              {["easy","medium","hard"].map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--sub)",display:"block",marginBottom:4}}>POINTS</label>
            <select value={pts} onChange={e=>setPts(e.target.value)} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:"1.5px solid var(--border)",fontSize:11,fontFamily:"var(--font)",outline:"none"}}>
              {[100,150,200].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <button onClick={submit} disabled={!valid} style={{width:"100%",padding:"13px",background:valid?"var(--grad)":"#E5E7EB",border:"none",borderRadius:14,color:valid?"#fff":"var(--sub)",fontWeight:700,fontSize:15,transition:"all .2s"}}>
          ➕ Add to Knowledge Base
        </button>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════
   NEET MOCK TEST — Full 200Q Exam
   Physics: 50Q | Chemistry: 50Q | Biology: 100Q
   Timer: 200 minutes | Marking: +4/-1
══════════════════════════════════════ */
function NeetMockScreen({onFinish, onBack}) {
  const SECTIONS = {
    Physics:   { color:"#FF6B35", bg:"#FFF0E8", icon:"⚛️",  total:50 },
    Chemistry: { color:"#E91E8C", bg:"#FFE4F3", icon:"🧪",  total:50 },
    Biology:   { color:"#22C55E", bg:"#F0FDF4", icon:"🌿", total:100 },
  };
  const TOTAL_TIME = 200 * 60; // 200 minutes in seconds
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({}); // {qIndex: answerIndex or null}
  const [currentSection, setCurrentSection] = useState("Physics");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [mockFullscreen, setMockFullscreen] = useState(null);
  const [showMockReport, setShowMockReport] = useState(false);
  const [mockReportedQs, setMockReportedQs] = useState(new Set());
  const [markedForReview, setMarkedForReview] = useState({});

  // Build 200Q paper on mount
  useEffect(() => {
    const phyQs  = getRandom(50,  { subject:"Physics"   }).map((q,i) => ({...q, _section:"Physics",   _idx:i}));
    const chemQs = getRandom(50,  { subject:"Chemistry" }).map((q,i) => ({...q, _section:"Chemistry", _idx:i}));
    const bioQs  = getRandom(100, { subject:"Biology"   }).map((q,i) => ({...q, _section:"Biology",   _idx:i}));
    setQuestions({ Physics:phyQs, Chemistry:chemQs, Biology:bioQs });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!questions || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [questions, submitted]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${m}:${String(s).padStart(2,'0')}`;
  };

  const getGlobalIdx = (section, idx) => {
    const offsets = { Physics:0, Chemistry:50, Biology:100 };
    return offsets[section] + idx;
  };

  const answerKey = (section, idx) => `${section}_${idx}`;

  const selectAnswer = (ansIdx) => {
    const key = answerKey(currentSection, currentIdx);
    setAnswers(prev => ({ ...prev, [key]: ansIdx }));
  };

  const toggleReview = () => {
    const key = answerKey(currentSection, currentIdx);
    setMarkedForReview(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => {
    if (!questions) return;
    // Calculate scores
    let totalScore = 0;
    let correct = 0, wrong = 0, skipped = 0;
    const bySubject = {};

    Object.entries(questions).forEach(([subj, qs]) => {
      bySubject[subj] = { correct:0, wrong:0, skipped:0, score:0, total:qs.length };
      qs.forEach((q, idx) => {
        const key = answerKey(subj, idx);
        const selected = answers[key];
        if (selected === undefined || selected === null) {
          skipped++;
          bySubject[subj].skipped++;
        } else if (selected === q.ans) {
          correct++;
          totalScore += 4;
          bySubject[subj].correct++;
          bySubject[subj].score += 4;
        } else {
          wrong++;
          totalScore -= 1;
          bySubject[subj].wrong++;
          bySubject[subj].score -= 1;
        }
      });
    });

    // Weak chapters analysis
    const chapterErrors = {};
    Object.entries(questions).forEach(([subj, qs]) => {
      qs.forEach((q, idx) => {
        const key = answerKey(subj, idx);
        const selected = answers[key];
        if (selected !== undefined && selected !== q.ans) {
          const ch = q.chapter || subj;
          chapterErrors[ch] = (chapterErrors[ch] || 0) + 1;
        }
      });
    });

    const weakChapters = Object.entries(chapterErrors)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 5)
      .map(([ch, cnt]) => ({ chapter:ch, wrong:cnt }));

    // Rank estimate (NEET 2024 had ~23L candidates, cutoff ~700/720)
    const maxScore = 720;
    const percentile = Math.min(99.9, Math.max(0.1, (totalScore / maxScore) * 100));
    const rankEstimate = Math.max(1, Math.round(2300000 * (1 - percentile/100)));

    const timeUsed = TOTAL_TIME - timeLeft;

    onFinish({
      totalScore,
      maxScore,
      correct,
      wrong,
      skipped,
      timeUsed,
      bySubject,
      weakChapters,
      rankEstimate,
      percentile: Math.round(percentile * 10) / 10,
      questions,
      answers,
    });
  };

  if (!questions) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:32}}>📋</div>
      <div style={{fontSize:16,fontWeight:700,color:"var(--orange)"}}>Building your NEET Mock...</div>
      <div style={{fontSize:13,color:"var(--sub)"}}>Selecting 200 questions</div>
    </div>
  );

  const currentQs = questions[currentSection];
  const q = currentQs[currentIdx];
  const currentKey = answerKey(currentSection, currentIdx);
  const selectedAns = answers[currentKey];
  const isReview = markedForReview[currentKey];

  // Stats for header
  const totalAnswered = Object.keys(answers).length;
  const totalReview   = Object.keys(markedForReview).filter(k => markedForReview[k]).length;
  const timerColor = timeLeft < 600 ? "#EF4444" : timeLeft < 1800 ? "#FF9500" : "#22C55E";

  return (
    <div style={{minHeight:"100vh",background:"#F7F8FC",paddingBottom:0}}>
      {/* Header */}
      <div style={{background:"#1E1B4B",padding:"44px 16px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:600}}>NEET MOCK TEST</div>
            <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>Q{getGlobalIdx(currentSection,currentIdx)+1} of 200</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:timerColor,fontFamily:"monospace"}}>{formatTime(timeLeft)}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>remaining</div>
          </div>
          <button onClick={()=>setShowSubmitConfirm(true)} style={{background:"#EF4444",border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontWeight:700,fontSize:12}}>
            Submit
          </button>
        </div>
        {/* Stats row */}
        <div style={{display:"flex",gap:12,fontSize:11,color:"rgba(255,255,255,0.7)"}}>
          <span>✅ {totalAnswered} answered</span>
          <span>⏩ {200-totalAnswered} skipped</span>
          <span>🔖 {totalReview} review</span>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",background:"#fff",borderBottom:"2px solid #F0F0F0",position:"sticky",top:92,zIndex:99}}>
        {Object.entries(SECTIONS).map(([subj, meta]) => {
          const subjAnswered = questions[subj].filter((_,i) => answers[answerKey(subj,i)] !== undefined).length;
          const isActive = currentSection === subj;
          return (
            <button key={subj} onClick={() => { setCurrentSection(subj); setCurrentIdx(0); }}
              style={{flex:1,padding:"8px 4px",border:"none",background:"transparent",borderBottom:`3px solid ${isActive ? meta.color : "transparent"}`,color:isActive ? meta.color : "#999",fontWeight:700,fontSize:11,cursor:"pointer",transition:"all .2s"}}>
              {meta.icon} {subj}
              <div style={{fontSize:9,marginTop:1}}>{subjAnswered}/{meta.total}</div>
            </button>
          );
        })}
      </div>

      {/* Question */}
      <div style={{padding:"16px 16px 140px"}}>
        <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          {/* Tags */}
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{background:SECTIONS[currentSection].bg,color:SECTIONS[currentSection].color,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:8}}>{q.chapter}</span>
            {q.pyq && <span style={{background:"#FFF0E8",color:"var(--orange)",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:8}}>📋 PYQ {q.pyqYear}</span>}
            {q.diff==="hard" && <span style={{background:"#FFF5F5",color:"#EF4444",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:8}}>🔥 Hard</span>}
            {mockReportedQs.has(q.id) && <span style={{background:"#FFF5F5",color:"#EF4444",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:8}}>🚩 Reported</span>}
            <button onClick={()=>setShowMockReport(true)} style={{background:"#F9FAFB",color:"#9CA3AF",fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:8,border:"1px solid #E5E7EB",cursor:"pointer"}}>🚩 Report</button>
          </div>
          {/* SVG diagram */}
          {q.svgDiagram && (
            <>
              <div dangerouslySetInnerHTML={{__html:q.svgDiagram}}
                onClick={()=>setMockFullscreen({content:q.svgDiagram,isSvg:true,alt:q.imageAlt})}
                style={{marginBottom:6,borderRadius:8,overflow:"auto",background:"#FAFAFA",padding:8,textAlign:"center",cursor:"pointer"}}/>
              <div style={{textAlign:"center",marginBottom:10}}>
                <span style={{fontSize:11,color:"#6B7280",background:"#F3F4F6",borderRadius:20,padding:"3px 10px"}}>🔍 Tap to enlarge</span>
              </div>
            </>
          )}
          {q.hasImage && q.imageUrl && (
            <>
              <img src={q.imageUrl} alt={q.imageAlt||""} onClick={()=>setMockFullscreen({content:q.imageUrl,isSvg:false,alt:q.imageAlt})}
                style={{width:"100%",borderRadius:8,marginBottom:6,cursor:"pointer"}}/>
              <div style={{textAlign:"center",marginBottom:10}}>
                <span style={{fontSize:11,color:"#6B7280",background:"#F3F4F6",borderRadius:20,padding:"3px 10px"}}>🔍 Tap to enlarge</span>
              </div>
            </>
          )}
          {/* Question text */}
          <QuestionText text={q.q}/>
        </div>

        {/* Options */}
        {["A","B","C","D"].map((letter, i) => {
          const isSelected = selectedAns === i;
          return (
            <button key={i} onClick={() => selectAnswer(i)}
              style={{width:"100%",marginBottom:10,padding:"14px 16px",background:isSelected?"#EEF2FF":"#fff",
                border:`2px solid ${isSelected?"#4338CA":"#E5E7EB"}`,borderRadius:14,
                display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
              <div style={{width:28,height:28,borderRadius:8,background:isSelected?"#4338CA":"#F3F4F6",
                color:isSelected?"#fff":"#374151",fontWeight:700,fontSize:13,display:"flex",
                alignItems:"center",justifyContent:"center",flexShrink:0}}>{letter}</div>
              <div style={{fontSize:14,color:"#1F2937",lineHeight:1.5,paddingTop:4}}>{q.opts[i]}</div>
            </button>
          );
        })}

        {/* Navigation */}
        <div style={{display:"flex",gap:10,marginTop:6}}>
          <button onClick={toggleReview}
            style={{flex:1,padding:"12px",background:isReview?"#FEF3C7":"#fff",border:`2px solid ${isReview?"#F59E0B":"#E5E7EB"}`,
              borderRadius:12,color:isReview?"#92400E":"#6B7280",fontWeight:700,fontSize:13}}>
            {isReview ? "🔖 Marked" : "🔖 Mark Review"}
          </button>
          <button onClick={() => {
            if (currentIdx < currentQs.length - 1) setCurrentIdx(i => i+1);
            else {
              const sections = Object.keys(SECTIONS);
              const nextSection = sections[sections.indexOf(currentSection)+1];
              if (nextSection) { setCurrentSection(nextSection); setCurrentIdx(0); }
            }
          }} style={{flex:2,padding:"12px",background:"#1E1B4B",border:"none",borderRadius:12,color:"#fff",fontWeight:700,fontSize:13}}>
            Next →
          </button>
        </div>

        {/* Question palette */}
        <div style={{background:"#fff",borderRadius:16,padding:14,marginTop:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Question Palette — {currentSection}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {currentQs.map((_,i) => {
              const key = answerKey(currentSection, i);
              const answered = answers[key] !== undefined;
              const review   = markedForReview[key];
              const isCurr   = i === currentIdx;
              const bg = isCurr ? "#1E1B4B" : review ? "#F59E0B" : answered ? "#22C55E" : "#F3F4F6";
              const color = isCurr||review||answered ? "#fff" : "#374151";
              return (
                <button key={i} onClick={() => setCurrentIdx(i)}
                  style={{width:36,height:36,borderRadius:8,background:bg,color,border:"none",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                  {i+1}
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:10,fontSize:11,color:"#6B7280"}}>
            <span>🟢 Answered</span><span>⬛ Not answered</span><span>🟡 Review</span>
          </div>
        </div>
      </div>

      {mockFullscreen&&<FullscreenImage content={mockFullscreen.content} isSvg={mockFullscreen.isSvg} alt={mockFullscreen.alt} onClose={()=>setMockFullscreen(null)}/>}
      {showMockReport&&<ReportModal question={q} onClose={()=>setShowMockReport(false)} onSubmit={reason=>{setMockReportedQs(s=>new Set([...s,q.id]));try{const e=JSON.parse(localStorage.getItem('bb_reports')||'[]');e.push({id:q.id,subject:q.subject,chapter:q.chapter,q:q.q?.slice(0,120),reason,timestamp:new Date().toISOString()});localStorage.setItem('bb_reports',JSON.stringify(e));}catch(e){}}}/>}

      {/* Submit confirm modal */}
      {showSubmitConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999,display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#fff",borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:430,margin:"0 auto"}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>Submit Mock Test?</div>
            <div style={{fontSize:14,color:"#6B7280",marginBottom:16}}>
              Answered: {totalAnswered}/200 · Unattempted: {200-totalAnswered}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowSubmitConfirm(false)}
                style={{flex:1,padding:13,background:"#F3F4F6",border:"none",borderRadius:12,fontWeight:700,fontSize:14,color:"#374151"}}>
                Continue Exam
              </button>
              <button onClick={handleSubmit}
                style={{flex:1,padding:13,background:"#EF4444",border:"none",borderRadius:12,fontWeight:700,fontSize:14,color:"#fff"}}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   NEET MOCK RESULTS
══════════════════════════════════════ */
function NeetMockResults({result, onHome, onRetry}) {
  const { totalScore, maxScore, correct, wrong, skipped, timeUsed,
          bySubject, weakChapters, rankEstimate, percentile } = result;
  const pct = Math.round((totalScore / maxScore) * 100);
  const grade = totalScore >= 600 ? "🏆 Outstanding" : totalScore >= 500 ? "💪 Strong" :
                totalScore >= 360 ? "📈 Average"     : "📚 Keep Practicing";
  const gradeColor = totalScore >= 600 ? "#22C55E" : totalScore >= 500 ? "#00B4D8" :
                     totalScore >= 360 ? "#FF9500"  : "#EF4444";
  const [animScore, setAnimScore] = useState(0);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2000);
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now()-start)/1500, 1);
      setAnimScore(Math.round((1-Math.pow(1-p,3)) * totalScore));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const formatTime = (secs) => `${Math.floor(secs/60)}m ${secs%60}s`;

  return (
    <div style={{minHeight:"100vh",paddingBottom:40,position:"relative",background:"#F7F8FC"}}>
      <Confetti show={confetti}/>
      <div style={{padding:"52px 18px 24px"}}>
        {/* Score card */}
        <div style={{background:"linear-gradient(135deg,#1E1B4B,#4338CA)",borderRadius:24,padding:"28px 20px",marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:700,letterSpacing:2,marginBottom:8}}>NEET MOCK SCORE</div>
          <div style={{fontSize:72,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:-2}}>{animScore}<span style={{fontSize:32,color:"rgba(255,255,255,0.6)"}}>/{maxScore}</span></div>
          <div style={{display:"inline-block",marginTop:10,padding:"6px 20px",borderRadius:20,background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:15,fontWeight:700}}>{grade}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:8}}>Time: {formatTime(timeUsed)} · Percentile: {percentile}%</div>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
          {[
            {val:correct,   label:"Correct",   color:"#22C55E", bg:"#F0FDF4"},
            {val:wrong,     label:"Wrong",     color:"#EF4444", bg:"#FFF5F5"},
            {val:skipped,   label:"Skipped",   color:"#6B7280", bg:"#F3F4F6"},
          ].map((s,i) => (
            <div key={i} style={{background:s.bg,borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:11,color:"#6B7280",fontWeight:600,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Rank estimate */}
        <div style={{background:"linear-gradient(135deg,#FFF0E8,#FFE4F3)",borderRadius:16,padding:"18px 16px",marginBottom:16,border:"1.5px solid #FFD0B0"}}>
          <div style={{fontSize:12,color:"#92400E",fontWeight:700,marginBottom:4}}>📊 ESTIMATED NEET RANK</div>
          <div style={{fontSize:40,fontWeight:900,color:"var(--orange)",lineHeight:1}}>#{rankEstimate.toLocaleString()}</div>
          <div style={{fontSize:13,color:"#6B7280",marginTop:4}}>Out of ~23 lakh candidates · Based on your score</div>
        </div>

        {/* Subject-wise breakdown */}
        <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:14}}>📚 Subject-wise Performance</div>
          {Object.entries(bySubject).map(([subj, data]) => {
            const subjPct = Math.round((data.correct / data.total) * 100);
            const colors = {Physics:"#FF6B35",Chemistry:"#E91E8C",Biology:"#22C55E"};
            const color = colors[subj] || "#6B7280";
            return (
              <div key={subj} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontWeight:700,fontSize:13}}>{subj}</span>
                  <span style={{fontSize:12,color:"#6B7280"}}>{data.correct}✅ {data.wrong}❌ {data.skipped}⏩ · Score: <b style={{color}}>{data.score}</b></span>
                </div>
                <div style={{height:6,background:"#F0F0F0",borderRadius:3}}>
                  <div style={{height:"100%",width:`${subjPct}%`,background:color,borderRadius:3,transition:"width .8s ease"}}/>
                </div>
                <div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>{subjPct}% accuracy</div>
              </div>
            );
          })}
        </div>

        {/* Weak chapters */}
        {weakChapters.length > 0 && (
          <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>⚠️ Chapters to Focus On</div>
            {weakChapters.map((ch, i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<weakChapters.length-1?"1px solid #F0F0F0":"none"}}>
                <span style={{fontSize:13,fontWeight:600}}>{ch.chapter}</span>
                <span style={{fontSize:12,fontWeight:700,color:"#EF4444",background:"#FFF5F5",padding:"3px 10px",borderRadius:8}}>{ch.wrong} wrong</span>
              </div>
            ))}
          </div>
        )}

        {/* Marking scheme breakdown */}
        <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>🧮 Score Breakdown</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:13,color:"#22C55E"}}>+4 × {correct} correct</span>
            <span style={{fontSize:13,fontWeight:700,color:"#22C55E"}}>+{correct*4}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:13,color:"#EF4444"}}>-1 × {wrong} wrong</span>
            <span style={{fontSize:13,fontWeight:700,color:"#EF4444"}}>-{wrong}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",borderTop:"1px solid #F0F0F0",paddingTop:8}}>
            <span style={{fontSize:14,fontWeight:700}}>Final Score</span>
            <span style={{fontSize:14,fontWeight:900,color:"#4338CA"}}>{totalScore}/{maxScore}</span>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={onRetry} style={{padding:14,background:"linear-gradient(135deg,#1E1B4B,#4338CA)",border:"none",borderRadius:14,color:"#fff",fontWeight:700,fontSize:15}}>
            🔄 Take Another Mock
          </button>
          <button onClick={onHome} style={{padding:13,background:"transparent",border:"1.5px solid var(--orange)",borderRadius:14,color:"var(--orange)",fontWeight:700,fontSize:14}}>
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════
   CHAPTER SELECT SCREEN
══════════════════════════════════════ */
function ChapterSelectScreen({subject, onChapter, onBack}) {
  const meta = {
    Physics:   {icon:"⚛️", color:"#FF6B35", bg:"#FFF0E8"},
    Chemistry: {icon:"🧪", color:"#E91E8C", bg:"#FFE4F3"},
    Biology:   {icon:"🌿", color:"#22C55E", bg:"#F0FDF4"},
  }[subject] || {icon:"📚", color:"#6B7280", bg:"#F3F4F6"};

  const chapters = getChaptersForSubject(subject);
  const qCountByChapter = {};
  chapters.forEach(ch => {
    qCountByChapter[ch] = QB.filter(q => q.subject===subject && q.chapter===ch).length;
  });

  return (
    <div style={{minHeight:"100vh",background:"#F7F8FC",paddingBottom:40}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${meta.color},${meta.color}cc)`,padding:"44px 16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
          <button onClick={onBack}
            style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:10,
              width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",
              color:"#fff",fontSize:18,cursor:"pointer"}}>←</button>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>{meta.icon} {subject}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>{chapters.length} chapters · Tap to practice</div>
          </div>
        </div>
      </div>

      {/* All subjects practice button */}
      <div style={{padding:"16px 16px 0"}}>
        <button onClick={()=>onChapter(null)}
          style={{width:"100%",padding:"14px 16px",background:`linear-gradient(135deg,${meta.color},${meta.color}99)`,
            border:"none",borderRadius:14,color:"#fff",fontWeight:800,fontSize:15,
            display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:16}}>
          <span>⚡ Practice All {subject}</span>
          <span style={{fontSize:13,opacity:0.8}}>{QB.filter(q=>q.subject===subject).length} questions →</span>
        </button>

        {/* Chapter list */}
        <div style={{fontSize:13,fontWeight:700,color:"#6B7280",marginBottom:10,letterSpacing:1,textTransform:"uppercase"}}>
          By Chapter
        </div>
        {chapters.map((ch, i) => {
          const count = qCountByChapter[ch] || 0;
          const hasPYQ = QB.some(q => q.subject===subject && q.chapter===ch && q.pyq);
          return (
            <button key={i} onClick={()=>onChapter(ch)}
              style={{width:"100%",padding:"14px 16px",background:"#fff",border:"1.5px solid #E5E7EB",
                borderRadius:14,display:"flex",alignItems:"center",justifyContent:"space-between",
                cursor:"pointer",marginBottom:10,textAlign:"left",transition:"all .15s"}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#1F2937",marginBottom:2}}>{ch}</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {hasPYQ && <span style={{fontSize:10,background:"#FFF0E8",color:"var(--orange)",
                    padding:"2px 6px",borderRadius:6,fontWeight:700}}>📋 PYQ</span>}
                </div>
              </div>
              <span style={{color:meta.color,fontSize:18}}>›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   ROOT APP
══════════════════════════════════════ */

/* ══════════════════════════════════════
   DASHBOARD SCREEN
══════════════════════════════════════ */
function DashboardScreen({score,rank,streak,accuracy,userStats,uid,onBack}){
  const [analytics,setAnalytics]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const fetchAnalytics=async()=>{
      const userId=localStorage.getItem("bb_uid");
      if(userId){
        try{
          const token=localStorage.getItem("bb_auth_token")||"brainbattle-dev-key";
          const res=await fetch(`https://brainbattle-rag-production.up.railway.app/user-analytics/${userId}`,{
            headers:{"X-App-Token":token}
          });
          if(res.ok){
            const data=await res.json();
            if(data.total_questions>0) setAnalytics(data);
          }
        }catch(e){console.log("Analytics fetch failed:",e);}
      }
      setLoading(false);
    };
    fetchAnalytics();
  },[]);

  const subjectColors={
    Biology:"#51CF66",Chemistry:"#FFB347",Physics:"#667EEA"
  };

  const mockData={
    subjects:{
      Biology:{accuracy:0,total_qs:0,correct:0,study_mins:0},
      Chemistry:{accuracy:0,total_qs:0,correct:0,study_mins:0},
      Physics:{accuracy:0,total_qs:0,correct:0,study_mins:0},
    },
    weak_chapters:[],
    total_study_hours:0,
    overall_accuracy:0,
    total_questions:0,
  };

  const data = analytics || mockData;

  return(
    <div style={{minHeight:"100vh",background:"#FFF9F0",paddingBottom:100}}>
      <style>{`@keyframes dashFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{background:"#fff",padding:"44px 20px 16px",borderBottom:"1px solid #F0EBE0"}}>
        <button onClick={onBack} style={{background:"rgba(102,126,234,.1)",border:"none",borderRadius:12,width:36,height:36,color:"#667EEA",fontSize:16,cursor:"pointer",marginBottom:12}}>←</button>
        <div style={{fontSize:22,fontWeight:900,color:"#1A1A2E"}}>My Progress 📊</div>
        <div style={{fontSize:12,color:"#9CA3AF",fontWeight:600,marginTop:2}}>Based on your practice sessions</div>
      </div>

      <div style={{padding:"16px 20px 0"}}>

        {/* Overall Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16,animation:"dashFade .3s ease both"}}>
          <div style={{background:"linear-gradient(135deg,#667EEA,#764BA2)",borderRadius:24,padding:"18px 16px",color:"#fff",boxShadow:"0 8px 24px rgba(102,126,234,.35)"}}>
            <div style={{fontSize:11,fontWeight:700,opacity:.8,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Overall Accuracy</div>
            <div style={{fontSize:42,fontWeight:900,lineHeight:1}}>{data.overall_accuracy}%</div>
            <div style={{fontSize:11,opacity:.7,marginTop:4}}>{data.total_questions} questions attempted</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{background:"#fff",borderRadius:18,padding:"12px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.06)",flex:1}}>
              <div style={{fontSize:10,color:"#9CA3AF",fontWeight:700,textTransform:"uppercase"}}>Study Hours</div>
              <div style={{fontSize:24,fontWeight:900,color:"#FF6B6B",marginTop:2}}>{data.total_study_hours}h</div>
            </div>
            <div style={{background:"#fff",borderRadius:18,padding:"12px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.06)",flex:1}}>
              <div style={{fontSize:10,color:"#9CA3AF",fontWeight:700,textTransform:"uppercase"}}>Global Rank</div>
              <div style={{fontSize:24,fontWeight:900,color:"#667EEA",marginTop:2}}>#{rank}</div>
            </div>
          </div>
        </div>

        {/* Subject Accuracy Cards */}
        <div style={{background:"#fff",borderRadius:24,padding:"16px 18px",marginBottom:16,boxShadow:"0 4px 12px rgba(0,0,0,.06)",animation:"dashFade .3s .05s ease both"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1A1A2E",marginBottom:14}}>Subject Performance</div>
          {Object.entries(data.subjects).map(([subj,s],i)=>{
            const color=subjectColors[subj]||"#667EEA";
            return(
              <div key={i} style={{marginBottom:i<2?16:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>
                    <span style={{fontSize:13,fontWeight:700,color:"#1A1A2E"}}>{subj}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:"#9CA3AF",fontWeight:600}}>{s.correct}/{s.total_qs}</span>
                    <span style={{fontSize:14,fontWeight:900,color:color}}>{s.accuracy}%</span>
                  </div>
                </div>
                <div style={{height:8,background:"#F3F4F6",borderRadius:4}}>
                  <div style={{height:"100%",width:`${s.accuracy}%`,background:color,borderRadius:4,transition:"width 1s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Weakness Heatmap */}
        <div style={{background:"#fff",borderRadius:24,padding:"16px 18px",marginBottom:16,boxShadow:"0 4px 12px rgba(0,0,0,.06)",animation:"dashFade .3s .1s ease both"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1A1A2E",marginBottom:4}}>🔥 Weak Areas</div>
          <div style={{fontSize:11,color:"#9CA3AF",fontWeight:600,marginBottom:14}}>Chapters needing most attention</div>
          {data.weak_chapters.map((ch,i)=>{
            const intensity=Math.round((100-ch.accuracy)/100*255);
            const bg=`rgba(239,68,68,${0.08+((100-ch.accuracy)/100)*0.25})`;
            const color=ch.accuracy<40?"#DC2626":ch.accuracy<50?"#F97316":"#F59E0B";
            return(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:bg,borderRadius:14,marginBottom:8,border:`1px solid ${color}33`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#1A1A2E"}}>{ch.chapter}</div>
                  <div style={{fontSize:10,color:"#9CA3AF",fontWeight:600,marginTop:1}}>{ch.subject} · {ch.attempts} attempts</div>
                </div>
                <div style={{fontSize:18,fontWeight:900,color}}>{ch.accuracy}%</div>
              </div>
            );
          })}
        </div>

        {/* Weakness Heatmap */}
        <div style={{background:"#fff",borderRadius:24,padding:"16px 18px",marginBottom:16,boxShadow:"0 4px 12px rgba(0,0,0,.06)",animation:"dashFade .3s .1s ease both"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1A1A2E",marginBottom:4}}>🔥 Weak Areas — Fix These First</div>
          <div style={{fontSize:11,color:"#9CA3AF",fontWeight:600,marginBottom:14}}>Chapters with accuracy below 50%</div>
          {data.weak_chapters.length===0?(
            <div style={{textAlign:"center",padding:"20px 0",color:"#51CF66",fontWeight:700,fontSize:14}}>✅ No weak chapters! Keep it up!</div>
          ):(
            data.weak_chapters.map((ch,i)=>{
              const color=ch.accuracy<40?"#DC2626":ch.accuracy<50?"#F97316":"#F59E0B";
              const bg=`rgba(${ch.accuracy<40?"239,68,68":ch.accuracy<50?"249,115,22":"245,158,11"},${0.08+((100-ch.accuracy)/100)*0.15})`;
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1A1A2E"}}>{ch.chapter}</div>
                      <div style={{fontSize:10,color:"#9CA3AF",fontWeight:600}}>{ch.subject} · {ch.attempts} attempts</div>
                    </div>
                    <div style={{fontSize:18,fontWeight:900,color,minWidth:40,textAlign:"right"}}>{ch.accuracy}%</div>
                  </div>
                  <div style={{height:8,background:"#F3F4F6",borderRadius:4}}>
                    <div style={{height:"100%",width:`${ch.accuracy}%`,background:color,borderRadius:4,transition:"width 1s ease"}}/>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Study Streak */}
        <div style={{background:"linear-gradient(135deg,#FFF9C4,#FFE082)",borderRadius:24,padding:"16px 18px",boxShadow:"0 4px 0 #FFD54F,0 8px 20px rgba(255,193,7,.2)",animation:"dashFade .3s .15s ease both"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:40}}>🔥</div>
            <div>
              <div style={{fontSize:22,fontWeight:900,color:"#5D4037"}}>{streak} Day Streak!</div>
              <div style={{fontSize:12,color:"#8D6E63",fontWeight:600,marginTop:2}}>Keep going — consistency beats cramming</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════
   LOGIN SCREEN
══════════════════════════════════════ */
function LoginScreen({onLogin}){
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handleGoogle=async()=>{
    setLoading(true);
    setError("");
    try{
      const result = await signInWithGoogle();
      if(result) onLogin(result);
      // null = either redirect is in progress (page will reload)
      // or user cancelled — just reset loading
      else setLoading(false);
    }catch(e){
      console.error("Sign in error:",e);
      // auth/popup-blocked: popup was blocked by browser
      if(e.code==="auth/popup-blocked"){
        setError("⚠️ Popups are blocked. Please allow popups for this site and try again.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
      setLoading(false);
    }
  };

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#667EEA,#764BA2)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",fontFamily:"var(--font)"}}>
      <style>{`@keyframes loginFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>

      {/* Logo */}
      <div style={{fontSize:80,animation:"loginFloat 3s ease infinite",marginBottom:8}}>🧠</div>
      <div style={{fontSize:32,fontWeight:900,color:"#fff",letterSpacing:-1,marginBottom:4}}>BrainBattle</div>
      <div style={{fontSize:14,color:"rgba(255,255,255,.7)",fontWeight:600,marginBottom:48}}>NEET 2026 Preparation</div>

      {/* Card */}
      <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(20px)",borderRadius:32,padding:"32px 28px",width:"100%",maxWidth:360,border:"1px solid rgba(255,255,255,0.3)"}}>
        <div style={{fontSize:20,fontWeight:900,color:"#fff",textAlign:"center",marginBottom:8}}>Get Started</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.7)",textAlign:"center",marginBottom:24,lineHeight:1.6}}>
          Sign in to track your progress, sync across devices, and access all features.
        </div>

        {/* Google Sign In */}
        <div onPointerUp={handleGoogle} style={{background:"#fff",borderRadius:16,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:12,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,0,0,.2)",opacity:loading?0.7:1,WebkitTapHighlightColor:"transparent"}}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span style={{fontSize:15,fontWeight:800,color:"#1A1A2E"}}>
            {loading ? "Signing in..." : "Continue with Google"}
          </span>
        </div>

        {error&&<div style={{color:"#FFB3B3",fontSize:12,textAlign:"center",marginTop:12}}>{error}</div>}

        <div style={{fontSize:11,color:"rgba(255,255,255,.5)",textAlign:"center",marginTop:16,lineHeight:1.6}}>
          By continuing you agree to our Terms of Service. Your data is safe and private.
        </div>
        <div onPointerUp={()=>onLogin({displayName:"Student",uid:"guest_"+Date.now()},("brainbattle-dev-key"))} style={{color:"rgba(255,255,255,.5)",fontSize:12,textAlign:"center",marginTop:12,cursor:"pointer",textDecoration:"underline"}}>
          Continue as Guest
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   ONBOARDING SLIDER
══════════════════════════════════════ */
function OnboardingScreen({onDone}){
  const [slide,setSlide]=useState(0);
  const slides=[
    {emoji:"🧠",bg:"linear-gradient(160deg,#667EEA,#764BA2)",title:"Meet Dr. Neuron",sub:"Your Feynman-style AI tutor",desc:"Ask any NEET doubt and get a vivid, analogy-first explanation — grounded in your NCERT textbook. Not a textbook. A friend who knows everything.",btn:"Next →"},
    {emoji:"📋",bg:"linear-gradient(160deg,#FF6B6B,#FFB347)",title:"Full NEET Mock Tests",sub:"200 questions · 200 minutes · Real exam feel",desc:"Physics 50 + Chemistry 50 + Biology 100. +4/-1 marking. Question palette. Timer. Rank estimate. Everything you need to be exam-ready.",btn:"Next →"},
    {emoji:"📊",bg:"linear-gradient(160deg,#51CF66,#38D9A9)",title:"Track Your Progress",sub:"Know exactly where you stand",desc:"See your accuracy by subject, find your weak chapters, and watch your streak grow. Smarter practice, not just more practice.",btn:"Let's Go! 🚀"},
  ];
  const s=slides[slide];
  const next=()=>{
    if(slide<slides.length-1) setSlide(p=>p+1);
    else onDone();
  };
  return(
    <div style={{minHeight:"100vh",background:s.bg,display:"flex",flexDirection:"column",fontFamily:"var(--font)",transition:"background .5s ease",userSelect:"none"}}>
      <style>{`
        @keyframes obFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12px) scale(1.05)}}
        @keyframes obFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{padding:"52px 20px 0",display:"flex",justifyContent:"flex-end"}}>
        <div onPointerUp={onDone} style={{background:"rgba(255,255,255,.2)",borderRadius:20,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>Skip</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px"}}>
        <div style={{fontSize:100,animation:"obFloat 3s ease infinite",marginBottom:8}}>{s.emoji}</div>
        <div key={slide} style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(20px)",borderRadius:32,padding:"28px 24px",width:"100%",maxWidth:380,border:"1px solid rgba(255,255,255,0.3)",animation:"obFade .4s ease both"}}>
          <div style={{fontSize:24,fontWeight:900,color:"#fff",marginBottom:6,textAlign:"center"}}>{s.title}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:700,textAlign:"center",marginBottom:14}}>{s.sub}</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.9)",lineHeight:1.7,textAlign:"center"}}>{s.desc}</div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:24}}>
          {slides.map((_,i)=>(
            <div key={i} style={{width:i===slide?24:8,height:8,borderRadius:4,background:i===slide?"#fff":"rgba(255,255,255,.4)",transition:"all .3s"}}/>
          ))}
        </div>
      </div>
      <div style={{padding:"0 32px 48px"}}>
        <div onPointerUp={next} style={{width:"100%",padding:"18px",background:"#fff",borderRadius:20,fontSize:16,fontWeight:900,cursor:"pointer",color:slide===0?"#667EEA":slide===1?"#FF6B6B":"#51CF66",boxShadow:"0 8px 24px rgba(0,0,0,.2)",textAlign:"center",WebkitTapHighlightColor:"transparent"}}>
          {s.btn}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PAYWALL
══════════════════════════════════════ */
function PaywallCard({onClose,onUpgrade}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:430,background:"#fff",borderRadius:"32px 32px 0 0",padding:"28px 24px 48px",animation:"slideUp .3s ease both"}}>

        {/* Handle */}
        <div style={{width:40,height:4,background:"#E5E7EB",borderRadius:2,margin:"0 auto 24px"}}/>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:8}}>⚡</div>
          <div style={{fontSize:22,fontWeight:900,color:"#1A1A2E"}}>Upgrade to Pro</div>
          <div style={{fontSize:14,color:"#6B7280",marginTop:4,fontWeight:600}}>Unlock your full NEET potential</div>
        </div>

        {/* Features */}
        {[
          ["🧠","Unlimited Dr. Neuron","Ask as many doubts as you want, anytime"],
          ["📋","Full Mock Test Access","All 9,170+ questions, detailed analytics"],
          ["📊","Advanced Analytics","Weakness heatmap, rank tracker, study insights"],
        ].map(([icon,title,desc],i)=>(
          <div key={i} style={{display:"flex",gap:14,marginBottom:16,padding:"12px 14px",background:"#F9F7FF",borderRadius:16,border:"1px solid #EDE9FE"}}>
            <div style={{fontSize:24,flexShrink:0}}>{icon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#1A1A2E"}}>{title}</div>
              <div style={{fontSize:12,color:"#6B7280",marginTop:2,fontWeight:600}}>{desc}</div>
            </div>
          </div>
        ))}

        {/* Price */}
        <div style={{background:"linear-gradient(135deg,#667EEA,#764BA2)",borderRadius:20,padding:"16px",textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Special Launch Price</div>
          <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",marginTop:4}}>
            <div style={{fontSize:20,fontWeight:600,color:"rgba(255,255,255,.5)",textDecoration:"line-through"}}>₹999</div>
            <div style={{fontSize:36,fontWeight:900,color:"#fff"}}>₹599<span style={{fontSize:16,fontWeight:600,opacity:.8}}>/month</span></div>
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>Cancel anytime · 7-day free trial · Save 40%</div>
        </div>

        <button onClick={onUpgrade} style={{width:"100%",padding:"16px",background:"linear-gradient(135deg,#667EEA,#764BA2)",border:"none",borderRadius:16,color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer",boxShadow:"0 8px 24px rgba(102,126,234,.4)",marginBottom:10}}>
          Start Free Trial 🚀
        </button>
        <div onClick={onClose} style={{width:"100%",padding:"12px",textAlign:"center",color:"#9CA3AF",fontSize:14,fontWeight:600,cursor:"pointer"}}>
          Maybe later
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PAYWALL MODAL  — Doctor Lite
══════════════════════════════════════ */
function PaywallModal({onClose, reason=""}){
  const [toast, setToast] = useState(false);
  const showToast = () => { setToast(true); setTimeout(()=>setToast(false),2800); };
  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(15,10,30,0.75)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 18px"}}>
      {toast&&(
        <div style={{position:"fixed",top:28,left:"50%",transform:"translateX(-50%)",background:"#1A1A2E",color:"#fff",padding:"11px 24px",borderRadius:22,fontWeight:700,fontSize:13,zIndex:2100,boxShadow:"0 6px 24px rgba(0,0,0,.4)",whiteSpace:"nowrap"}}>
          🚧 Razorpay integration coming soon!
        </div>
      )}
      <div style={{width:"100%",maxWidth:400,background:"#fff",borderRadius:32,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,.35)",animation:"scaleIn .22s ease both"}}>

        {/* Header band */}
        <div style={{background:"linear-gradient(135deg,#667EEA 0%,#764BA2 60%,#E91E8C 100%)",padding:"28px 24px 22px",textAlign:"center",position:"relative"}}>
          <div style={{position:"absolute",top:12,right:14,width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}} onClick={onClose}>✕</div>
          <div style={{fontSize:44,marginBottom:6}}>👨‍⚕️</div>
          <div style={{fontSize:11,fontWeight:800,color:"rgba(255,255,255,.7)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Doctor Lite Plan</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",lineHeight:1.2}}>Unlock Your Full</div>
          <div style={{fontSize:22,fontWeight:900,color:"#FFD166",lineHeight:1.2}}>NEET Potential</div>
          {reason&&<div style={{fontSize:12,color:"rgba(255,255,255,.75)",marginTop:8,lineHeight:1.5,fontWeight:500}}>{reason}</div>}
        </div>

        <div style={{padding:"20px 22px 24px"}}>
          {/* 3 core benefits */}
          {[
            {icon:"🧠", title:"Unlimited Dr. Neuron (RAG)", desc:"Ask any NEET doubt — instant NCERT-grounded answers, no daily cap"},
            {icon:"🏆", title:"All-India Rank Tracker",     desc:"See your live rank among thousands of NEET 2026 aspirants"},
            {icon:"📖", title:"Detailed Explanations",       desc:"Step-by-step solutions for every question in every mock test"},
          ].map((b,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12,padding:"12px 14px",background:"linear-gradient(135deg,#F8F7FF,#FFF0F8)",borderRadius:16,border:"1px solid #EDE9FE"}}>
              <div style={{fontSize:22,flexShrink:0,marginTop:1}}>{b.icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#1A1A2E"}}>{b.title}</div>
                <div style={{fontSize:11,color:"#6B7280",marginTop:2,lineHeight:1.4}}>{b.desc}</div>
              </div>
            </div>
          ))}

          {/* Price block */}
          <div style={{background:"#F9F7FF",border:"2px solid #EDE9FE",borderRadius:20,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,marginTop:4}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9CA3AF",letterSpacing:.5,textTransform:"uppercase"}}>Monthly Plan</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:2}}>
                <span style={{fontSize:15,color:"#D1D5DB",textDecoration:"line-through",fontWeight:500}}>₹999</span>
                <span style={{fontSize:36,fontWeight:900,color:"#7C3AED",lineHeight:1}}>₹599</span>
              </div>
              <div style={{fontSize:10,color:"#9CA3AF",marginTop:2}}>Save ₹400 · Cancel anytime</div>
            </div>
            <div style={{textAlign:"center",background:"linear-gradient(135deg,#667EEA,#764BA2)",borderRadius:14,padding:"8px 12px"}}>
              <div style={{fontSize:11,fontWeight:800,color:"#fff"}}>7-Day</div>
              <div style={{fontSize:11,fontWeight:800,color:"#FFD166"}}>FREE</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>Trial</div>
            </div>
          </div>

          <button onClick={showToast} style={{width:"100%",padding:"16px",background:"linear-gradient(135deg,#667EEA,#764BA2)",border:"none",borderRadius:16,color:"#fff",fontSize:16,fontWeight:900,cursor:"pointer",boxShadow:"0 8px 24px rgba(102,126,234,.45)",marginBottom:10,letterSpacing:.3}}>
            Pay ₹599 · Upgrade Now 🚀
          </button>
          <div onClick={onClose} style={{textAlign:"center",color:"#9CA3AF",fontSize:13,fontWeight:600,cursor:"pointer",padding:"4px 0"}}>
            Maybe later
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   DOUBT SCREEN
══════════════════════════════════════ */
/* ══════════════════════════════════════
   DR NEURON  +  DEEP DIVE (Feynman)
   Single unified screen — two modes
══════════════════════════════════════ */
const RAG_URL   = "https://brainbattle-rag-production.up.railway.app";
const APP_TOKEN = localStorage.getItem("bb_auth_token") || "brainbattle-dev-key";

// Feynman system prompt — injected into the first RAG call as context
const FEYNMAN_CONTEXT = `You are a hybrid of Richard Feynman (master of intuition) and a Top NEET Faculty Member for NEET 2026. Follow this 4-phase teaching loop STRICTLY — ONE PHASE PER REPLY, then STOP and WAIT for the student's response before proceeding.

PHASE 1 — ANALOGICAL INSIGHT: Use a real-life analogy only. No formulas. No NCERT terms. End EXACTLY with: "💡 Does this analogy make sense? Reply YES to continue, or ask me to change it." Then STOP.

PHASE 2 — TECHNICAL BREAKDOWN (only after student replies to Phase 1): Give the formal NCERT definition, SI units, and primary formula. Cite the exact chapter and class. End EXACTLY with: "🔬 Active Recall Check: [one conceptual question]" Then STOP. Do NOT write Phase 3 until the student answers.

PHASE 3 — NEET CATCH (only after student answers Phase 2): Reveal the NTA exam trap or high-yield twist (Rain-Man, River-crossing, Assertion-Reason traps). End with another Active Recall Check. Then STOP.

PHASE 4 — KNOWLEDGE CHECK (only after student answers Phase 3): Give ONE Assertion-Reason MCQ:
"📝 Assertion (A): [statement]
Reason (R): [statement]
(a) Both true, R explains A  (b) Both true, R does NOT explain A  (c) A true R false  (d) A false R true"
Wait for answer, then explain each option.

RULES: FORBIDDEN to dump multiple phases at once. If student says "okay/next/continue" without answering, repeat the question. Use NCERT only. Keep each reply under 180 words. Use $...$ for inline math.`;

function DrNeuron({mood="idle"}){
  const eyes={
    idle:{l:"M8,10 Q10,8 12,10",r:"M18,10 Q20,8 22,10",mouth:"M11,16 Q15,19 19,16"},
    thinking:{l:"M8,9 Q10,12 12,9",r:"M18,9 Q20,9 22,9",mouth:"M12,16 Q15,15 18,16"},
    happy:{l:"M8,10 Q10,7 12,10",r:"M18,10 Q20,7 22,10",mouth:"M10,15 Q15,20 20,15"},
    confused:{l:"M8,10 Q10,13 12,10",r:"M18,8 Q20,11 22,8",mouth:"M11,17 Q15,15 19,17"},
  };
  const e=eyes[mood]||eyes.idle;
  return(
    <svg width="72" height="72" viewBox="0 0 40 40" fill="none">
      <ellipse cx="20" cy="22" rx="14" ry="13" fill="#FFF0C2" stroke="#FFD166" strokeWidth="1.5"/>
      <path d="M10,16 Q8,10 12,9 Q13,6 17,7 Q19,4 21,7 Q25,5 27,9 Q31,10 30,16" fill="#FFD166" stroke="#FFB347" strokeWidth="1"/>
      <path d={e.l} stroke="#5C4033" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d={e.r} stroke="#5C4033" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d={e.mouth} stroke="#5C4033" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="10" cy="17" rx="2.5" ry="1.5" fill="#FFB3C1" opacity="0.6"/>
      <ellipse cx="30" cy="17" rx="2.5" ry="1.5" fill="#FFB3C1" opacity="0.6"/>
    </svg>
  );
}

function DoubtScreen({onBack, userName="Student", initialMode="doubt", uid=null}){
  const [mode,setMode]     = useState(initialMode); // "doubt" | "feynman"

  /* ── DOUBT mode state ──────────────────── */
  const [question,setQuestion] = useState("");
  const [answer,setAnswer]     = useState(null);
  const [sources,setSources]   = useState([]);
  const [mood,setMood]         = useState("idle");
  const [dLoading,setDLoading] = useState(false);
  const [history,setHistory]   = useState([]);
  const [histTab,setHistTab]   = useState("Recent");
  const [showDPaywall,setShowDPaywall] = useState(false);
  const inputRef = useRef(null);

  /* ── FEYNMAN mode state ────────────────── */
  const FEYNMAN_PHASES=[
    {icon:"💡",label:"Analogy"},
    {icon:"🔬",label:"NCERT"},
    {icon:"⚡",label:"NEET Catch"},
    {icon:"📝",label:"MCQ"},
  ];
  const [msgs,setMsgs] = useState([
    {role:"assistant",text:"👋 Hi! I'm your **Feynman NEET Tutor**.\n\nI teach using a strict 4-phase loop — one phase at a time, waiting for your reply before moving forward:\n💡 Analogy → 🔬 NCERT Bridge → ⚡ NEET Catch → 📝 MCQ\n\n**What NEET topic do you want to master?**\n\n*(Try: Relative Velocity, Golgi Apparatus, Photoelectric Effect, Le Chatelier's Principle)*"}
  ]);
  const [fInput,setFInput]         = useState("");
  const [fLoading,setFLoading]     = useState(false);
  const [phase,setPhase]           = useState(0);
  const [topic,setTopic]           = useState("");
  const [topicStarted,setTopicStarted] = useState(false);
  const [katexReady,setKatexReady] = useState(false);
  const [showFPaywall,setShowFPaywall] = useState(false);
  const [fPaywallReason,setFPaywallReason] = useState("");
  const fHistoryRef = useRef([]);
  const bottomRef   = useRef(null);

  useEffect(()=>{
    const saved=localStorage.getItem("bb_doubt_history");
    if(saved) try{setHistory(JSON.parse(saved));}catch(e){}
  },[]);

  useEffect(()=>{
    if(bottomRef.current) bottomRef.current.scrollIntoView({behavior:"smooth"});
  },[msgs,fLoading]);

  // Load KaTeX for Feynman math rendering
  useEffect(()=>{
    if(window.katex){setKatexReady(true);return;}
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);
    const script=document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload=()=>setKatexReady(true);
    document.head.appendChild(script);
  },[]);

  /* ── DOUBT mode API call ───────────────── */
  const askDoubt=async()=>{
    const q=question.trim();
    if(!q||dLoading) return;
    const today=new Date().toDateString();
    const usageKey="bb_doubt_usage_"+today;
    const usageData=JSON.parse(localStorage.getItem(usageKey)||'{"count":0}');
    const isPremium=JSON.parse(localStorage.getItem("bb_premium")||'false');
    if(!isPremium && usageData.count>=3){
      setShowDPaywall(true); return;
    }
    setDLoading(true);setAnswer("");setSources([]);setMood("thinking");
    let full="";
    try{
      const res=await fetch(`${RAG_URL}/doubt`,{
        method:"POST",
        headers:{"Content-Type":"application/json","X-App-Token":APP_TOKEN},
        body:JSON.stringify({question:q,history:[]}),
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader=res.body.getReader();
      const dec=new TextDecoder();
      setDLoading(false);
      while(true){
        const {done,value}=await reader.read();
        if(done) break;
        for(const line of dec.decode(value,{stream:true}).split("\n")){
          if(!line.startsWith("data: ")) continue;
          try{
            const evt=JSON.parse(line.slice(6));
            if(evt.type==="sources") setSources(evt.sources||[]);
            else if(evt.type==="token"){ full+=evt.text; setAnswer(a=>(a||"")+evt.text); setMood("happy"); }
            else if(evt.type==="done"){
              const h=[{q,a:full.slice(0,120),time:Date.now(),subject:"NEET"},...history].slice(0,20);
              setHistory(h); localStorage.setItem("bb_doubt_history",JSON.stringify(h));
              localStorage.setItem(usageKey,JSON.stringify({count:usageData.count+1}));
            }
            else if(evt.type==="error"){ setAnswer("⚠️ "+evt.text); setMood("confused"); }
          }catch(e){}
        }
      }
    }catch(e){
      setDLoading(false);
      setAnswer("⚠️ Could not reach the server. Please check your connection.");
      setMood("confused");
    }
  };

  /* ── FEYNMAN mode API call ─────────────── */
  const detectPhase=(text)=>{
    if(/📝|Assertion.*\(A\)|Knowledge Check/i.test(text)) return 3;
    if(/⚡|NEET Catch|Rain.Man|River|NTA trap/i.test(text)) return 2;
    if(/🔬|Active Recall Check|NCERT|Chapter|Class 1[12]/i.test(text)) return Math.max(phase,1);
    return phase;
  };

  const renderMathLine=(line,key)=>{
    const isRecall = /Active Recall Check|🔬/.test(line);
    const isCatch  = /NEET Catch|⚡/.test(line);
    const isMCQ    = /📝|Assertion \(A\)|Reason \(R\)/.test(line);
    const isHook   = /Does this analogy|💡/.test(line);
    const isBullet = /^[\s]*[•\-\*]/.test(line);

    let bg="transparent", bl="none", pl=isBullet?14:0;
    if(isRecall){bg="#F3F0FF";bl="3px solid #7C3AED";pl=12;}
    if(isCatch) {bg="#FFF8E1";bl="3px solid #FF9500";pl=12;}
    if(isMCQ)   {bg="#F0FDF4";bl="3px solid #22C55E";pl=12;}
    if(isHook)  {bg="#FFF0F8";bl="3px solid #E91E8C";pl=12;}

    const renderMath=(str)=>{
      if(!katexReady||!window.katex) return str;
      str=str.replace(/\$\$(.+?)\$\$/g,(_,m)=>{try{return window.katex.renderToString(m,{displayMode:true,throwOnError:false});}catch(e){return `$$${m}$$`;}});
      str=str.replace(/\$([^\$\n]+?)\$/g,(_,m)=>{try{return window.katex.renderToString(m,{displayMode:false,throwOnError:false});}catch(e){return `$${m}$`;}});
      return str;
    };

    let html=line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+?)\*/g,'<em>$1</em>');
    html=renderMath(html);

    return(
      <div key={key} style={{
        fontSize:13,lineHeight:1.7,color:"var(--tx)",
        marginBottom:isBullet?3:5,
        marginTop:isRecall||isCatch||isMCQ||isHook?6:0,
        padding:isRecall||isCatch||isMCQ||isHook?`8px ${pl}px`:`0 0 0 ${pl}px`,
        background:bg,borderLeft:bl,
        borderRadius:isRecall||isCatch||isMCQ||isHook?10:0,
      }} dangerouslySetInnerHTML={{__html:html||"&nbsp;"}}/>
    );
  };

  const sendFeynman=async()=>{
    const text=fInput.trim();
    if(!text||fLoading) return;

    // Paywall check on first topic
    if(!topicStarted){
      const accessUid=uid||localStorage.getItem("bb_uid");
      const devMode=localStorage.getItem("bb_dev_mode")==="true";
      if(accessUid && !devMode){
        try{
          const mod=await import("./firebase_utils");
          const {allowed,reason}=await mod.verifyAccess(accessUid,"feynman");
          if(!allowed){ setFPaywallReason(reason); setShowFPaywall(true); return; }
          await mod.incrementUsage(accessUid,"feynman");
        }catch(e){console.error("Feynman paywall:",e);}
      }
      setTopicStarted(true);
      setTopic(text.length>40?text.slice(0,40)+"…":text);
      setPhase(0);
    }

    setFInput("");
    // Add user message + empty assistant placeholder in one update (no duplicate)
    const PLACEHOLDER_ID = Date.now();
    setMsgs(m=>[...m,{role:"user",text},{role:"assistant",text:"",id:PLACEHOLDER_ID}]);
    setFLoading(true);

    const isFirstTurn = fHistoryRef.current.length===0;
    const questionToSend = isFirstTurn
      ? `[DEEP_DIVE_TEACHING_MODE]\n${FEYNMAN_CONTEXT}\n\n---\nStudent wants to learn: ${text}`
      : text;

    fHistoryRef.current=[...fHistoryRef.current,{role:"user",content:text}];

    let full="";
    try{
      const res=await fetch(`${RAG_URL}/doubt`,{
        method:"POST",
        headers:{"Content-Type":"application/json","X-App-Token":APP_TOKEN},
        body:JSON.stringify({
          question: questionToSend,
          history:  fHistoryRef.current.slice(0,-1),
        }),
      });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader=res.body.getReader();
      const dec=new TextDecoder();
      setFLoading(false);
      while(true){
        const {done,value}=await reader.read();
        if(done) break;
        for(const line of dec.decode(value,{stream:true}).split("\n")){
          if(!line.startsWith("data: ")) continue;
          try{
            const evt=JSON.parse(line.slice(6));
            if(evt.type==="token"){
              full+=evt.text;
              // Update the placeholder message in-place — no new message created
              setMsgs(m=>m.map(msg=>msg.id===PLACEHOLDER_ID?{...msg,text:full}:msg));
            }
            else if(evt.type==="done"){
              fHistoryRef.current=[...fHistoryRef.current,{role:"assistant",content:full}];
              setPhase(p=>Math.max(p,detectPhase(full)));
            }
            else if(evt.type==="error"){
              full="⚠️ "+evt.text;
              setMsgs(m=>m.map(msg=>msg.id===PLACEHOLDER_ID?{...msg,text:full}:msg));
            }
          }catch(e){}
        }
      }
      if(!full){
        setMsgs(m=>m.map(msg=>msg.id===PLACEHOLDER_ID?{...msg,text:"⚠️ No response received. Please try again."}:msg));
      }
    }catch(e){
      setFLoading(false);
      setMsgs(m=>m.map(msg=>msg.id===PLACEHOLDER_ID?{...msg,text:"⚠️ Could not reach the server. Please check your connection."}:msg));
    }
  };

  const pastelColors=[
    {bg:"#FEF3C7",border:"#FCD34D",dot:"#F59E0B"},
    {bg:"#DBEAFE",border:"#93C5FD",dot:"#3B82F6"},
    {bg:"#FCE7F3",border:"#F9A8D4",dot:"#EC4899"},
    {bg:"#D1FAE5",border:"#6EE7B7",dot:"#10B981"},
    {bg:"#EDE9FE",border:"#C4B5FD",dot:"#7C3AED"},
  ];

  const TOPIC_CHIPS=["Relative Velocity","Golgi Apparatus","Photoelectric Effect","DNA Replication","Le Chatelier's Principle"];

  return(
    <div style={{minHeight:"100vh",background:mode==="feynman"?"#F7F4FF":"linear-gradient(160deg,#F5F0FF 0%,#FFF8F0 50%,#F0FFF4 100%)",fontFamily:"var(--font)"}}>
      <style>{`
        @keyframes floatBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseOpacity{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes msgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Feynman Paywall */}
      {showFPaywall&&<PaywallModal onClose={()=>{setShowFPaywall(false);setFPaywallReason("");}} reason={fPaywallReason}/>}

      {/* Header */}
      <div style={{
        background:"linear-gradient(135deg,#4C1D95,#7C3AED,#E91E8C)",
        padding:"44px 20px 0",
      }}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.3)",borderRadius:12,width:36,height:36,color:"#fff",fontSize:16,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>

        {mode==="doubt"?(
          <div style={{display:"flex",alignItems:"center",gap:14,paddingBottom:14}}>
            <div style={{animation:"floatBob 3s ease infinite",flexShrink:0}}><DrNeuron mood={mood}/></div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.7)",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Dr. Neuron 🧠</div>
              <div style={{fontSize:19,fontWeight:900,color:"#fff",lineHeight:1.2}}>Hello, {userName}! 👋</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.75)",marginTop:2,fontWeight:600}}>Ask anything — NCERT-grounded instant answers</div>
            </div>
          </div>
        ):(
          <div style={{paddingBottom:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:"#fff"}}>🧠 Feynman Deep Dive</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:2}}>{topic?`📌 ${topic}`:"Analogy → NCERT → NEET Catch → MCQ"}</div>
              </div>
              <div style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"5px 10px",border:"1px solid rgba(255,255,255,.25)"}}>
                <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.6)"}}>POWERED BY</div>
                <div style={{fontSize:10,fontWeight:900,color:"#fff"}}>Claude AI</div>
              </div>
            </div>
            {/* Phase bar */}
            <div style={{display:"flex",gap:4,paddingBottom:10}}>
              {FEYNMAN_PHASES.map((p,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:"100%",height:3,borderRadius:2,background:i<=phase?"rgba(255,255,255,.9)":"rgba(255,255,255,.25)",transition:"background .4s"}}/>
                  <div style={{fontSize:9,fontWeight:700,color:i<=phase?"rgba(255,255,255,.9)":"rgba(255,255,255,.4)"}}>{p.icon} {p.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode toggle — segmented control, always visible on any background */}
        <div style={{display:"flex",background:"rgba(0,0,0,.18)",borderRadius:20,padding:5,gap:4,margin:"10px 0 4px"}}>
          <button onClick={()=>setMode("doubt")} style={{
            flex:1,padding:"11px 8px",borderRadius:16,border:"none",cursor:"pointer",
            transition:"all .22s",fontFamily:"var(--font)",
            background:mode==="doubt"?"linear-gradient(135deg,#667EEA,#764BA2)":"transparent",
            boxShadow:mode==="doubt"?"0 4px 14px rgba(102,126,234,.55)":"none",
            transform:mode==="doubt"?"scale(1.02)":"scale(1)",
          }}>
            <div style={{fontSize:22,marginBottom:2}}>🔍</div>
            <div style={{fontSize:13,fontWeight:900,color:mode==="doubt"?"#fff":"rgba(255,255,255,.7)"}}>Ask Doubt</div>
            <div style={{fontSize:10,fontWeight:600,color:mode==="doubt"?"rgba(255,255,255,.85)":"rgba(255,255,255,.45)",marginTop:1}}>Instant NCERT answer</div>
          </button>
          <button onClick={()=>setMode("feynman")} style={{
            flex:1,padding:"11px 8px",borderRadius:16,border:"none",cursor:"pointer",
            transition:"all .22s",fontFamily:"var(--font)",
            background:mode==="feynman"?"linear-gradient(135deg,#E91E8C,#7C3AED)":"transparent",
            boxShadow:mode==="feynman"?"0 4px 14px rgba(233,30,140,.55)":"none",
            transform:mode==="feynman"?"scale(1.02)":"scale(1)",
          }}>
            <div style={{fontSize:22,marginBottom:2}}>🧠</div>
            <div style={{fontSize:13,fontWeight:900,color:mode==="feynman"?"#fff":"rgba(255,255,255,.7)"}}>Deep Dive</div>
            <div style={{fontSize:10,fontWeight:600,color:mode==="feynman"?"rgba(255,255,255,.85)":"rgba(255,255,255,.45)",marginTop:1}}>4-phase Feynman loop</div>
          </button>
        </div>
      </div>

      {/* ══ DOUBT MODE ══ */}
      {mode==="doubt"&&(
        <div style={{padding:"16px 20px 80px"}}>
          <div style={{background:"#fff",borderRadius:24,padding:20,marginBottom:16,boxShadow:"0 4px 0 #E9D5FF,0 8px 32px rgba(124,58,237,.08)",border:"1.5px solid #EDE9FE",animation:"fadeSlide .4s ease both"}}>
            <textarea ref={inputRef} value={question} onChange={e=>setQuestion(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();askDoubt();}}}
              placeholder="e.g. Why does DNA replicate? How does a capacitor work? Explain osmosis..."
              rows={3}
              style={{width:"100%",border:"1.5px solid #EDE9FE",borderRadius:16,padding:"12px 14px",fontSize:14,color:"#1F1235",lineHeight:1.6,background:"#FAFAFA",outline:"none",fontFamily:"var(--font)",resize:"none",boxSizing:"border-box"}}/>
            <button onClick={askDoubt} disabled={dLoading||!question.trim()} style={{width:"100%",marginTop:12,padding:"14px",background:dLoading||!question.trim()?"#E5E7EB":"linear-gradient(135deg,#7C3AED,#EC4899)",border:"none",borderRadius:16,color:dLoading||!question.trim()?"#9CA3AF":"#fff",fontSize:14,fontWeight:800,cursor:dLoading||!question.trim()?"not-allowed":"pointer",transition:"all .2s",boxShadow:dLoading||!question.trim()?"none":"0 4px 16px rgba(124,58,237,.35)"}}>
              {dLoading?<span style={{animation:"pulseOpacity 1s infinite"}}>🔍 Dr. Neuron is thinking...</span>:"Ask Dr. Neuron ✨"}
            </button>
          </div>

          {answer&&(
            <div style={{background:"#fff",borderRadius:24,padding:20,marginBottom:16,boxShadow:"0 4px 0 #D1FAE5,0 8px 32px rgba(16,185,129,.08)",border:"1.5px solid #D1FAE5",animation:"fadeSlide .5s ease both"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:32,height:32,borderRadius:10,background:"#D1FAE5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💡</div>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"#065F46"}}>Dr. Neuron's Answer</div>
                  <div style={{fontSize:10,color:"#6B7280",fontWeight:600}}>NCERT-grounded response</div>
                </div>
              </div>
              {sources.length>0&&(
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {sources.slice(0,3).map((s,i)=>(
                    <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,background:"#E8F5E9",color:"#2E7D32",fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20}}>
                      📗 {s.source||s.chapter}
                    </span>
                  ))}
                </div>
              )}
              <div style={{fontSize:14,color:"#1F2937",lineHeight:1.8,fontWeight:500,whiteSpace:"pre-wrap"}}>{answer}</div>
              <button onClick={()=>{setAnswer(null);setSources([]);setMood("idle");setQuestion("");inputRef.current?.focus();}}
                style={{marginTop:12,padding:"8px 16px",background:"#F0FDF4",border:"1.5px solid #D1FAE5",borderRadius:12,color:"#059669",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                + Ask a follow-up
              </button>
            </div>
          )}

          {showDPaywall&&<PaywallCard onClose={()=>setShowDPaywall(false)} onUpgrade={()=>{localStorage.setItem("bb_premium","true");setShowDPaywall(false);alert("Premium activated! (Demo mode)");}}/>}

          {history.length>0&&(
            <div style={{background:"#fff",borderRadius:24,padding:20,boxShadow:"0 4px 0 #EDE9FE,0 8px 32px rgba(124,58,237,.06)",border:"1.5px solid #EDE9FE"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{fontSize:14,fontWeight:800,color:"#1F1235"}}>📚 Previous Doubts</div>
                <div style={{display:"flex",background:"#EDE9FE",borderRadius:20,padding:3,gap:2}}>
                  {["Recent","All"].map(t=>(
                    <button key={t} onClick={()=>setHistTab(t)} style={{padding:"5px 14px",borderRadius:18,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:histTab===t?"#fff":"transparent",color:histTab===t?"#7C3AED":"#9CA3AF",boxShadow:histTab===t?"0 2px 8px rgba(124,58,237,.15)":"none"}}>{t}</button>
                  ))}
                </div>
              </div>
              {(histTab==="Recent"?history.slice(0,5):history).map((item,i)=>{
                const c=pastelColors[i%pastelColors.length];
                return(
                  <button key={i} onClick={()=>{setQuestion(item.q);setAnswer(item.a);setMood("happy");}}
                    style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:14,padding:"10px 14px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10,width:"100%",marginBottom:7}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:c.dot,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#1F2937",lineHeight:1.3}}>{item.q.slice(0,55)}{item.q.length>55?"...":""}</div>
                      <div style={{fontSize:10,color:"#9CA3AF",marginTop:2,fontWeight:600}}>{new Date(item.time).toLocaleDateString()}</div>
                    </div>
                  </button>
                );
              })}
              <button onClick={()=>{setHistory([]);localStorage.removeItem("bb_doubt_history");}} style={{marginTop:6,background:"transparent",border:"none",color:"#EF4444",fontSize:11,fontWeight:700,cursor:"pointer",padding:"4px 0"}}>🗑 Clear history</button>
            </div>
          )}
        </div>
      )}

      {/* ══ FEYNMAN DEEP DIVE MODE ══ */}
      {mode==="feynman"&&(
        <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)"}}>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px 20px"}}>
            {msgs.length<=1&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--sub)",marginBottom:8,textAlign:"center",letterSpacing:.5,textTransform:"uppercase"}}>Popular NEET topics</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center",marginBottom:10}}>
                  {TOPIC_CHIPS.map((s,i)=>(
                    <button key={i} onClick={()=>setFInput(s)} style={{padding:"7px 14px",borderRadius:20,border:"1.5px solid #C4B5FD",background:"#EDE9FE",color:"#7C3AED",fontSize:12,fontWeight:700,cursor:"pointer"}}>{s}</button>
                  ))}
                </div>
                <div style={{padding:"10px 14px",background:"linear-gradient(135deg,#FFF9E6,#FFFBF0)",borderRadius:14,border:"1px solid #FDE68A",fontSize:11,color:"#92400E",fontWeight:600,textAlign:"center"}}>
                  💡 Free: 1 deep-dive/day · <span style={{color:"#7C3AED",fontWeight:800}}>Upgrade for unlimited</span>
                </div>
              </div>
            )}

            {msgs.map((msg,i)=>{
              const isMe=msg.role==="user";
              return(
                <div key={i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",marginBottom:14,animation:"msgIn .25s ease"}}>
                  {!isMe&&<div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#4C1D95,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,marginRight:8,alignSelf:"flex-end"}}>🧠</div>}
                  <div style={{maxWidth:"84%",padding:"11px 14px",borderRadius:isMe?"18px 18px 4px 18px":"4px 18px 18px 18px",background:isMe?"linear-gradient(135deg,#7C3AED,#E91E8C)":"#fff",boxShadow:isMe?"0 3px 12px rgba(124,58,237,.3)":"0 2px 10px rgba(0,0,0,.07)",border:isMe?"none":"1px solid #EDE9FE"}}>
                    {isMe
                      ?<div style={{fontSize:13,color:"#fff",lineHeight:1.6}}>{msg.text}</div>
                      :<div>{msg.text.split("\n").map((line,j)=>renderMathLine(line,j))}</div>
                    }
                  </div>
                </div>
              );
            })}

            {fLoading&&(
              <div style={{display:"flex",alignItems:"flex-end",gap:8,marginBottom:12}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#4C1D95,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🧠</div>
                <div style={{padding:"12px 16px",background:"#fff",borderRadius:"4px 18px 18px 18px",boxShadow:"0 2px 10px rgba(0,0,0,.07)",border:"1px solid #EDE9FE"}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {[0,.18,.36].map(d=><div key={d} style={{width:7,height:7,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#E91E8C)",animation:`dotP 1.1s ${d}s ease infinite`}}/>)}
                    <span style={{fontSize:11,color:"#9CA3AF",marginLeft:6,fontWeight:600}}>Feynman is thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Feynman input */}
          <div style={{padding:"10px 14px 28px",background:"rgba(247,244,255,.97)",borderTop:"1.5px solid #EDE9FE",backdropFilter:"blur(12px)"}}>
            {topicStarted&&(
              <div style={{marginBottom:8}}>
                <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
                  {FEYNMAN_PHASES.map((p,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,
                      background:i===Math.min(phase,3)?"linear-gradient(135deg,#7C3AED,#E91E8C)":i<phase?"#D1FAE5":"#F3F4F6",
                      opacity:i>phase?0.45:1,transition:"all .3s",
                    }}>
                      <span style={{fontSize:11}}>{p.icon}</span>
                      <span style={{fontSize:10,fontWeight:800,color:i===Math.min(phase,3)?"#fff":i<phase?"#065F46":"#6B7280"}}>{p.label}</span>
                      {i<phase&&<span style={{fontSize:10,color:"#065F46"}}>✓</span>}
                    </div>
                  ))}
                </div>
                {/* Quick phase nudges */}
                <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",justifyContent:"center"}}>
                  <button onClick={()=>setFInput("yes")} style={{padding:"5px 12px",borderRadius:14,border:"1.5px solid #C4B5FD",background:"#EDE9FE",color:"#7C3AED",fontSize:11,fontWeight:700,cursor:"pointer"}}>✅ Yes, continue</button>
                  <button onClick={()=>setFInput("I don't know, can you give a hint?")} style={{padding:"5px 12px",borderRadius:14,border:"1.5px solid #FCA5A5",background:"#FEF2F2",color:"#DC2626",fontSize:11,fontWeight:700,cursor:"pointer"}}>💡 Give hint</button>
                  <button onClick={()=>setFInput("Skip to next phase")} style={{padding:"5px 12px",borderRadius:14,border:"1.5px solid #D1FAE5",background:"#F0FDF4",color:"#059669",fontSize:11,fontWeight:700,cursor:"pointer"}}>⏭ Next phase</button>
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <input value={fInput} onChange={e=>setFInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendFeynman()}
                placeholder={topicStarted?"Answer or ask a question…":"Name a NEET topic to master…"}
                style={{flex:1,padding:"12px 16px",borderRadius:22,border:"1.5px solid #C4B5FD",background:"#fff",fontSize:13,fontFamily:"var(--font)",outline:"none",color:"var(--tx)"}}/>
              <button onClick={sendFeynman} disabled={fLoading||!fInput.trim()}
                style={{width:44,height:44,borderRadius:"50%",background:fLoading||!fInput.trim()?"#DDD6FE":"linear-gradient(135deg,#7C3AED,#E91E8C)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,boxShadow:fLoading||!fInput.trim()?"none":"0 4px 16px rgba(124,58,237,.45)",cursor:fLoading||!fInput.trim()?"not-allowed":"pointer"}}>➤</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App(){
  const [authUser, setAuthUser] = useState(null);       // Firebase auth user
  const [authLoading, setAuthLoading] = useState(true); // true until onAuthStateChanged fires
  const [tab,setTab]=useState("home");
  const [flow,setFlow]=useState(null);
  const [questions,setQs]=useState(null);
  const [result,setResult]=useState(null);
  const [kb,setKB]=useState(QB); // live knowledge base
  const [userStats,setUserStats]=useState({
    level:1,totalPoints:0,accuracy:0,streak:0,
    totalQs:0,rank:999,quizzesDone:0,studyMins:0
  });
  const score   = userStats.totalPoints;
  const rank    = userStats.rank;
  const streak  = userStats.streak;
  const accuracy= userStats.accuracy;
  const level   = userStats.level;
  const xp      = userStats.totalPoints;


  const [mockResult, setMockResult] = useState(null);
  const [quizSubject,  setQuizSubject]  = useState(null);
  const [quizChapter,  setQuizChapter]  = useState(null);
  const [browseSubject,setBrowseSubject] = useState(null);
  // Dev mode: set localStorage.bb_dev_mode = "true" to bypass all paywalls during testing
  const DEV_MODE = localStorage.getItem("bb_dev_mode") === "true";

  const startQuiz = async (subj=null, ch=null) => {
    const uid = authUser?.uid || null;
    if (!DEV_MODE) {
      if (!userUsage.is_premium && userUsage.dailyQuizzesCount >= 3) {
        setPaywallReason("You've used all 3 free quizzes for today. Upgrade to practice without limits.");
        setShowPaywall(true);
        return;
      }
      const { allowed, reason } = await verifyAccess(uid, "quiz");
      if (!allowed) {
        setPaywallReason(reason);
        setShowPaywall(true);
        return;
      }
    }
    // Access granted — write usage to Firestore immediately
    await incrementUsage(uid, "quiz");
    // Update local state so UI reflects new count without another Firestore read
    setUserUsage(prev => ({ ...prev, dailyQuizzesCount: prev.dailyQuizzesCount + 1 }));
    setQuizSubject(subj);
    setQuizChapter(ch);
    setFlow("loading");
  };

  const startMock = async () => {
    const uid = authUser?.uid || null;
    if (!DEV_MODE) {
      if (!userUsage.is_premium && userUsage.hasAttemptedMock) {
        setPaywallReason("Free plan includes 1 mock test. Upgrade for unlimited NEET mock access.");
        setShowPaywall(true);
        return;
      }
      const { allowed, reason } = await verifyAccess(uid, "mock");
      if (!allowed) {
        setPaywallReason(reason);
        setShowPaywall(true);
        return;
      }
    }
    // Access granted
    await incrementUsage(uid, "mock");
    setUserUsage(prev => ({ ...prev, hasAttemptedMock: true }));
    setFlow("neet_mock");
  };
  const goHome      = ()=>{setFlow(null);setTab("home");setMockResult(null);};
  // eslint-disable-next-line
  const openFeynman = ()=>setFlow("feynman");
  // eslint-disable-next-line
  const openDoubt   = ()=>setFlow("doubt");

  // Firebase auth — waits for BOTH onAuthStateChanged AND getRedirectResult
  // before setting authLoading=false. This prevents the login screen from
  // flashing on mobile when the user returns from a Google redirect.
  useEffect(()=>{
    let authFired    = false; // has onAuthStateChanged fired yet?
    let redirectDone = false; // has getRedirectResult resolved yet?

    const maybeFinish = () => {
      if (authFired && redirectDone) setAuthLoading(false);
    };

    const handleUser = async (user) => {
      if(user){
        setAuthUser(user);
        localStorage.setItem("bb_uid", user.uid);
        // Ensure doc exists (patches old docs with usage fields too)
        await ensureUserDoc(user).catch(console.error);
        // Fetch stats AND usage from Firestore in parallel
        const [stats, usage] = await Promise.all([
          getUserStats(user.uid),
          getUserUsage(user.uid),
        ]);
        setUserStats(stats);
        setUserUsage(usage);
        // Sync premium status from Firestore — cannot be spoofed via localStorage
        if (usage.is_premium) localStorage.setItem("bb_premium","true");
        else localStorage.removeItem("bb_premium");
      } else {
        setAuthUser(null);
        localStorage.removeItem("bb_uid");
        localStorage.removeItem("bb_premium");
        setUserStats({level:1,totalPoints:0,accuracy:0,streak:0,totalQs:0,rank:999,quizzesDone:0,studyMins:0});
        setUserUsage({dailyQuizzesCount:0,hasAttemptedMock:false,is_premium:false});
      }
    };

    // 1. Check redirect result first (catches mobile Google redirect return)
    checkRedirectResult().then(async (result) => {
      if (result?.user) await handleUser(result.user);
      redirectDone = true;
      maybeFinish();
    }).catch(e => {
      console.error("checkRedirectResult:", e);
      redirectDone = true;
      maybeFinish();
    });

    // 2. Listen to auth state changes (fires for popup login + persistent sessions)
    const unsub = onAuthChange(async (user)=>{
      await handleUser(user);
      authFired = true;
      maybeFinish();
    });
    return ()=>unsub();
  },[]);// eslint-disable-line

  const [showOnboarding,setShowOnboarding]=useState(()=>{
    return !localStorage.getItem("bb_onboarded");
  });
  // Usage state — loaded from Firestore on login; cannot be reset by clearing localStorage
  const [userUsage, setUserUsage] = useState({
    dailyQuizzesCount: 0,
    hasAttemptedMock:  false,
    is_premium:        false,
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState("");
  const addQuestion = (q)=>setKB(prev=>[...prev,{...q,id:prev.length+1}]);

  const inFlow = !!flow;

  let content;
  if(flow==="loading")     content=<LoadingScreen onReady={qs=>{setQs(qs);setFlow("quiz");}} kb={kb} subject={quizSubject} chapter={quizChapter}/>;
  else if(flow==="quiz"&&questions) content=<QuizScreen questions={questions} onFinish={async r=>{
          setResult(r);
          const uid=localStorage.getItem("bb_uid");
          if(uid && r){
            const saved=await saveQuizResult(uid,{
              score:r.ptsEarned||0,
              subject:quizSubject||"General",
              correct:r.correct||0,
              total:r.total||5,
              timeSecs:r.timeSecs||180,
            });
            if(saved) setUserStats(s=>({...s,
              totalPoints:saved.newPoints,
              accuracy:saved.newAccuracy,
              level:saved.newLevel,
              streak:saved.newStreak,
            }));
          }
          setFlow("results");
        }}/>;
  else if(flow==="results"&&result) content=<ResultsScreen result={result} questions={questions} onHome={goHome} onRetry={()=>startQuiz(quizSubject,quizChapter)}/>;
  
  else if(flow==="neet_mock") content=<NeetMockScreen onBack={goHome} onFinish={r=>{setMockResult(r);setFlow("mock_results");}}/>;
  else if(flow==="mock_results"&&mockResult) content=<NeetMockResults result={mockResult} onHome={goHome} onRetry={()=>startMock()}/>;
  else if(flow==="doubt"||flow==="feynman") content=<DoubtScreen onBack={()=>{setFlow(null);setTab("home");}} userName={authUser?.displayName?.split(" ")[0]||"Student"} initialMode={flow==="feynman"?"feynman":"doubt"} uid={authUser?.uid||null}/>;
  else if(flow==="browse"&&browseSubject) content=<ChapterSelectScreen subject={browseSubject} onChapter={ch=>startQuiz(browseSubject,ch)} onBack={()=>{setFlow(null);setBrowseSubject(null);}}/>;
  else if(tab==="home")     content=<HomeScreen onQuiz={startQuiz} onMock={startMock} onBrowse={subj=>{setBrowseSubject(subj);setFlow("browse");}} onDoubt={()=>setFlow("doubt")} score={score} rank={rank} streak={streak} accuracy={accuracy}/>;
  else if(tab==="duel")     content=<DuelScreen kb={kb}/>;
  else if(tab==="messages") content=<MessagesScreen/>;
  else if(tab==="ranks")    content=<RanksScreen currentUid={authUser?.uid}/>;
  else if(tab==="dashboard") content=<DashboardScreen score={score} rank={rank} streak={streak} accuracy={accuracy} userStats={userStats} uid={authUser?.uid} onBack={()=>setTab("home")}/>;
  else content=<ProfileScreen score={score} rank={rank} streak={streak} accuracy={accuracy} xp={xp} level={level} kb={kb} addQuestion={addQuestion} onFeynman={()=>setFlow("feynman")} userName={authUser?.displayName||"Student"} userEmail={authUser?.email||""} userPhoto={authUser?.photoURL||""} onSignOut={async()=>{await signOutUser();setAuthUser(null);localStorage.removeItem("bb_auth_token");}} onSignIn={()=>setAuthUser(null)} userStats={userStats}/>;

  // Show loading while checking auth
  if(authLoading) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#667EEA,#764BA2)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:60}}>🧠</div>
      <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Loading BrainBattle...</div>
    </div>
  );

  // Show login if not authenticated
  if(!authUser) return(
    <>
      <style>{CSS}</style>
      <div style={{maxWidth:430,margin:"0 auto"}}>
        <LoginScreen onLogin={async (user)=>{
          if(user){
            setAuthUser(user);
            localStorage.setItem("bb_uid", user.uid);
            ensureUserDoc(user).catch(console.error);
            const stats = await getUserStats(user.uid);
            setUserStats(stats);
          }
        }}/>
      </div>
    </>
  );

  if(showOnboarding) return(
    <>
      <style>{CSS}</style>
      <div style={{maxWidth:430,margin:"0 auto"}}>
        <OnboardingScreen onDone={()=>{
          localStorage.setItem("bb_onboarded","true");
          setShowOnboarding(false);
        }}/>
      </div>
    </>
  );

  return(
    <>
      <style>{CSS}</style>
      <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",position:"relative",background:"var(--bg)"}}>
        {content}
        {!inFlow&&<BottomNav tab={tab} setTab={setTab} onQuiz={startQuiz}/>}
        {showPaywall&&<PaywallModal onClose={()=>{setShowPaywall(false);setPaywallReason("");}} reason={paywallReason}/>}
      </div>
    </>
  );
}
