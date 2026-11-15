// Source coordinates shared by the print and its spacing checks. The trail
// retains every original control point; only its numbered annotations move.
export function mapGeometry(variant) {
  const width = 1000, height = variant === 'tall' ? 1250 : 700;
  const scale = variant === 'tall' ? 1.25 : 1;
  const route = [[.07,.955],[.15,.84],[.085,.69],[.18,.55],[.11,.38],[.2,.22],[.31,.11],[.45,.075],[.6,.105],[.72,.06],[.8,.17],[.87,.12],[.905,.07]].map(([x,y])=>[x*width,y*height]);
  const samples = [];
  for (let i=0; i<route.length-1; i++) {
    const p0=route[Math.max(0,i-1)],p1=route[i],p2=route[i+1],p3=route[Math.min(route.length-1,i+2)];
    const c1=p1.map((v,k)=>v+(p2[k]-p0[k])/6), c2=p2.map((v,k)=>v-(p3[k]-p1[k])/6);
    for (let j=0;j<=100;j++) { const t=j/100,u=1-t; samples.push(p1.map((v,k)=>u*u*u*v+3*u*u*t*c1[k]+3*u*t*t*c2[k]+t*t*t*p2[k])); }
  }
  const waypoints = [1,3,5,7,9,11].map((index, i) => {
    const anchor=route[index], tangent=route[index+1].map((v,k)=>v-route[index-1][k]);
    const length=Math.hypot(...tangent), n=[-tangent[1]/length,tangent[0]/length];
    for (let distance=16*scale;distance<=40*scale;distance+=2*scale) {
      for (const sign of [1,-1]) {
        const normal=n.map(v=>v*sign), center=anchor.map((v,k)=>v+normal[k]*distance), radius=5.5*scale;
        let label;
        if (Math.abs(normal[1])>.7) {
          const y=center[1]+(normal[1]>0?21:-10)*scale;
          label={x:center[0],y,anchor:'middle',bounds:[center[0]-8*scale,y-11*scale,16*scale,13*scale]};
        } else {
          const left=normal[0]<0, x=center[0]+(left?-10:10)*scale, y=center[1]+4*scale;
          label={x,y,anchor:left?'end':'start',bounds:[left?x-16*scale:x,y-11*scale,16*scale,13*scale]};
        }
        const [x,y,w,h]=label.bounds;
        const circleGap=Math.min(...samples.map(p=>Math.hypot(p[0]-center[0],p[1]-center[1])))-radius-2.3;
        const labelGap=Math.min(...samples.map(p=>Math.hypot(Math.max(x-p[0],0,p[0]-x-w),Math.max(y-p[1],0,p[1]-y-h))))-1.3;
        if (circleGap>=5 && labelGap>=5 && x>20 && x+w<980 && y>20 && y+h<height-20) return {number:i+1,anchor,center,radius,label};
      }
    }
    throw new Error(`No clear annotation position for waypoint ${i+1} (${variant})`);
  });
  return {width,height,scale,route,waypoints};
}
