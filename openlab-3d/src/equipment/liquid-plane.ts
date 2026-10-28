import {radiusAt,rimHeight,type VesselProfile} from './profiles';
export type Normal3=[number,number,number];
/** Integrate circular slices below a gravity plane. Units: metres and mL. */
export function volumeBelow(p:VesselProfile,n:Normal3,h:number,slices=48){
 const side=Math.hypot(n[0],n[2]);
 if(side<1e-8){
  const integrate=(limit:number)=>{let sum=0;for(let i=1;i<p.wall.length;i++){const [r0,y0]=p.wall[i-1],[r1,y1]=p.wall[i],dy=Math.max(0,Math.min(y1,limit)-y0);if(dy<=0||y1<=y0)continue;const slope=(r1-r0)/(y1-y0);sum+=Math.PI*(r0*r0*dy+r0*slope*dy*dy+slope*slope*dy*dy*dy/3);}return sum*1e6;};
  return n[1]>=0?integrate(h/n[1]):integrate(rimHeight(p))-integrate(h/n[1]);
 }
 const bottom=p.wall[0][1],dy=(rimHeight(p)-bottom)/slices,s=Math.hypot(n[0],n[2]);let volume=0;
 for(let i=0;i<slices;i++){
  const y=bottom+(i+.5)*dy,r=radiusAt(p,y),u=s>1e-9?(h-n[1]*y)/s:h>=n[1]*y?Infinity:-Infinity;
  const area=u<=-r?0:u>=r?Math.PI*r*r:r*r*(Math.asin(u/r)+Math.PI/2)+u*Math.sqrt(Math.max(0,r*r-u*u));volume+=area*dy;
 }return volume*1e6;
}
export function liquidPlane(p:VesselProfile,n:Normal3,ml:number){
 const bottom=p.wall[0][1],top=rimHeight(p),r=Math.max(...p.wall.map(v=>v[0])),s=Math.hypot(n[0],n[2]);
 let low=Math.min(n[1]*bottom,n[1]*top)-s*r,high=Math.max(n[1]*bottom,n[1]*top)+s*r;
 for(let i=0;i<22;i++){const mid=(low+high)/2;if(volumeBelow(p,n,mid)<ml)low=mid;else high=mid;}
 return (low+high)/2;
}
/** An interior point on the plane, used to cap the clipped liquid surface. */
export function planeInterior(p:VesselProfile,n:Normal3,h:number):Normal3{
 const bottom=p.wall[0][1],top=rimHeight(p),s=Math.hypot(n[0],n[2]);
 if(s<1e-8)return [0,h/n[1],0];
 let first:number|undefined,last=bottom;
 for(let i=0;i<128;i++){const y=bottom+(i+.5)*(top-bottom)/128,u=(h-n[1]*y)/s;if(Math.abs(u)<radiusAt(p,y)){first??=y;last=y;}}
 const y=first===undefined?(bottom+top)/2:(first+last)/2,u=(h-n[1]*y)/s;return [n[0]/s*u,y,n[2]/s*u];
}

/** Minimum tilt at which the current liquid reaches the lower edge of the open rim. */
export function pourTilt(p:VesselProfile,ml:number){
 let lo=0,hi=1.5;const top=rimHeight(p),r=radiusAt(p,top);
 for(let i=0;i<16;i++){const a=(lo+hi)/2,n:Normal3=[-Math.sin(a),Math.cos(a),0],lip=n[1]*top-Math.abs(n[0])*r;if(volumeBelow(p,n,lip)>ml)lo=a;else hi=a;}
 return Math.min(1.5,(lo+hi)/2+.015);
}

/**
 * Liquid (mL) an open vessel keeps when tilted so its axis has world-up component `upY`: what
 * lies below the lower lip of its rim. Anything more runs out.
 */
export function heldAtTilt(p:VesselProfile,upY:number){
 if(upY>=.9995)return Infinity;
 if(upY<=0)return 0;
 const a=Math.acos(upY),n:Normal3=[-Math.sin(a),Math.cos(a),0],top=rimHeight(p);
 return volumeBelow(p,n,n[1]*top-Math.abs(n[0])*radiusAt(p,top));
}
