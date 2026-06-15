import { chromium } from 'playwright-core'
import fs from 'fs'
const BASE='http://localhost:4400'
const OUT='/tmp/recout'
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true})
setTimeout(()=>{console.log('WD');process.exit(1)},300000).unref()
const COMMON=`
localStorage.setItem('theme_mode','day');
localStorage.setItem('auth_token','demo');
localStorage.setItem('auth_user',JSON.stringify({name:'Мария',email:'m@a.ru'}));
localStorage.setItem('player_intro_seen','1');
(function(){var days=[];for(var i=0;i<12;i++){var d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().slice(0,10));}
localStorage.setItem('progress_state',JSON.stringify({subscription:{active:true,autoRenew:true,expiresAt:'2027-01-01',tier:'all-inclusive'},unlockedPractices:['a1','a2','a3','a4'],completedPractices:['a1','a2','a3'],trackerDays:days,lastKT:6,ktHistory:[{kt:-2},{kt:1},{kt:4}]}));})();
`
const DONE=`localStorage.setItem('checkin_state',JSON.stringify({lastCheckinDate:new Date().toISOString(),lastIS:31}));`
const S=[
 {name:'onboarding',url:'/onboarding',init:COMMON,wait:'text=Начать'},
 {name:'checkin',url:'/checkin',init:COMMON,wait:'text=Далее'},
 {name:'home',url:'/',init:COMMON+DONE,wait:'text=Точка тишины'},
 {name:'player',url:'/player/r1',init:COMMON+DONE,wait:'text=Голос'},
 {name:'index',url:'/checkin',init:COMMON,wait:'text=Далее',finish:true},
]
const b=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox']})
for(const s of S){
 const dir=`${OUT}/${s.name}`;fs.mkdirSync(dir,{recursive:true})
 const ctx=await b.newContext({viewport:{width:400,height:866},deviceScaleFactor:2,recordVideo:{dir,size:{width:400,height:866}}})
 await ctx.addInitScript(s.init)
 const p=await ctx.newPage()
 try{
  await p.goto(BASE+s.url,{waitUntil:'load',timeout:30000})
  if(s.wait)await p.waitForSelector(s.wait,{timeout:28000}).catch(()=>{})
  if(s.finish){for(let i=0;i<4;i++){await p.getByRole('button',{name:/Далее|Завершить/}).last().click({timeout:5000}).catch(()=>{});await p.waitForTimeout(950)}await p.waitForSelector('text=Индекс состояния',{timeout:12000}).catch(()=>{})}
  await p.waitForTimeout(8000)
 }catch(e){console.log(s.name,'ERR',e.message)}
 await ctx.close()
 const w=fs.readdirSync(dir).find(f=>f.endsWith('.webm'))
 console.log('DONE',s.name,w?'ok':'NO')
}
await b.close();process.exit(0)
