// Terrain landmarks are applied before player edits, so saved edits always win.
export const SITES=[{id:'camp',name:"Explorer's camp",x:-25,z:-9,y:5},{id:'ruin',name:'Ancient watchtower',x:-27,z:25,y:5},{id:'cave',name:'Crystal cavern',x:22,z:-23,y:5},{id:'farm',name:'Willow farmstead',x:24,z:0,y:5}];
export function applyAdventureSites(world,chunk){
 const put=(x,y,z,type)=>{if(Math.floor(x/16)!==chunk.cx||Math.floor(z/16)!==chunk.cz)return;const k=`${x},${y},${z}`;if(type){chunk.blocks.set(k,type);world.blocks.set(k,type);}else{chunk.blocks.delete(k);world.blocks.delete(k);}};
 for(const s of SITES){
 if(Math.abs(s.x-(chunk.cx*16+8))>16||Math.abs(s.z-(chunk.cz*16+8))>16)continue;
 for(let dx=-5;dx<=5;dx++)for(let dz=-5;dz<=(s.id==='farm'?8:5);dz++){
  const x=s.x+dx,z=s.z+dz;
  for(let y=-2;y<s.y;y++)put(x,y,z,y===s.y-1?'Grass':'Stone');
  for(let y=s.y;y<s.y+12;y++)put(x,y,z,null);
  if(s.id==='ruin'){
   if(Math.abs(dx)<=3&&Math.abs(dz)<=3)put(x,s.y-1,z,'MossStone');
   if((Math.abs(dx)===3&&Math.abs(dz)<=3)||(Math.abs(dz)===3&&Math.abs(dx)<=3))for(let h=0;h<3+Math.abs((dx*7+dz*3)%4);h++)if(!(dz===-3&&Math.abs(dx)<=1&&h<3))put(x,s.y+h,z,'MossStone');
  }
  if(s.id==='cave'&&Math.abs(dx)<=4&&Math.abs(dz)<=4){
   for(let h=0;h<=5;h++)if(h===5||Math.abs(dx)===4||dz===4||dz===-4&&Math.abs(dx)>1)put(x,s.y+h,z,(dx+dz+h)%11===0?'Crystal':'Stone');
  }
  if(s.id==='farm'&&Math.abs(dx)<=2&&dz>=1&&dz<=4){put(x,s.y+3,z,'Wood');if(Math.abs(dx)===2||dz===4)for(let h=0;h<3;h++)put(x,s.y+h,z,'Wood');}
  if(s.id==='camp'&&Math.abs(dx)<=2&&dz>=1&&dz<=3){put(x,s.y+3,z,'Wood');if(Math.abs(dx)===2)for(let h=0;h<3;h++)put(x,s.y+h,z,'Wood');}
 }
 }
}
