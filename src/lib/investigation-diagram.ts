import { grade7Diagram } from './grade7-diagram';
import { grade10Diagram } from './grade10-diagram';
import type { InvestigationDefinition, Trial } from './textbook-investigations';
export type DiagramShape = {kind:'circle';x:number;y:number;r:number;fill:string;stroke?:string}|{kind:'rect';x:number;y:number;width:number;height:number;fill:string;stroke?:string}|{kind:'line';x:number;y:number;x2:number;y2:number;stroke:string}|{kind:'text';x:number;y:number;text:string;fill:string};
/** Read-only views of a recorded trial, not another reaction simulator. */
export function investigationDiagram(def:InvestigationDefinition,trial:Trial):DiagramShape[]{
  if (def.grade === 7 && def.mode === 'model') return grade7Diagram(def, trial);
  if (def.grade === 10 && def.mode === 'model') return grade10Diagram(def, trial);
  const p=trial.parameters,first=trial.readings[0]?.value??0;
  const shapes:DiagramShape[]=[];
  if(def.grade===9){
    const text=(x:number,y:number,text:string)=>shapes.push({kind:'text',x,y,text,fill:'#94a3b8'});
    const rect=(x:number,y:number,width:number,height:number,fill:string)=>shapes.push({kind:'rect',x,y,width,height,fill,stroke:'#94a3b8'});
    text(8,18,`${trial.readings[0]?.label}: ${first.toFixed(1)} ${trial.readings[0]?.unit}`);
    if(['g9-water-tests','g9-colours'].includes(def.model)){
      const colors=['#b7d6aa','#f59e0b','#e9a8ce','#4eabb4'];
      const color=def.model==='g9-colours'?colors[p.compound]:p.test?(p.water?'#e9a8ce':'#4f65ca'):(p.water?'#3185d8':'#f8fafc');
      rect(85,55,110,90,color);text(65,170,def.model==='g9-colours'?'Өнгө нь орчноос хамаарна':'Өнгө өөрчлөгдөх сорил');return shapes;
    }
    if(def.model==='g9-distillation'){
      rect(95,40,90,110,'#bfdbfe');
      const labels=['N₂ −196°C','Ar −186°C','O₂ −183°C'];
      labels.forEach((label,i)=>{shapes.push({kind:'line',x:185,y:60+i*35,x2:225,y2:60+i*35,stroke:'#38bdf8'});text(10,60+i*35,label);});
      text(75,174,'Фракцлах схем');return shapes;
    }
    if(def.model==='g9-chromatography'){
      rect(90,30,100,130,'#f8fafc');rect(92,135,96,23,'#bae6fd');
      shapes.push({kind:'line',x:95,y:125,x2:185,y2:125,stroke:'#64748b'});
      const front=p.front; shapes.push({kind:'line',x:95,y:125-front*5,x2:185,y2:125-front*5,stroke:'#38bdf8'});
      trial.readings.slice(0,-1).forEach((r,i)=>shapes.push({kind:'circle',x:140,y:125-r.value*5,r:5,fill:['#db2777','#eab308','#2563eb'][i]}));
      text(195,125,'эхлэл');return shapes;
    }
    if(['g9-gas-law','g9-air-oxygen'].includes(def.model)){
      const volume=def.model==='g9-gas-law'?first:first/5;
      rect(40,65,160,50,'none');rect(42,67,Math.min(155,volume*7),46,'#bae6fd');
      rect(42+Math.min(155,volume*7),62,4,56,'#cbd5e1');text(45,145,def.model==='g9-gas-law'?'V/T тогтмол · T (K)':'100 мл агаар → O₂ зарцуулагдана');return shapes;
    }
    if(def.model==='g9-gas-diffusion'){
      rect(25,70,230,40,'none');rect(25,72,20,36,'#e9d5ff');rect(235,72,20,36,'#bfdbfe');
      if(p.time>0)rect(25+230*(1-first/p.length),72,5,36,'#f8fafc');
      text(22,135,'NH₃');text(210,135,'HCl');text(80,155,'NH₄Cl цагаан цагираг');return shapes;
    }
    if(def.model==='g9-corrosion'){
      rect(80,55,120,12,p.protection===5?'#94a3b8':'#cbd5e1');rect(125,67,12,80,'#cbd5e1');
      for(let i=0;i<Math.min(20,Math.ceil(first/3));i++)shapes.push({kind:'circle',x:127+(i*7)%10,y:72+(i*13)%70,r:3,fill:'#b45309'});
      text(52,170,'Ижил чийг · ижил хугацаа');return shapes;
    }
    if(['g9-diffusion','g9-dissolving','g9-media','g9-convection'].includes(def.model)){
      rect(65,40,150,115,'#dbeafe');
      for(let i=0;i<35;i++){const spread=first/100;shapes.push({kind:'circle',x:140+Math.sin(i*7)*spread*65,y:140-((i*19)%95)*spread,r:2.5,fill:'#7c3aed'});}
      text(55,173,'Бөөмсийн тархалтын схем');return shapes;
    }
    if(def.model==='g9-heating'){
      shapes.push({kind:'line',x:35,y:150,x2:250,y2:150,stroke:'#94a3b8'},{kind:'line',x:35,y:150,x2:35,y2:35,stroke:'#94a3b8'});
      const points=[[35,145],[60,135],[100,135],[195,45],[250,45]];
      for(let i=1;i<points.length;i++)shapes.push({kind:'line',x:points[i-1][0],y:points[i-1][1],x2:points[i][0],y2:points[i][1],stroke:'#38bdf8'});
      shapes.push({kind:'circle',x:35+p.time/900*215,y:first<=0?145+first:135-first*.9,r:4,fill:'#f59e0b'});text(95,170,'хугацаа →');return shapes;
    }
  }
  if(def.model==='atom'){
    shapes.push({kind:'circle',x:140,y:85,r:14,fill:'#f59e0b'},{kind:'text',x:112,y:90,text:`${p.protons}p ${p.neutrons}n`,fill:'#102f47'});
    let left=p.electrons;
    for(let shell=0;shell<4&&left>0;shell++){
      const count=Math.min(left,[2,8,8,2][shell]);left-=count;const radius=25+shell*16;
      shapes.push({kind:'circle',x:140,y:85,r:radius,fill:'none',stroke:'#94a3b8'});
      for(let i=0;i<count;i++){const angle=i*Math.PI*2/count;shapes.push({kind:'circle',x:140+Math.cos(angle)*radius,y:85+Math.sin(angle)*radius,r:3,fill:'#38bdf8'});}
    }
    return shapes;
  }
  shapes.push({kind:'rect',x:78,y:42,width:124,height:110,fill:'none',stroke:'#94a3b8'});
  const color=def.model==='halogens'?['#d8edba','#e0a55a','#a377bb'][p.halide]??'#cfefff':def.model==='water'&&p.sample===1?'#ac9470':def.model==='treatment'&&p.method===0?'#ac9470':'#cfefff';
  shapes.push({kind:'rect',x:80,y:80,width:120,height:70,fill:color});
  if(def.model==='melting'){
    const fraction=1-(trial.readings[1]?.value??0)/100;
    for(let i=0;i<4;i++)if(fraction>0)shapes.push({kind:'rect',x:90+i%2*45,y:92+Math.floor(i/2)*25,width:32*fraction+2,height:20*fraction+2,fill:'#f8fdff',stroke:'#7dd3fc'});
  }
  if(['photosynthesis','growth'].includes(def.model)){
    shapes.push({kind:'line',x:140,y:145,x2:140,y2:91,stroke:'#16a34a'});
    for(let i=0;i<4;i++)shapes.push({kind:'line',x:140,y:130-i*9,x2:i%2?165:115,y2:118-i*9,stroke:'#16a34a'});
  }
  const gas=['rate','group2','photosynthesis'].includes(def.model)?Math.min(10,Math.ceil(first/3)):0;
  for(let i=0;i<gas;i++)shapes.push({kind:'circle',x:100+(i*37)%80,y:135-(i*19)%100,r:3,fill:'#effaff',stroke:'#38bdf8'});
  if(['candle','calorimetry'].includes(def.model))shapes.push({kind:'circle',x:140,y:158,r:8,fill:'#fb923c'});
  if(['air','water','treatment','tobacco'].includes(def.model)){
    const count=Math.min(30,Math.round(first/3));for(let i=0;i<count;i++)shapes.push({kind:'circle',x:85+(i*31)%110,y:84+(i*17)%60,r:2,fill:'#7c6654'});
  }
  shapes.push({kind:'text',x:12,y:23,text:`${trial.readings[0]?.label??''}: ${first.toFixed(2)} ${trial.readings[0]?.unit??''}`,fill:'#c5eaff'});
  return shapes;
}
