/** chem-n4: centre [8.3, -14.55], width 2.6 m, depth .7 m.
 * Match its inset placement surface; include small raised supports above it. */
export function isWorkbenchPosition(at: { x: number; y: number; z: number }, height = .9): boolean {
  return at.x >= 7.02 && at.x <= 9.58 && at.z >= -14.89 && at.z <= -14.21 && at.y >= height - .035 && at.y <= height + .42;
}

/** Put the primary Grade 9 instrument in the visible centre, with stock behind it.
 * The front row avoids its footprint even for the largest recipe. */
export function grade9SupplyPosition(slot:number):[number,number,number]{
 if(slot===0)return [8.25,.915,-14.36];
 const stock=slot-1;
 if(stock<12)return [7.65+stock%6*.24,.915,-14.79+Math.floor(stock/6)*.2];
 return [[7.65,7.9,8.65,8.9][(stock-12)%4],.915,-14.36];
}
