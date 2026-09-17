import * as THREE from 'three';
import {Animal} from './animal.js';
import {SITES} from './adventure_sites.js';
export class Adventure {
 constructor(scene,{worldId='default',state=null,cinematic=false}={}){
  this.state=state;this.cinematic=cinematic;this.key='mbd-adventure-v1:'+worldId;this.stage=0;this.elapsed=0;
  if(!cinematic)try{const n=JSON.parse(localStorage.getItem(this.key));if(Number.isInteger(n)&&n>=0&&n<=4)this.stage=n;}catch{}
  this.markers=[];this.farmAnimals=[];this.crops=[];this.cropAge=180;this.farmNear=false;
  const box=(group,w,h,d,x,y,z,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.85}));m.position.set(x,y,z);group.add(m);return m;};
  SITES.forEach(s=>{const g=new THREE.Group();g.position.set(s.x,s.y-.5,s.z);scene.add(g);
   if(s.id==='farm'){
    for(let i=0;i<3;i++){const npc=new THREE.Group();npc.position.set(-3+i*3,0,2);g.add(npc);box(npc,.65,1,.5,0,.9,0,[0x678645,0x8a603e,0x586d88][i]);box(npc,.6,.6,.6,0,1.7,0,0xbb8860);box(npc,.2,.2,.2,0,1.65,-.36,0xa47850);box(npc,.85,.1,.8,0,2.06,0,0xb9a35f);box(npc,.22,.5,.3,-.18,.25,0,0x493d30);box(npc,.22,.5,.3,.18,.25,0,0x493d30);box(npc,.72,.25,.25,0,1,-.35,0x8a694e);}
    for(let x=-3;x<=3;x++)for(let z=-4;z<=-2;z++){box(g,.9,.1,.9,x,.04,z,0x593c27);this.crops.push(box(g,.12,.8,.12,x,.48,z,0x83a845));}
    for(let i=0;i<3;i++){const animal=new Animal(scene,new THREE.Vector3(s.x,s.y,s.z),['sheep','pig','cow'][i]);animal.group.position.set(s.x-3+i*3,s.y-.5,s.z+6);this.farmAnimals.push(animal);}
   }else if(s.id==='camp'){box(g,.7,1.1,.5,0,.9,1,0x567742);box(g,.62,.62,.62,0,1.77,1,0xbb8860);box(g,.2,.24,.24,0,1.72,.6,0xa57852);box(g,.23,.6,.25,-.2,.25,1,0x3b302a);box(g,.23,.6,.25,.2,.25,1,0x3b302a);box(g,1,.15,1,2,.12,0,0x65422b);const flame=box(g,.4,.6,.4,2,.5,0,0xffb443);const light=new THREE.PointLight(0xffaa44,2,10);light.position.set(2,1,0);g.add(light);this.flame=flame;}
   else{const m=box(g,.9,.6,.7,0,.4,0,s.id==='ruin'?0x9b692b:0x45e1d2);box(g,1,.1,.8,0,.75,0,0xe4c367);this.markers.push(m);if(s.id==='cave'){const l=new THREE.PointLight(0x46efdc,3,12);l.position.y=2;g.add(l);}}
  });
  if(!cinematic){this.panel=document.createElement('div');this.panel.style.cssText='position:fixed;left:16px;bottom:125px;z-index:8;max-width:min(310px,70vw);padding:12px 16px;background:#14201de8;color:#eee6c9;border:2px solid #8a9a63;font:14px/1.5 monospace;pointer-events:none';document.body.append(this.panel);
   this.button=document.createElement('button');this.button.textContent='Interact · F';this.button.style.cssText='position:fixed;right:18px;top:45%;z-index:20;padding:14px;background:#416333;color:white;border:2px solid #b9c995;display:none';document.body.append(this.button);this.button.onclick=()=>this.interact();
   document.addEventListener('keydown',e=>{if(e.code==='KeyF'&&!e.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)&&!e.target.isContentEditable&&state.isPointerLocked)this.interact();});
  }
 }
 target(){return SITES[[0,1,2,0][Math.min(this.stage,3)]];}
 interact(){if(this.farmNear){if(this.cropAge>=180){this.cropAge=0;this.state.addResource('Carrot',4);}return;}if(this.stage>=4||!this.near)return;this.stage++;try{localStorage.setItem(this.key,JSON.stringify(this.stage));}catch{}if(this.stage===4){this.state.addResource('Steel',12);this.state.addResource('Cores',3);this.state.hp=Math.min(100,this.state.hp+40);this.state.notify();}}
 update(dt,position){this.elapsed+=dt;this.cropAge=Math.min(180,this.cropAge+dt);this.crops.forEach(c=>c.scale.y=.15+.85*this.cropAge/180);this.farmAnimals.forEach((a,i)=>{const t=this.elapsed*.13+i*2;a.group.position.set(24+Math.sin(t)*3,4.5,7+Math.cos(t)*.8);a.group.rotation.y=Math.atan2(Math.cos(t)*3,-Math.sin(t)*.8);a.legs.forEach((l,j)=>l.rotation.x=Math.sin(this.elapsed*4+j%2*Math.PI)*.2);});if(this.flame)this.flame.scale.y=1+Math.sin(this.elapsed*9)*.15;this.markers.forEach(m=>m.rotation.y=Math.sin(this.elapsed*.8)*.1);
  if(this.cinematic)return;this.farmNear=Math.hypot(position.x-24,position.z+3)<4&&Math.abs(position.y-6)<4;const target=this.target();const distance=Math.hypot(position.x-target.x,position.z-target.z);this.near=distance<3.5&&Math.abs(position.y-(target.y+1.5))<4;
  this.panel.style.display=this.state.isPointerLocked?'block':'none';this.button.style.display=this.state.isPointerLocked&&(this.farmNear||this.near&&this.stage<4)?'block':'none';
  const tasks=['Meet the explorer at camp','Recover the watchtower relic','Collect the cavern crystal','Return to the explorer','Adventure complete!'];
  const bearing=Math.atan2(target.x-position.x,-(target.z-position.z))*180/Math.PI;
  this.button.textContent=this.farmNear?(this.cropAge>=180?'Harvest · F':`Growing · ${Math.ceil(180-this.cropAge)}s`):'Interact · F';this.panel.textContent=this.farmNear?`WILLOW FARMSTEAD\n${this.cropAge>=180?'Press F / tap Harvest · 4 carrots':'Crops are regrowing'}\nThree farmers · sheep, pig, and cow`:this.stage===4?'✦ Adventure complete · Steel +12 · Cores +3\nVisit Willow farmstead: X 24 / Z 0\nHarvest carrots with F or Interact':`✦ THE LOST BEACON · ${this.stage+1}/4\n${tasks[this.stage]}\n${target.name} · ${Math.round(distance)} blocks · ${Math.round((bearing+360)%360)}°\n${this.near?'Press F or tap Interact':`X ${target.x} / Z ${target.z}`}`;this.panel.style.whiteSpace='pre-line';
 }
}
