import type { InvestigationDefinition, Trial } from './textbook-investigations';
export type DiagramShape = {kind:'circle';x:number;y:number;r:number;fill:string;stroke?:string}|{kind:'rect';x:number;y:number;width:number;height:number;fill:string;stroke?:string}|{kind:'line';x:number;y:number;x2:number;y2:number;stroke:string}|{kind:'text';x:number;y:number;text:string;fill:string};
/** Read-only views of a recorded trial, not another reaction simulator. */
export function investigationDiagram(def:InvestigationDefinition,trial:Trial):DiagramShape[]{
  const p=trial.parameters,first=trial.readings[0]?.value??0;
  const shapes:DiagramShape[]=[];
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
