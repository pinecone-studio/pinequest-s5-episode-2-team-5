import { formatMeasurement } from '@/lib/measurement-format';
import { InvestigationDiagram } from './investigation-diagram';
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useSession } from '@/context/session';
import { investigationById, labForPractical, newAttempt, parameterValues, runModel, measurementSeries, type InvestigationAttempt } from '@/lib/textbook-investigations';
import { loadInvestigation, saveInvestigation } from '@/lib/investigation-storage';
import { RichText } from './rich-text';

export function PracticalInvestigation({ id, practicalId, expected, onReviewed, reviewed = false }: {id?:string;practicalId?:string;expected?:string;onReviewed?:()=>void;reviewed?:boolean}) {
  const {user}=useSession();
  const labId=id??(practicalId?labForPractical(practicalId):null);
  const storageId=labId??(practicalId==='2.1-prac1'?'atom-builder':'element-cards');
  const definition=labId?investigationById(labId):undefined;
  const [attempt,setAttempt]=useState(newAttempt),[ready,setReady]=useState(false),[error,setError]=useState(false);
  const [parameters,setParameters]=useState(()=>definition?parameterValues(definition):{});
  const [loadAttempt,setLoadAttempt]=useState(0);
  const [feedback,setFeedback]=useState('');
  const [metric,setMetric]=useState<string>();
  const [manual,setManual]=useState({label:'',value:'',unit:''});
  useFocusEffect(useCallback(()=>{
    let alive=true;setReady(false);
    if(user)void loadInvestigation(user.id,storageId).then((a)=>{if(alive){setAttempt(a);setReady(true);setError(false);if(loadAttempt>0)setFeedback('Дэвтэр дахин ачааллаа.');}},()=>{if(alive)setError(true);});
    return()=>{alive=false;};
  },[user,storageId,loadAttempt]));
  const commit=(next:InvestigationAttempt)=>{setAttempt(next);if(user)void saveInvestigation(user.id,storageId,next).then(()=>setError(false),()=>setError(true));};
  if(!ready)return <View style={styles.body}><AppText variant="caption">{error?'Дэвтрийг уншиж чадсангүй.':'Дэвтрийг ачаалж байна…'}</AppText>{error&&<GameButton title="Дахин ачаалах" size="sm" onPress={()=>setLoadAttempt((n)=>n+1)}/>}</View>;
  const canReveal=attempt.observation.trim().length>0;
  const validMeasurement=!!manual.label.trim()&&!!manual.value.trim()&&Number.isFinite(Number(manual.value.replace(',','.')));
  const field=(key:'prediction'|'observation'|'conclusion',label:string)=><View style={styles.body}><AppText variant="bodyStrong">{label}</AppText><TextInput accessibilityLabel={label} multiline maxLength={3000} value={attempt[key]} onChangeText={(text)=>commit({...attempt,[key]:text})} style={styles.input} placeholderTextColor={Colors.textDim} placeholder={key==='prediction'?'Юу болох вэ? Яагаад?':'Өөрийн үгээр тайлбарла…'}/></View>;
  const series=measurementSeries(attempt.trials,metric);
  const values=series.points.map((p)=>p.value),low=Math.min(0,...values),high=Math.max(1,...values),y=(v:number)=>110-(v-low)/(high-low)*90;
  return <View style={styles.body}>
    {definition&&<><RichText>{definition.prompt}</RichText><AppText variant="caption">{definition.variables}</AppText></>}
    {field('prediction','1. Таамагла')}
    <AppText variant="caption">Таамаглалаа бичээд туршиж болно. Шууд туршиж эхлэхэд ч нээлттэй.</AppText>
    {definition?.mode==='model'&&<View style={styles.body}>
      <AppText variant="bodyStrong">Виртуал судалгааны багаж</AppText><AppText variant="caption">Хялбаршуулсан сургалтын загвар. Гарсан тоо нь бодит хэмжилт биш.</AppText>
      {definition.controls.map((control)=><View key={control.id} style={styles.body}><AppText>{control.label}{!control.options?` · ${control.min}–${control.max}`:''}</AppText><View style={styles.row}>{control.options?control.options.map((o)=><Pressable key={o.value} accessibilityRole="button" accessibilityState={{selected:parameters[control.id]===o.value}} onPress={()=>setParameters({...parameters,[control.id]:o.value})} style={[styles.choice,parameters[control.id]===o.value&&{borderColor:Colors.cyan}]}><AppText variant="caption">{o.label}</AppText></Pressable>):<><GameButton title="−" size="sm" variant="secondary" disabled={parameters[control.id]<=(control.min??0)} onPress={()=>setParameters(parameterValues(definition,{...parameters,[control.id]:parameters[control.id]-(control.step??1)}))}/><AppText>{formatMeasurement(parameters[control.id])}</AppText><GameButton title="+" size="sm" variant="secondary" disabled={parameters[control.id]>=(control.max??100)} onPress={()=>setParameters(parameterValues(definition,{...parameters,[control.id]:parameters[control.id]+(control.step??1)}))}/></>}</View></View>)}
      {attempt.trials.length>0&&<InvestigationDiagram definition={definition} trial={attempt.trials[attempt.trials.length-1]}/>}
      <GameButton title="Загварыг ажиллуулж хэмжих" size="md" onPress={()=>{commit({...attempt,trials:[...attempt.trials,runModel(definition,parameters)].slice(-30)});setFeedback('Хэмжилт нэмэгдлээ. Доорх хүснэгт, графикт үр дүнг харна уу.');}}/>
      <AppText variant="caption" accessibilityLiveRegion="polite">Бүртгэсэн хэмжилт: {attempt.trials.length}{attempt.trials.length?' · Үр дүн доорх хүснэгтэд байна.':''}</AppText>
    </View>}
    {labId?<><GameButton title={Platform.OS==='web'?'OpenLab-д энэ туршилтыг нээх':'OpenLab · веб хувилбарт нээх'} size="md" variant="secondary" onPress={()=>router.push({pathname:'/openlab',params:{experiment:labId}})}/><AppText variant="caption">OpenLab-ийн дэвтэрт авсан хэмжилт буцаж ирэхэд энд харагдана. Орон нутгийн төхөөрөмжид хадгална.</AppText></>:<GameButton title="Үелэх хүснэгтээр судлах" size="md" variant="secondary" onPress={()=>router.push('/periodic')}/>}
    <AppText variant="bodyStrong">2. Хэмжилт ба нотолгоо</AppText>
    {attempt.trials.map((t,i)=><View key={i} style={styles.result}><AppText variant="caption">{i+1}. {t.source==='model'?'Загвар':t.source==='manual'?'Өөрөө оруулсан':'OpenLab сав'} · {definition?definition.controls.map((c)=>`${c.label}: ${c.options?.find((o)=>o.value===t.parameters[c.id])?.label??t.parameters[c.id]}`).join(' · '):''}</AppText>{t.readings.map((r)=><AppText key={r.label}>{r.label}: {formatMeasurement(r.value)} {r.unit}</AppText>)}</View>)}
    {values.length>0&&<><View style={styles.row}>{series.options.map(([key,r])=><GameButton key={key} title={`${r.label} (${r.unit})`} size="sm" variant={key===series.selected?'primary':'secondary'} onPress={()=>setMetric(key)}/>)}</View><Svg width="100%" height={145} viewBox="0 0 440 145" accessibilityLabel="Хэмжилтүүдийн харьцуулалт"><Line x1={15} y1={y(0)} x2={430} y2={y(0)} stroke={Colors.textDim}/>{values.map((v,i)=><Rect key={i} x={20+i*400/values.length} y={Math.min(y(v),y(0))} width={Math.max(2,340/values.length)} height={Math.max(1,Math.abs(y(v)-y(0)))} fill={Colors.cyan}/>)}<SvgText x={15} y={140} fill={Colors.textMuted} fontSize={10}>X: хэмжилтийн дугаар · Y: {series.selected}</SvgText></Svg><AppText variant="caption">{series.options.find(([key])=>key===series.selected)?.[1].unit} · min {formatMeasurement(low)} / max {formatMeasurement(high)}</AppText></>}
    <AppText variant="caption">Гараар хэмжсэн бол тэмдэглэл нэм:</AppText>
    <TextInput accessibilityLabel="Хэмжигдэхүүний нэр" style={styles.input} placeholder="Температур / хугацаа / масс…" placeholderTextColor={Colors.textDim} value={manual.label} onChangeText={(label)=>setManual({...manual,label})}/>
    <View style={styles.row}><TextInput accessibilityLabel="Хэмжсэн утга" style={[styles.input,{flex:1}]} keyboardType="numbers-and-punctuation" placeholder="Утга" placeholderTextColor={Colors.textDim} value={manual.value} onChangeText={(value)=>setManual({...manual,value})}/><TextInput accessibilityLabel="Нэгж" style={[styles.input,{flex:1}]} placeholder="мл / °C / с" placeholderTextColor={Colors.textDim} value={manual.unit} onChangeText={(unit)=>setManual({...manual,unit})}/></View>
    <GameButton title="Хэмжилт нэмэх" size="sm" variant="secondary" disabled={!validMeasurement} onPress={()=>{commit({...attempt,trials:[...attempt.trials,{parameters:{},readings:[{label:manual.label.slice(0,80),value:Number(manual.value.replace(',','.')),unit:manual.unit.slice(0,30)}],observation:'Өөрөө оруулсан хэмжилт',source:'manual' as const,at:Date.now()}].slice(-30)});setManual({...manual,value:''});}}/>
    {!validMeasurement&&<AppText variant="caption">Хэмжилт нэмэхийн тулд хэмжигдэхүүний нэр болон тоон утгыг оруулна.</AppText>}
    {field('observation','3. Ажигла')}
    <GameButton title={attempt.revealed?'Тайлбар хураах':'Өөрийн ажиглалтыг хүлээгдэх үр дүнтэй харьцуулах'} disabled={!canReveal} size="md" variant="secondary" onPress={()=>commit({...attempt,revealed:!attempt.revealed})}/>
    {!canReveal&&<AppText variant="caption">Тайлбарыг нээхийн өмнө өөрийн ажиглалтыг дээр бичээрэй.</AppText>}
    {attempt.revealed&&canReveal&&<RichText>{expected??attempt.trials[attempt.trials.length-1]?.observation??definition?.variables??'Хэмжилтүүдээ харьцуулж нотолгоогоо тайлбарла.'}</RichText>}
    {field('conclusion','4. Нотолгоонд тулгуурлан дүгнэ')}
    {onReviewed&&<GameButton title={reviewed?'Судалгаа тэмдэглэгдсэн ✓':'Судалгааг дууссан гэж тэмдэглэх'} size="md" disabled={reviewed} onPress={()=>{
      if(!canReveal||!attempt.conclusion.trim()){setFeedback('Дууссан гэж тэмдэглэхийн өмнө ажиглалт, дүгнэлтээ бичээрэй.');return;}
      onReviewed();setFeedback('Судалгаа тэмдэглэгдлээ.');
    }}/>}
    {!!feedback&&<AppText variant="caption" accessibilityLiveRegion="polite" color={Colors.cyan}>{feedback}</AppText>}
    <AppText variant="caption" color={error?Colors.danger:Colors.textMuted}>{error?'Хадгалалт амжилтгүй. Дахин хадгалах товчийг дар.':'Төхөөрөмжид хадгална · Автомат зөв/буруу үнэлгээ биш.'}</AppText>
    {error&&<GameButton title="Дахин хадгалах" size="sm" onPress={()=>commit(attempt)}/>}
  </View>;
}
const styles=StyleSheet.create({body:{gap:10},row:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},input:{backgroundColor:Colors.input,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.sm,padding:12,minHeight:48,color:Colors.text,fontFamily:Fonts.regular,textAlignVertical:'top'},choice:{borderWidth:1,borderColor:Colors.border,borderRadius:Radius.sm,padding:12,minHeight:44},result:{gap:4,borderBottomWidth:1,borderColor:Colors.border,paddingVertical:8}});
