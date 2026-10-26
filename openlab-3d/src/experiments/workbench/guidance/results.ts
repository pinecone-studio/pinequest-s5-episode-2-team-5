import {create} from 'zustand';
export interface Reading {label:string;value:number;unit:string;}
export interface ProtocolRecord {label:string;readings:Reading[];}
export const useProtocolResults=create<{experiment:string|null;records:ProtocolRecord[];complete:boolean;wasteMass:number}>(()=>({experiment:null,records:[],complete:false,wasteMass:0}));
export function beginProtocolResults(experiment:string){useProtocolResults.setState({experiment,records:[],complete:false,wasteMass:0});}
