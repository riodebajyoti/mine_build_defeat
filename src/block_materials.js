import * as THREE from 'three';
// Original 16-pixel artwork, generated once and shared by every chunk.
function material(base, kind='rock') {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
 const c=canvas.getContext('2d');
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const n=((x*37+y*73+x*y*11)%29-14)*.018;
  let color=new THREE.Color(base);color.multiplyScalar(1+n);
  if(kind==='bark' && (x%5===0||((y+x)%11===0)))color.multiplyScalar(.65);
  if(kind==='brick' && (y%5===0||(x+(Math.floor(y/5)%2)*4)%8===0))color.multiplyScalar(.5);
  if(kind==='grassSide'&&y<3+(x*3%3))color=new THREE.Color('#568d32').multiplyScalar(1+n);
  c.fillStyle='#'+color.getHexString();c.fillRect(x,y,1,1);
 }
 const map=new THREE.CanvasTexture(canvas);map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestMipmapLinearFilter;map.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map,roughness:.92});
}
export function createBlockMaterials(){
 const dirt=material('#88603e'),grass=material('#65963c'),side=material('#88603e','grassSide');
 return {Dirt:dirt,Grass:[side,side,grass,dirt,side,side],Stone:material('#888b89'),Wood:material('#795631','bark'),Leaves:material('#3c7638'),Steel:material('#9ba8ae','brick'),SnowGrass:material('#e9f3ed'),SnowStone:material('#c6d1d0'),MossStone:material('#6c7960','brick'),Crystal: new THREE.MeshStandardMaterial({map:material('#63eadb').map,emissive:0x126c63,emissiveIntensity:.7}),Water:new THREE.MeshStandardMaterial({color:0x389dc2,transparent:true,opacity:.7,roughness:.2})};
}
