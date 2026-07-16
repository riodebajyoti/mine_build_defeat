// Generates Minecraft-style 16x16 pixel art icons as canvas data URLs.
// Each icon is cached after first generation.

const _cache = new Map();       // data URL cache
const _canvasCache = new Map(); // canvas element cache
const S = 16; // canvas size

function _getOrCreateCanvas(name) {
    if (_canvasCache.has(name)) return _canvasCache.get(name);
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, S, S);
    _drawIcon(ctx, name);
    _canvasCache.set(name, canvas);
    return canvas;
}

export function getItemIcon(name) {
    if (_cache.has(name)) return _cache.get(name);
    const url = _getOrCreateCanvas(name).toDataURL();
    _cache.set(name, url);
    return url;
}

// Returns the raw canvas — use with new THREE.CanvasTexture(canvas)
export function getItemCanvas(name) {
    return _getOrCreateCanvas(name);
}

// ── low-level helpers ─────────────────────────────────────────────────────

function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
function fill(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function bg(ctx, c) { fill(ctx, 0, 0, S, S, c); }

function lighten(hex, amt) {
    if (!hex.startsWith('#')) return hex;
    const r = Math.min(255, parseInt(hex.slice(1,3),16)+amt);
    const g = Math.min(255, parseInt(hex.slice(3,5),16)+amt);
    const b = Math.min(255, parseInt(hex.slice(5,7),16)+amt);
    return `rgb(${r},${g},${b})`;
}
function darken(hex, amt) {
    if (!hex.startsWith('#')) return hex;
    const r = Math.max(0, parseInt(hex.slice(1,3),16)-amt);
    const g = Math.max(0, parseInt(hex.slice(3,5),16)-amt);
    const b = Math.max(0, parseInt(hex.slice(5,7),16)-amt);
    return `rgb(${r},${g},${b})`;
}

// ── block textures ────────────────────────────────────────────────────────

function drawDirt(ctx) {
    bg(ctx, '#8B5E3C');
    [[1,1],[4,3],[7,1],[11,2],[14,4],[2,6],[6,5],[9,7],[13,6],[1,9],[5,10],[8,8],[12,10],[3,12],[7,13],[10,12],[14,13]].forEach(([x,y]) => fill(ctx,x,y,2,2,'#5C3A1E'));
    [[3,2],[8,5],[13,1],[5,8],[11,9],[2,13]].forEach(([x,y]) => px(ctx,x,y,'#A87850'));
    fill(ctx,0,14,16,2,'#6B4A2A'); fill(ctx,14,0,2,14,'#6B4A2A');
}

function drawGrass(ctx) {
    drawDirt(ctx);
    fill(ctx,0,0,16,4,'#5AAD14');
    [[0,4],[4,4],[8,4],[12,4],[2,5],[7,5],[11,5],[15,5]].forEach(([x,y]) => px(ctx,x,y,'#5AAD14'));
    [[1,1],[5,0],[9,2],[13,1],[3,3],[11,0]].forEach(([x,y]) => px(ctx,x,y,'#3A8A08'));
    [[2,0],[6,2],[10,1],[14,0],[4,2],[12,2]].forEach(([x,y]) => px(ctx,x,y,'#70C828'));
}

function drawStone(ctx) {
    bg(ctx, '#848484');
    [[3,1],[4,1],[5,2],[5,3],[6,3],[6,4],[10,5],[11,5],[11,6],[12,6],[12,7],[2,8],[2,9],[3,9],[3,10],[4,10],[9,11],[10,11],[10,12],[11,12],[11,13]].forEach(([x,y]) => px(ctx,x,y,'#545454'));
    [[0,0],[1,0],[0,1],[7,7],[8,7],[7,8],[15,14],[15,15],[14,15]].forEach(([x,y]) => px(ctx,x,y,'#9C9C9C'));
    fill(ctx,0,14,16,2,'#6C6C6C'); fill(ctx,14,0,2,14,'#6C6C6C');
}

function drawWood(ctx) {
    bg(ctx, '#6E4818');
    for (let y = 2; y < 16; y += 4) fill(ctx,0,y,16,1,'#5A3A10');
    for (let x = 0; x < 16; x += 5) fill(ctx,x,0,2,16,'#7C5222');
    fill(ctx,5,4,6,6,'#5A3A10'); fill(ctx,6,5,4,4,'#4A2A08'); px(ctx,7,6,'#8A6028');
    fill(ctx,0,14,16,2,'#5A3A10');
}

function drawSteel(ctx) {
    bg(ctx, '#727272');
    fill(ctx,0,0,16,1,'#949494'); fill(ctx,0,0,1,16,'#949494');
    fill(ctx,0,0,8,8,'#7C7C7C');
    fill(ctx,14,0,2,16,'#505050'); fill(ctx,0,14,16,2,'#505050');
    [[2,2],[13,2],[2,13],[13,13]].forEach(([x,y]) => { px(ctx,x,y,'#404040'); px(ctx,x+1,y,'#969696'); });
    for (let i=0;i<16;i++) { const a = 0.03+0.02*(i<8?i/8:(16-i)/8); fill(ctx,i,0,1,16,`rgba(255,255,255,${a.toFixed(2)})`); }
}

function drawLeaves(ctx) {
    bg(ctx, '#3A7A12');
    [[1,2],[5,0],[9,1],[13,3],[3,5],[7,4],[11,6],[2,8],[6,7],[10,9],[14,8],[4,11],[8,10],[12,12],[1,13],[5,14]].forEach(([x,y]) => px(ctx,x,y,'#5AA020'));
    [[3,1],[7,3],[11,2],[2,6],[6,5],[10,7],[0,9],[4,10],[8,12],[13,10],[3,13],[9,14]].forEach(([x,y]) => px(ctx,x,y,'#2A5A08'));
}

function drawSnowGrass(ctx) {
    drawGrass(ctx);
    fill(ctx,0,0,16,3,'#E0ECF8');
    [[2,3],[5,3],[9,3],[13,3]].forEach(([x,y]) => px(ctx,x,y,'#E0ECF8'));
}

function drawSnowStone(ctx) {
    drawStone(ctx);
    fill(ctx,0,0,16,2,'#D8E8F0');
}

function drawCores(ctx) {
    bg(ctx,'#1A2A4A');
    for (let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const d = Math.sqrt((x-7.5)**2+(y-7.5)**2);
        if (d<7) { const a=d/7; fill(ctx,x,y,1,1,`rgb(${Math.round(20+a*10)},${Math.round(40+a*20)},${Math.round(100+a*80)})`); }
    }
    // glowing orb in center
    [7,8].forEach(cx=>[7,8].forEach(cy=>{ px(ctx,cx,cy,'#60B0FF'); }));
    [[6,7],[9,7],[7,6],[7,9],[6,8],[9,8],[8,6],[8,9]].forEach(([x,y])=>px(ctx,x,y,'#3080D0'));
    [[5,7],[10,7],[7,5],[7,10]].forEach(([x,y])=>px(ctx,x,y,'#1050A0'));
}

// ── tool / weapon textures ────────────────────────────────────────────────

function drawSword(ctx, blade, guard='#C8A020') {
    // diagonal blade top-right to bottom-left
    const diag = [[13,0],[12,1],[11,1],[11,2],[10,2],[10,3],[9,3],[9,4],[8,4],[8,5],[7,5],[7,6],[6,6],[6,7],[5,7],[5,8]];
    diag.forEach(([x,y],i) => { fill(ctx,x,y,2,2,blade); if(i<4) px(ctx,x+1,y-1<0?0:y-1,lighten(blade,40)); });
    // guard
    fill(ctx,4,8,6,2,guard);
    // handle
    [[4,10],[4,11],[3,12],[3,13],[2,14],[2,15]].forEach(([x,y])=>fill(ctx,x,y,2,1,'#6E4818'));
    px(ctx,2,15,'#A08040');
}

function drawPickaxe(ctx, matColor) {
    // handle diagonal
    for(let i=3;i<12;i++) px(ctx,i,i+3,'#6E4818');
    for(let i=3;i<12;i++) px(ctx,i+1,i+3,'#8B5E2A');
    // head
    fill(ctx,1,1,13,3,matColor);
    fill(ctx,1,2,4,6,matColor);
    fill(ctx,7,2,3,4,matColor);
    fill(ctx,13,1,2,5,matColor);
    // highlights
    fill(ctx,2,1,4,1,lighten(matColor,40));
    fill(ctx,9,1,4,1,lighten(matColor,40));
    // shade
    fill(ctx,1,3,3,1,darken(matColor,30));
}

function drawAxe(ctx, matColor) {
    for(let i=2;i<13;i++) px(ctx,13-i+2,i+2,'#6E4818');
    for(let i=2;i<13;i++) px(ctx,13-i+3,i+2,'#8B5E2A');
    fill(ctx,1,1,9,8,matColor);
    fill(ctx,9,1,3,5,matColor);
    fill(ctx,2,1,5,1,lighten(matColor,40));
    fill(ctx,1,2,1,5,lighten(matColor,20));
    fill(ctx,9,8,2,1,darken(matColor,30));
}

function drawShovel(ctx, matColor) {
    for(let y=7;y<15;y++) fill(ctx,7,y,2,1,'#6E4818');
    fill(ctx,4,1,8,6,matColor);
    fill(ctx,3,3,10,4,matColor);
    fill(ctx,5,1,4,1,lighten(matColor,40));
    fill(ctx,4,2,1,4,lighten(matColor,20));
}

function drawHoe(ctx, matColor) {
    for(let i=1;i<12;i++) px(ctx,i+4,i+3,'#6E4818');
    fill(ctx,1,1,10,2,matColor);
    fill(ctx,1,1,2,6,matColor);
    fill(ctx,2,1,4,1,lighten(matColor,40));
}

function drawRod(ctx, c1='#D06010', c2='#A04000') {
    for(let i=0;i<14;i++) { px(ctx,i+1,14-i,c1); px(ctx,i+2,14-i,c2); }
    px(ctx,1,14,'#FF8000'); px(ctx,2,14,'#FF6000');
}

function drawBow(ctx) {
    [[3,0],[2,1],[2,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],[1,11],[2,12],[2,13],[3,14],[3,15]].forEach(([x,y])=>px(ctx,x,y,'#8B6040'));
    for(let y=1;y<15;y++) px(ctx,13,y,'#D4C490');
    fill(ctx,3,7,10,1,'#C8A060');
    fill(ctx,13,7,2,1,'#D04040');
}

function drawCrossbow(ctx) {
    fill(ctx,0,7,16,2,'#6E4818'); // horizontal stock
    fill(ctx,7,0,2,16,'#C8C8C8'); // vertical bow/string
    fill(ctx,3,6,10,4,'#8B6040'); // body
    px(ctx,7,0,'#D0D0D0'); px(ctx,8,0,'#D0D0D0');
    px(ctx,7,15,'#D0D0D0'); px(ctx,8,15,'#D0D0D0');
}

function drawShield(ctx) {
    fill(ctx,2,1,12,10,'#8B6040');
    fill(ctx,1,3,14,7,'#8B6040');
    fill(ctx,3,11,10,3,'#8B6040');
    fill(ctx,5,13,6,2,'#8B6040');
    fill(ctx,7,2,2,9,'#C8A020');
    fill(ctx,3,5,10,2,'#C8A020');
    fill(ctx,3,1,4,1,lighten('#8B6040',30));
}

function drawTrident(ctx) {
    for(let y=7;y<16;y++) fill(ctx,7,y,2,1,'#5878B8');
    fill(ctx,5,0,2,9,'#6888C8'); fill(ctx,11,0,2,9,'#6888C8'); fill(ctx,7,0,2,11,'#88A8E0');
    [[5,0],[6,0],[11,0],[12,0],[7,0],[8,0],[9,0],[10,0]].forEach(([x,y])=>px(ctx,x,y,'#A8C8F8'));
    fill(ctx,4,4,4,2,'#4060A0'); fill(ctx,10,4,4,2,'#4060A0');
}

function drawArrow(ctx) {
    for(let i=2;i<14;i++) px(ctx,i,i,'#C8A060');
    [[1,1],[2,1],[1,2]].forEach(([x,y])=>px(ctx,x,y,'#C04040'));
    [[2,1],[1,2]].forEach(([x,y])=>px(ctx,x,y,'#E06060'));
    [[13,13],[14,13],[13,14],[14,14]].forEach(([x,y])=>px(ctx,x,y,'#E8E8D8'));
}

function drawFishingRod(ctx) {
    for(let i=0;i<14;i++) { px(ctx,i,i,'#8B6040'); px(ctx,i+1,i,'#A07040'); }
    for(let y=13;y<16;y++) px(ctx,14,y,'#D4C490');
    px(ctx,13,15,'#80C040'); px(ctx,14,15,'#80C040');
}

// ── armor ─────────────────────────────────────────────────────────────────

function drawHelmet(ctx, c) {
    fill(ctx,3,2,10,9,c); fill(ctx,2,4,12,7,c); fill(ctx,3,11,10,2,c);
    fill(ctx,4,5,8,4,darken(c,60));
    fill(ctx,4,2,4,2,lighten(c,40)); fill(ctx,9,2,3,2,lighten(c,30));
    fill(ctx,2,4,2,5,lighten(c,20)); fill(ctx,13,4,1,5,darken(c,30));
}

function drawChestplate(ctx, c) {
    fill(ctx,2,2,12,13,c); ctx.clearRect(5,2,6,3);
    fill(ctx,3,3,4,2,lighten(c,30)); fill(ctx,10,3,3,2,lighten(c,30));
    fill(ctx,12,4,2,10,darken(c,30)); fill(ctx,2,13,10,2,darken(c,20));
}

function drawLeggings(ctx, c) {
    fill(ctx,2,0,12,5,c); fill(ctx,2,4,5,11,c); fill(ctx,9,4,5,11,c);
    fill(ctx,3,1,5,2,lighten(c,30)); fill(ctx,13,2,1,10,darken(c,30));
}

function drawBoots(ctx, c) {
    fill(ctx,3,3,10,8,c); fill(ctx,1,8,14,6,c); fill(ctx,1,12,3,3,c); fill(ctx,12,12,3,3,c);
    fill(ctx,4,4,4,2,lighten(c,30)); fill(ctx,13,5,1,7,darken(c,30));
}

function drawElytra(ctx) {
    fill(ctx,0,3,7,12,'#6868A0'); fill(ctx,0,5,4,8,'#4848A0');
    fill(ctx,9,3,7,12,'#6868A0'); fill(ctx,12,5,4,8,'#4848A0');
    fill(ctx,6,1,4,14,'#303050');
    fill(ctx,1,4,2,6,'#8888C0'); fill(ctx,13,4,2,6,'#8888C0');
}

function drawTurtleShell(ctx) {
    drawHelmet(ctx,'#5A8A3A');
    fill(ctx,3,5,5,4,'#3A6A1A'); fill(ctx,9,5,4,4,'#3A6A1A');
    fill(ctx,5,9,6,3,'#3A6A1A'); fill(ctx,4,6,2,2,'#70AA50'); fill(ctx,10,6,2,2,'#70AA50');
}

// ── food ──────────────────────────────────────────────────────────────────

function drawApple(ctx, golden=false) {
    const red = golden ? '#F0C000' : '#CC2020';
    fill(ctx,7,0,2,3,'#5C3D1E'); fill(ctx,9,1,4,2,'#3A8A10');
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8.5; if(dx*dx*0.8+dy*dy<30) {
            px(ctx,x,y,dy<-1?lighten(red,25):red);
        }
    }
    fill(ctx,4,4,3,3,lighten(red,50)); px(ctx,5,4,lighten(red,70));
    if(golden) { [[3,7],[3,8],[12,7],[12,8],[5,12],[6,13],[10,12],[9,13]].forEach(([x,y])=>px(ctx,x,y,'#FFE040')); }
}

function drawBread(ctx) {
    fill(ctx,2,4,12,8,'#C8901E');
    fill(ctx,1,6,14,5,'#C8901E');
    fill(ctx,3,3,10,3,lighten('#C8901E',20));
    fill(ctx,4,3,6,1,lighten('#C8901E',40));
    fill(ctx,13,6,2,6,darken('#C8901E',30)); fill(ctx,2,12,12,2,darken('#C8901E',20));
}

function drawMeat(ctx, color='#C05020', cooked=false) {
    const c = cooked ? darken(color,20) : color;
    fill(ctx,2,4,12,8,c); fill(ctx,1,6,14,5,c);
    fill(ctx,3,4,4,2,lighten(c,30)); fill(ctx,5,12,3,2,darken(c,30));
    fill(ctx,11,5,3,2,cooked ? '#402010' : lighten(c,20));
    // bone
    fill(ctx,1,12,3,3,'#E8DEC8'); fill(ctx,12,12,3,3,'#E8DEC8');
    fill(ctx,1,13,1,1,'#F8EED8'); fill(ctx,14,13,1,1,'#F8EED8');
}

function drawFish(ctx, color='#4090C0') {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8; if(dx*dx/36+dy*dy/16<1) px(ctx,x,y,dy<0?lighten(color,20):color);
    }
    // tail
    [[1,5],[0,6],[0,7],[0,8],[0,9],[0,10],[1,10]].forEach(([x,y])=>px(ctx,x,y,darken(color,20)));
    // eye
    px(ctx,12,7,'#000'); px(ctx,12,8,'#000');
    fill(ctx,6,7,2,3,lighten(color,40));
}

function drawCarrot(ctx,golden=false) {
    const c = golden ? '#F0C000' : '#FF7010';
    for(let y=3;y<16;y++) for(let x=0;x<16;x++) {
        const w=(16-y)*0.6; if(Math.abs(x-8)<w) px(ctx,x,y,Math.abs(x-8)<w*0.5?lighten(c,20):c);
    }
    fill(ctx,6,0,1,4,'#3A8A10'); fill(ctx,8,0,2,5,'#3A8A10'); fill(ctx,10,1,1,3,'#3A8A10');
}

function drawPotato(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8; if(dx*dx/30+dy*dy/25<1) px(ctx,x,y,dy<0?'#C8A020':'#A07818');
    }
    [[5,5],[9,4],[6,10],[10,9]].forEach(([x,y])=>px(ctx,x,y,'#806010'));
}

function drawCake(ctx) {
    // plate
    fill(ctx,1,12,14,3,'#D4C090');
    // layers
    fill(ctx,2,7,12,6,'#E8C0A0'); fill(ctx,2,4,12,3,'#F8E8F0'); fill(ctx,2,3,12,2,'#E04040');
    // frosting drip
    [[3,5],[7,4],[11,5],[5,6],[9,6]].forEach(([x,y])=>px(ctx,x,y,'#F8F8F8'));
    // candle
    fill(ctx,7,1,2,3,'#F0E060'); px(ctx,7,0,'#FF8000'); px(ctx,8,0,'#FF8000');
}

function drawHoney(ctx) {
    // bottle
    fill(ctx,5,1,6,2,'#D4A020'); fill(ctx,4,3,8,10,'#F0B020');
    fill(ctx,3,5,10,7,'#F0B020'); fill(ctx,4,12,8,2,'#F0B020');
    fill(ctx,5,4,3,6,'#FFD040'); px(ctx,6,4,'#FFE060'); px(ctx,7,5,'#FFE060');
    fill(ctx,11,6,2,7,darken('#F0B020',30)); fill(ctx,4,13,8,2,darken('#F0B020',20));
}

function drawMushroom(ctx, cap='#CC2020') {
    fill(ctx,3,5,10,5,cap); fill(ctx,1,7,14,4,cap);
    fill(ctx,5,3,6,3,cap); fill(ctx,6,2,4,2,cap);
    [[3,7],[7,6],[11,7],[5,8],[9,8]].forEach(([x,y])=>fill(ctx,x,y,2,2,'#F8F8F8'));
    fill(ctx,6,9,4,6,'#E8D0A8');
    fill(ctx,7,10,2,5,'#D0B890');
}

function drawBerry(ctx, c='#C02020') {
    [[5,3],[9,3],[4,5],[11,5],[3,7],[12,7],[3,9],[12,9],[4,11],[11,11],[5,13],[9,13]].forEach(([x,y])=>fill(ctx,x,y,2,2,c));
    [[5,4],[9,4]].forEach(([x,y])=>{ fill(ctx,x,y,2,1,'#3A8A10'); fill(ctx,x-1,y-1,1,1,'#3A8A10'); });
}

function drawDriedKelp(ctx) {
    bg(ctx,'rgba(0,0,0,0)');
    for(let y=0;y<16;y+=2) {
        const x=6+Math.round(Math.sin(y*0.6)*2);
        fill(ctx,x,y,3,2,'#4A7A30');
        fill(ctx,x+1,y,1,2,'#6A9A50');
    }
}

// ── materials / gems ──────────────────────────────────────────────────────

function drawDiamond(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        if(Math.abs(x-8)/6+Math.abs(y-8)/7.5<=1) px(ctx,x,y,y<8?'#50D8F0':'#10A8C0');
    }
    fill(ctx,5,2,5,2,'#90F0FF'); fill(ctx,7,3,2,2,'#70E0F0');
}

function drawEmerald(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        if(Math.abs(x-8)/4+Math.abs(y-8)/5.5<=1) px(ctx,x,y,y<8?'#50E060':'#20A030');
    }
    fill(ctx,7,3,2,3,'#90FF90'); px(ctx,8,3,'#B0FFB0');
}

function drawCoal(ctx) {
    bg(ctx,'rgba(0,0,0,0)');
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8;
        if(Math.abs(dx)<=5&&Math.abs(dy)<=5&&Math.abs(dx)+Math.abs(dy)<=9) px(ctx,x,y,dy<0?'#4A4A4A':'#252525');
    }
    [[5,4],[9,4],[6,9],[10,9]].forEach(([x,y])=>px(ctx,x,y,'#686868'));
}

function drawRedstone(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        if(Math.abs(x-8)/5+Math.abs(y-8)/6<=1) px(ctx,x,y,y<8?'#FF5040':'#CC2010');
    }
    [[7,4],[8,4],[9,4],[7,5],[9,5]].forEach(([x,y])=>px(ctx,x,y,'#FF8070'));
}

function drawGlowstone(ctx) {
    bg(ctx,'#B08A20');
    [[2,2],[6,1],[10,2],[14,2],[3,6],[7,5],[11,6],[1,10],[5,10],[9,9],[13,10],[3,13],[7,13],[11,14]].forEach(([x,y])=>fill(ctx,x,y,2,2,'#FFD060'));
    [[4,4],[8,3],[12,4],[2,8],[6,8],[10,8],[14,8],[4,11],[8,12],[12,11]].forEach(([x,y])=>px(ctx,x,y,'#FFE880'));
}

function drawLapis(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        if(Math.abs(x-8)/5+Math.abs(y-8)/6<=1) px(ctx,x,y,y<8?'#2840C8':'#1020A0');
    }
    [[7,4],[8,3],[9,4],[7,10],[9,10]].forEach(([x,y])=>px(ctx,x,y,'#6888FF'));
}

function drawIngot(ctx, c) {
    fill(ctx,3,3,10,10,c); fill(ctx,4,2,8,12,c); fill(ctx,2,4,12,8,c);
    fill(ctx,4,3,6,2,lighten(c,30)); fill(ctx,3,4,2,6,lighten(c,20));
    fill(ctx,11,4,2,8,darken(c,30)); fill(ctx,4,11,8,2,darken(c,20));
}

function drawQuartz(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        if(Math.abs(x-8)/3+Math.abs(y-8)/7<=1) px(ctx,x,y,y<6?'#F8F8F8':'#D8D0C0');
    }
    fill(ctx,7,1,2,3,'#FFFFFF'); px(ctx,8,1,'#FFFFFF');
}

function drawBlazeRod(ctx) { drawRod(ctx,'#E0A020','#C07010'); }

function drawGhastTear(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        if(Math.abs(x-8)/4+(y-3)/10<=1&&y>=3) px(ctx,x,y,y<10?'rgba(200,240,255,0.9)':'rgba(160,200,230,0.8)');
    }
    px(ctx,8,2,'#E8F8FF'); px(ctx,7,3,'#E8F8FF'); px(ctx,9,3,'#E8F8FF');
}

function drawSlimeball(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8; if(dx*dx*0.9+dy*dy*0.7<36) px(ctx,x,y,dy<0?'#80CC40':'#50A020');
    }
    [[5,6],[9,6]].forEach(([x,y])=>{px(ctx,x,y,'#000');px(ctx,x+1,y,'#000');});
    fill(ctx,5,10,6,1,'#000'); fill(ctx,4,9,1,2,'#000'); fill(ctx,11,9,1,2,'#000');
}

function drawSpiderEye(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8; if(dx*dx+dy*dy<36) px(ctx,x,y,dy<0?'#C03030':'#A02020');
    }
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8; if(dx*dx+dy*dy<16) px(ctx,x,y,'#101010');
    }
    px(ctx,10,6,'#F8F8F8'); px(ctx,11,6,'#F8F8F8'); px(ctx,10,7,'#F8F8F8');
}

function drawGunpowder(ctx) {
    bg(ctx,'rgba(0,0,0,0)');
    [[2,2],[4,1],[7,3],[10,1],[13,2],[1,5],[5,6],[8,5],[11,6],[14,5],[2,9],[6,8],[9,9],[12,8],[3,12],[7,11],[10,12],[13,11],[4,14],[8,13],[11,14]].forEach(([x,y])=>{
        fill(ctx,x,y,2,2,'#484840'); px(ctx,x,y,'#606058');
    });
}

function drawString(ctx) {
    for(let y=0;y<16;y++) {
        px(ctx,7+Math.round(Math.sin(y*0.8)),y,'#E0D8C0');
        px(ctx,9+Math.round(Math.sin(y*0.8+1)),y,'#D0C8B0');
    }
}

function drawLeather(ctx) {
    bg(ctx,'rgba(0,0,0,0)');
    fill(ctx,2,3,12,10,'#A06030'); fill(ctx,1,5,14,7,'#A06030'); fill(ctx,3,2,10,12,'#A06030');
    fill(ctx,4,3,4,3,lighten('#A06030',20)); fill(ctx,10,5,3,4,darken('#A06030',30));
    // hide texture
    [[3,5],[7,4],[11,6],[5,9],[9,8],[4,11],[8,10]].forEach(([x,y])=>fill(ctx,x,y,2,2,darken('#A06030',15)));
}

function drawWool(ctx) {
    bg(ctx,'#E8E8E0');
    for(let y=0;y<16;y+=3) for(let x=0;x<16;x+=3) {
        fill(ctx,x,y,3,3,`hsl(${(x*5+y*7)%30+0},5%,${80+(x+y)%10}%)`);
    }
    fill(ctx,0,14,16,2,'#D0D0C8'); fill(ctx,14,0,2,14,'#D0D0C8');
}

function drawFeather(ctx) {
    bg(ctx,'rgba(0,0,0,0)');
    for(let i=0;i<13;i++) {
        const x=2+i,y=2+i;
        px(ctx,x,y,'#F0F0F8'); px(ctx,x-1,y+1,'#E0E0E8'); px(ctx,x+1,y-1,'#E0E0E8');
        if(i<10) { px(ctx,x-2,y+1,'#D8D8E0'); px(ctx,x+1,y-2,'#D8D8E0'); }
    }
    px(ctx,2,2,'#C0B080'); px(ctx,3,3,'#C0B080');
}

function drawBone(ctx) {
    // shaft
    fill(ctx,6,4,4,8,'#EAE0CC'); fill(ctx,7,3,2,10,'#EAE0CC');
    // ball ends
    [[5,2],[5,3],[6,2],[5,12],[5,13],[6,13],[9,12],[9,13],[10,12],[9,2],[10,2],[10,3]].forEach(([x,y])=>px(ctx,x,y,'#EAE0CC'));
    [[7,4],[7,11]].forEach(([x,y])=>px(ctx,x,y,'#FAF0DC'));
}

function drawInkSac(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-7.5; if(dx*dx*0.8+dy*dy<32) px(ctx,x,y,dy<-1?'#1A1A2A':'#0A0A1A');
    }
    [[5,7],[9,6],[6,10],[10,9]].forEach(([x,y])=>px(ctx,x,y,'#303040'));
}

function drawAmethyst(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        if(Math.abs(x-8)/3+Math.abs(y-8)/6<=1) px(ctx,x,y,y<8?'#C080F0':'#9050C8');
    }
    fill(ctx,7,2,2,4,'#E0B0FF'); px(ctx,8,2,'#F0C8FF');
}

function drawCopperIngot(ctx) { drawIngot(ctx,'#C06030'); }

// ── potions ───────────────────────────────────────────────────────────────

function drawPotion(ctx, liquid='#9020D0') {
    // cork
    fill(ctx,6,0,4,2,'#8B6040');
    // neck
    fill(ctx,6,2,4,3,'#B8D0D8');
    // body outline
    fill(ctx,3,4,10,9,'#B8D0D8'); fill(ctx,2,6,12,6,'#B8D0D8'); fill(ctx,3,12,10,2,'#B8D0D8');
    // liquid
    fill(ctx,4,8,8,5,liquid); fill(ctx,3,10,10,3,liquid); fill(ctx,4,12,8,2,liquid);
    // shine
    fill(ctx,4,5,2,4,'rgba(255,255,255,0.55)'); px(ctx,5,5,'rgba(255,255,255,0.8)');
    // outline shading
    fill(ctx,12,6,2,8,darken('#B8D0D8',30)); fill(ctx,3,13,10,2,darken('#B8D0D8',20));
}

// ── special items ─────────────────────────────────────────────────────────

function drawEnderPearl(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8; if(dx*dx+dy*dy<40) px(ctx,x,y,dy<0?'#40C880':'#20A060');
    }
    [[6,5],[9,5],[7,10],[8,10],[9,10]].forEach(([x,y])=>px(ctx,x,y,'#80FFB0'));
    [[5,7],[10,7]].forEach(([x,y])=>fill(ctx,x,y,2,2,'#106040'));
}

function drawTotem(ctx) {
    fill(ctx,4,0,8,16,'#D4A830'); fill(ctx,3,2,10,14,'#D4A830');
    // face
    fill(ctx,5,3,6,4,'#C09020');
    [[5,4],[10,4]].forEach(([x,y])=>fill(ctx,x,y,2,3,'#000'));
    fill(ctx,5,8,6,2,'#000'); fill(ctx,5,8,1,2,'#000'); fill(ctx,10,8,1,2,'#000');
    // hands
    fill(ctx,1,6,3,6,'#D4A830'); fill(ctx,12,6,3,6,'#D4A830');
    fill(ctx,4,0,2,3,'#B88820'); fill(ctx,10,0,2,3,'#B88820');
}

function drawBook(ctx, enchanted=false) {
    fill(ctx,2,1,12,14,'#C0201A');
    fill(ctx,7,0,2,16,'#8B1A14');
    fill(ctx,3,2,4,12,'#F0E8D0'); fill(ctx,9,2,4,12,'#F0E8D0');
    if(enchanted) {
        [[4,4],[5,6],[4,8],[5,10],[10,3],[11,5],[10,7],[11,9]].forEach(([x,y])=>px(ctx,x,y,'#A040FF'));
        [[4,3],[5,5],[4,7],[10,4],[11,6],[10,8]].forEach(([x,y])=>px(ctx,x,y,'#C080FF'));
    }
}

function drawMap(ctx) {
    bg(ctx,'#D4C090');
    fill(ctx,1,1,14,14,'#E0CC98');
    // map details
    fill(ctx,3,3,4,3,'#5A8A3A'); fill(ctx,9,3,4,3,'#4A7A7A'); fill(ctx,3,8,4,4,'#906030'); fill(ctx,8,7,5,5,'#5A8A3A');
    // grid lines
    for(let i=1;i<16;i+=5) { fill(ctx,i,1,1,14,'rgba(0,0,0,0.1)'); fill(ctx,1,i,14,1,'rgba(0,0,0,0.1)'); }
    // red X marker
    px(ctx,8,8,'#CC0000'); px(ctx,7,7,'#CC0000'); px(ctx,9,7,'#CC0000'); px(ctx,7,9,'#CC0000'); px(ctx,9,9,'#CC0000');
}

function drawTNT(ctx) {
    bg(ctx,'#CC2020');
    fill(ctx,0,5,16,2,'#E0E0E0'); fill(ctx,0,9,16,2,'#E0E0E0');
    // T
    fill(ctx,1,6,4,1,'#000'); fill(ctx,2,6,2,4,'#000');
    // N
    fill(ctx,6,6,1,4,'#000'); fill(ctx,7,6,1,1,'#000'); fill(ctx,8,7,1,1,'#000'); fill(ctx,9,8,1,1,'#000'); fill(ctx,10,9,1,1,'#000'); fill(ctx,11,6,1,4,'#000');
    // T (second)
    fill(ctx,12,6,3,1,'#000'); fill(ctx,13,6,1,4,'#000');
    // fuse
    fill(ctx,7,0,2,3,'#8B6040'); px(ctx,7,0,'#FF8000'); px(ctx,8,0,'#FFAA00');
}

function drawFirework(ctx) {
    bg(ctx,'rgba(0,0,0,0)');
    // stick
    fill(ctx,7,8,2,8,'#8B6040');
    // burst
    [[8,0],[5,1],[11,1],[3,3],[13,3],[2,6],[14,6],[1,9],[15,9],[4,2],[12,2],[6,0],[10,0]].forEach(([x,y])=>{ px(ctx,x,y,`hsl(${(x*20+y*30)%360},100%,60%)`); });
    [[7,1],[9,1],[5,4],[11,4],[3,7],[13,7]].forEach(([x,y])=>px(ctx,x,y,`hsl(${(x*40+y*15)%360},100%,70%)`));
}

function drawLead(ctx) {
    bg(ctx,'rgba(0,0,0,0)');
    for(let i=0;i<12;i++) { px(ctx,i+2,i+2,'#D4C090'); px(ctx,i+3,i+2,'#C0AC78'); }
    fill(ctx,1,1,4,4,'#C0AC78'); fill(ctx,2,2,2,2,'#E0D0A0');
    fill(ctx,11,11,4,4,'#C0AC78'); px(ctx,12,12,'#E0D0A0');
}

function drawNameTag(ctx) {
    fill(ctx,2,4,12,8,'#E8E0D0'); fill(ctx,1,5,14,6,'#E8E0D0');
    fill(ctx,6,1,4,4,'#E8E0D0'); fill(ctx,7,0,2,2,'#E8E0D0');
    // pin hole
    px(ctx,8,2,'#808080');
    // text lines
    fill(ctx,4,6,4,1,'#808080'); fill(ctx,9,6,3,1,'#808080');
    fill(ctx,4,8,6,1,'#808080'); fill(ctx,11,8,2,1,'#808080');
}

function drawBeacon(ctx) {
    fill(ctx,3,8,10,7,'#8060A0');
    fill(ctx,1,13,14,3,'#404040');
    fill(ctx,5,5,6,4,'#50D0C0');
    fill(ctx,6,2,4,4,'#70F0E0');
    // beam
    fill(ctx,7,0,2,3,'rgba(80,240,200,0.8)');
    fill(ctx,5,6,6,2,'rgba(255,255,255,0.3)');
}

function drawMusicDisc(ctx) {
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8,d=Math.sqrt(dx*dx+dy*dy);
        if(d<8) px(ctx,x,y,d>6?'#1A1A2A':d>4?`hsl(${(Math.atan2(dy,dx)*180/Math.PI+180)*1},70%,35%)`:d>2?'#2A2A3A':'#0A0A1A');
    }
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) {
        const dx=x-8,dy=y-8; if(dx*dx+dy*dy<5) px(ctx,x,y,'#C8A020');
    }
}

function drawSaddle(ctx) {
    fill(ctx,2,4,12,8,'#8B4020');
    fill(ctx,4,2,8,4,'#6B3010'); fill(ctx,5,1,6,2,'#8B4020');
    fill(ctx,2,10,5,4,'#6B3010'); fill(ctx,9,10,5,4,'#6B3010');
    [[4,5],[8,5],[4,9],[8,9]].forEach(([x,y])=>fill(ctx,x,y,2,2,'#C08040'));
}

function drawHorseArmor(ctx, c='#C8A020') {
    fill(ctx,2,3,12,10,c); fill(ctx,1,5,14,7,c); fill(ctx,3,2,10,12,c);
    fill(ctx,4,3,4,2,lighten(c,30)); fill(ctx,9,3,3,2,lighten(c,30));
    fill(ctx,12,5,2,7,darken(c,30)); fill(ctx,3,13,10,2,darken(c,20));
    [[3,6],[5,6],[3,8],[5,8]].forEach(([x,y])=>fill(ctx,x,y,2,2,darken(c,40)));
}

function drawBed(ctx, c='#CC2020') {
    const wood='#9A6B3C', shadow='#5C3A1C', frame='#7A5028';
    // top face (rows 0-9): left=pillow, right=blanket
    fill(ctx,0,0,16,10,wood);
    fill(ctx,1,2,6,7,'#D0CEC8'); fill(ctx,2,3,4,5,'#EFEFEF'); fill(ctx,2,3,2,3,'#FFFFFF');
    fill(ctx,8,2,7,7,c); fill(ctx,9,3,5,1,lighten(c,40));
    fill(ctx,8,0,1,10,frame);            // divider
    fill(ctx,0,0,16,2,shadow);           // headboard top
    fill(ctx,0,0,2,10,shadow);           // left headboard
    fill(ctx,14,0,2,10,darken(shadow,20)); // right shadow
    fill(ctx,2,2,12,1,lighten(wood,15)); // top-face highlight
    // front face (rows 10-15)
    fill(ctx,0,10,16,6,frame);
    fill(ctx,2,11,12,4,shadow);
    fill(ctx,0,10,16,1,lighten(frame,10));
    fill(ctx,0,10,2,6,shadow);
    fill(ctx,14,10,2,6,darken(shadow,20));
}

function drawExpBottle(ctx) {
    drawPotion(ctx,'#50E030');
    // glowing particles around
    [[1,5],[14,6],[1,11],[15,10],[2,2],[13,13]].forEach(([x,y])=>px(ctx,x,y,'#80FF40'));
}

// ── special/blocks ────────────────────────────────────────────────────────

function drawCraftingTable(ctx) {
    bg(ctx,'#8B5E2A');
    // top face (lighter)
    fill(ctx,0,0,16,6,'#C08040');
    // grid lines on top
    fill(ctx,5,0,1,6,'#8B5E2A'); fill(ctx,10,0,1,6,'#8B5E2A');
    fill(ctx,0,2,16,1,'#8B5E2A'); fill(ctx,0,4,16,1,'#8B5E2A');
    // front face
    fill(ctx,0,6,6,10,'#A06830'); fill(ctx,6,6,10,10,'#8B5E2A');
    fill(ctx,1,7,4,2,'#FFD020'); fill(ctx,7,8,2,4,'#FFD020');
}

function drawFurnace(ctx) {
    bg(ctx,'#848484');
    fill(ctx,0,0,16,5,'#606060');
    fill(ctx,3,0,10,5,'#505050');
    fill(ctx,4,6,8,7,'#181818');
    fill(ctx,5,7,6,5,'#FF6010');
    fill(ctx,6,8,4,3,'#FF9020');
    fill(ctx,7,9,2,2,'#FFCC40');
}

function drawEnchantingTable(ctx) {
    bg(ctx,'#C83030');
    fill(ctx,0,0,16,5,'#D84040');
    fill(ctx,2,1,12,3,'#E05050');
    // book
    fill(ctx,5,2,6,5,'#8B1A14'); fill(ctx,7,1,2,6,'#5A1010');
    fill(ctx,6,3,2,3,'#F0E8D0'); fill(ctx,8,3,2,3,'#F0E8D0');
    fill(ctx,4,9,8,6,'#282828');
    // particles
    [[2,8],[13,7],[1,12],[14,11],[4,14],[11,13]].forEach(([x,y])=>px(ctx,x,y,'#A040FF'));
}

function drawChest(ctx) {
    bg(ctx,'#8B5E2A');
    fill(ctx,0,0,16,6,'#A07040');
    fill(ctx,0,6,16,10,'#A07040');
    fill(ctx,2,5,12,3,'#C89050');
    fill(ctx,6,7,4,3,'#A07040');
    fill(ctx,7,8,2,2,'#C8A820');
    fill(ctx,2,1,3,4,lighten('#8B5E2A',20)); fill(ctx,11,1,3,4,lighten('#8B5E2A',20));
    fill(ctx,14,0,2,16,darken('#A07040',30)); fill(ctx,0,14,16,2,darken('#A07040',20));
}

function drawLantern(ctx) {
    // chain
    fill(ctx,7,0,2,2,'#808080');
    // top frame
    fill(ctx,5,2,6,2,'#606060');
    // glass body
    fill(ctx,4,4,8,7,'#F0C860');
    fill(ctx,3,5,10,5,'#F0C860');
    fill(ctx,5,11,6,2,'#606060');
    fill(ctx,5,4,6,7,'#FFE890');
    // glow
    fill(ctx,6,6,4,3,'#FFF0A0');
    fill(ctx,3,4,2,7,'rgba(255,220,80,0.3)');
}

function drawBrick(ctx) {
    const brick = '#9A3A28', mortar = '#C4B098';
    bg(ctx, brick);
    // Horizontal mortar rows
    fill(ctx, 0, 0,  16, 1, mortar);
    fill(ctx, 0, 5,  16, 1, mortar);
    fill(ctx, 0, 10, 16, 1, mortar);
    fill(ctx, 0, 15, 16, 1, mortar);
    // Vertical mortar – row 1 (y 1-4): split at x=8
    fill(ctx, 8, 1, 1, 4, mortar);
    // Vertical mortar – row 2 (y 6-9): split at x=4 and x=12
    fill(ctx, 4,  6, 1, 4, mortar);
    fill(ctx, 12, 6, 1, 4, mortar);
    // Vertical mortar – row 3 (y 11-14): split at x=8
    fill(ctx, 8, 11, 1, 4, mortar);
    // Brick highlights (top edge of each brick)
    fill(ctx,  1, 1, 6, 1, lighten(brick, 25));
    fill(ctx,  9, 1, 6, 1, lighten(brick, 25));
    fill(ctx,  1, 6, 2, 1, lighten(brick, 25));
    fill(ctx,  5, 6, 6, 1, lighten(brick, 25));
    fill(ctx, 13, 6, 2, 1, lighten(brick, 25));
    fill(ctx,  1,11, 6, 1, lighten(brick, 25));
    fill(ctx,  9,11, 6, 1, lighten(brick, 25));
    // Right and bottom edge shading
    fill(ctx, 14, 0, 2, 15, darken(brick, 25));
    fill(ctx,  0,14, 16,  2, darken(brick, 20));
}

function drawWater(ctx) {
    bg(ctx, '#1E90FF');
    // Ripples/highlights
    [[2,3],[5,3],[9,2],[12,3],[4,7],[8,6],[13,7],[3,11],[7,12],[11,11]].forEach(([x,y]) => {
        fill(ctx, x, y, 2, 1, '#63B8FF');
    });
    // Darker water undertones
    [[1,5],[6,4],[11,5],[3,9],[7,9],[12,8],[2,13],[9,13]].forEach(([x,y]) => {
        fill(ctx, x, y, 2, 1, '#1C86EE');
    });
}

// ── generic fallback ──────────────────────────────────────────────────────

function drawGeneric(ctx, name) {
    const h = [...name].reduce((a,c)=>a*31+c.charCodeAt(0),0);
    const hue = Math.abs(h) % 360;
    const c = `hsl(${hue},60%,45%)`, light = `hsl(${hue},60%,65%)`, dark = `hsl(${hue},60%,30%)`;
    fill(ctx,4,2,8,12,c); fill(ctx,2,5,12,7,c);
    fill(ctx,4,2,4,4,light); fill(ctx,12,6,2,8,dark); fill(ctx,4,13,8,2,dark);
    px(ctx,5,3,light); px(ctx,6,3,light);
}

// ── main dispatch ─────────────────────────────────────────────────────────

function _drawIcon(ctx, name) {
    const n = name.toLowerCase();

    // base blocks
    if (n==='water')      return drawWater(ctx);
    if (n==='dirt')       return drawDirt(ctx);
    if (n==='grass')      return drawGrass(ctx);
    if (n==='stone')      return drawStone(ctx);
    if (n==='wood')       return drawWood(ctx);
    if (n==='steel')      return drawSteel(ctx);
    if (n==='leaves')     return drawLeaves(ctx);
    if (n==='snowgrass')  return drawSnowGrass(ctx);
    if (n==='snowstone')  return drawSnowStone(ctx);
    if (n==='cores')      return drawCores(ctx);

    // swords
    if (n.includes('netherite')&&n.includes('sword')) return drawSword(ctx,'#5A1A30','#FF4000');
    if (n.includes('diamond')&&n.includes('sword'))   return drawSword(ctx,'#40D0E8','#A0A0A0');
    if (n.includes('golden')&&n.includes('sword'))    return drawSword(ctx,'#FFD700','#FFB800');
    if (n.includes('iron')&&n.includes('sword'))      return drawSword(ctx,'#D0D0D0','#707070');
    if (n.includes('stone')&&n.includes('sword'))     return drawSword(ctx,'#909090','#808080');
    if (n.includes('wooden')&&n.includes('sword'))    return drawSword(ctx,'#9A7040','#9A7040');

    // pickaxes
    if (n.includes('netherite')&&n.includes('pickaxe')) return drawPickaxe(ctx,'#5A1A30');
    if (n.includes('diamond')&&n.includes('pickaxe'))   return drawPickaxe(ctx,'#40D0E8');
    if (n.includes('iron')&&n.includes('pickaxe'))      return drawPickaxe(ctx,'#D0D0D0');
    if (n.includes('stone')&&n.includes('pickaxe'))     return drawPickaxe(ctx,'#909090');
    if (n.includes('wooden')&&n.includes('pickaxe'))    return drawPickaxe(ctx,'#9A7040');

    // axes
    if (n.includes('diamond')&&n.includes('axe')) return drawAxe(ctx,'#40D0E8');
    if (n.includes('iron')&&n.includes('axe'))    return drawAxe(ctx,'#D0D0D0');
    if (n.includes('axe'))                        return drawAxe(ctx,'#9A7040');

    // other tools
    if (n.includes('shovel'))      return drawShovel(ctx, n.includes('diamond')?'#40D0E8':n.includes('iron')?'#D0D0D0':'#9A7040');
    if (n.includes('hoe'))         return drawHoe(ctx, n.includes('diamond')?'#40D0E8':n.includes('iron')?'#D0D0D0':'#9A7040');
    if (n.includes('fishing rod')) return drawFishingRod(ctx);
    if (n==='shears')              return drawPickaxe(ctx,'#D0D0D0');
    if (n.includes('flint'))       return drawRod(ctx,'#808090','#404050');
    if (n==='compass')             { drawGeneric(ctx,'compass'); return; }
    if (n==='clock')               { drawGeneric(ctx,'clock'); return; }
    if (n==='spyglass')            return drawRod(ctx,'#C09040','#806020');

    // ranged
    if (n==='bow')      return drawBow(ctx);
    if (n==='crossbow') return drawCrossbow(ctx);
    if (n==='trident')  return drawTrident(ctx);
    if (n==='arrow')    return drawArrow(ctx);
    if (n==='shield')   return drawShield(ctx);

    // armor
    if (n.includes('netherite')&&n.includes('helmet'))     return drawHelmet(ctx,'#5A1A30');
    if (n.includes('diamond')&&n.includes('helmet'))       return drawHelmet(ctx,'#40D0E8');
    if (n.includes('iron')&&n.includes('helmet'))          return drawHelmet(ctx,'#D0D0D0');
    if (n.includes('leather')&&n.includes('helmet'))       return drawHelmet(ctx,'#A06030');
    if (n.includes('gold')&&n.includes('helmet'))          return drawHelmet(ctx,'#FFD700');
    if (n.includes('turtle shell'))                        return drawTurtleShell(ctx);
    if (n.includes('netherite')&&n.includes('chestplate')) return drawChestplate(ctx,'#5A1A30');
    if (n.includes('diamond')&&n.includes('chestplate'))   return drawChestplate(ctx,'#40D0E8');
    if (n.includes('iron')&&n.includes('chestplate'))      return drawChestplate(ctx,'#D0D0D0');
    if (n.includes('leggings'))                            return drawLeggings(ctx, n.includes('diamond')?'#40D0E8':'#D0D0D0');
    if (n.includes('boots'))                               return drawBoots(ctx, n.includes('diamond')?'#40D0E8':'#D0D0D0');
    if (n.includes('gold armor'))                          return drawChestplate(ctx,'#FFD700');
    if (n==='elytra')                                      return drawElytra(ctx);

    // food
    if (n==='enchanted golden apple') return drawApple(ctx,true);
    if (n==='golden apple')           return drawApple(ctx,true);
    if (n==='apple')                  return drawApple(ctx);
    if (n==='bread')                  return drawBread(ctx);
    if (n.includes('cooked chicken')) return drawMeat(ctx,'#D4A040',true);
    if (n.includes('cooked beef'))    return drawMeat(ctx,'#C05020',true);
    if (n.includes('cooked pork'))    return drawMeat(ctx,'#D06040',true);
    if (n.includes('cooked mutton'))  return drawMeat(ctx,'#C05030',true);
    if (n.includes('cooked rabbit'))  return drawMeat(ctx,'#A04020',true);
    if (n.includes('cooked cod'))     return drawFish(ctx,'#C08050');
    if (n.includes('cooked salmon'))  return drawFish(ctx,'#E07050');
    if (n==='cake')                   return drawCake(ctx);
    if (n==='cookie')                 { bg(ctx,'#C08030'); [[3,4],[6,3],[9,4],[11,6],[12,9],[10,11],[7,12],[4,11],[2,9],[3,6]].forEach(([x,y])=>fill(ctx,x,y,2,2,'#4A2A10')); return; }
    if (n==='pumpkin pie')            { fill(ctx,2,4,12,8,'#E08020'); fill(ctx,1,6,14,5,'#E08020'); fill(ctx,2,3,12,2,'#D4A020'); fill(ctx,3,4,4,6,'#C06010'); fill(ctx,9,4,4,6,'#C06010'); return; }
    if (n==='melon slice')            { fill(ctx,2,3,12,10,'#E03030'); fill(ctx,1,5,14,7,'#E03030'); fill(ctx,0,6,16,5,'#E03030'); fill(ctx,2,2,12,2,'#60A020'); [[4,6],[7,5],[10,6],[5,9],[8,10],[11,9]].forEach(([x,y])=>fill(ctx,x,y,1,3,'#A02010')); return; }
    if (n.includes('golden carrot'))  return drawCarrot(ctx,true);
    if (n==='carrot')                 return drawCarrot(ctx);
    if (n.includes('baked potato'))   { drawPotato(ctx); fill(ctx,4,4,3,2,'#808080'); return; }
    if (n==='potato')                 return drawPotato(ctx);
    if (n==='beetroot')               { for(let y=0;y<16;y++) for(let x=0;x<16;x++) { const dx=x-8,dy=y-8; if(dx*dx*0.8+dy*dy*0.7<28) px(ctx,x,y,dy<0?'#B03070':'#801050'); } fill(ctx,6,0,1,4,'#3A8A10'); fill(ctx,9,0,2,5,'#3A8A10'); return; }
    if (n.includes('stew')||n.includes('soup')) { drawPotion(ctx,'#C08030'); return; }
    if (n.includes('honey'))          return drawHoney(ctx);
    if (n.includes('berries'))        return drawBerry(ctx, n.includes('sweet')?'#C02020':'#FFD820');
    if (n.includes('dried kelp'))     return drawDriedKelp(ctx);
    if (n.includes('milk'))           return drawPotion(ctx,'#F8F8F8');

    // materials
    if (n==='diamond')          return drawDiamond(ctx);
    if (n==='emerald')          return drawEmerald(ctx);
    if (n==='iron ingot')       return drawIngot(ctx,'#C8C8C8');
    if (n==='gold ingot')       return drawIngot(ctx,'#FFD700');
    if (n==='netherite ingot')  return drawIngot(ctx,'#4A2A30');
    if (n==='copper ingot')     return drawCopperIngot(ctx);
    if (n==='amethyst shard')   return drawAmethyst(ctx);
    if (n==='lapis lazuli')     return drawLapis(ctx);
    if (n==='coal')             return drawCoal(ctx);
    if (n==='redstone')         return drawRedstone(ctx);
    if (n==='quartz')           return drawQuartz(ctx);
    if (n.includes('glowstone')) return drawGlowstone(ctx);
    if (n.includes('blaze rod')) return drawBlazeRod(ctx);
    if (n.includes('ghast tear')) return drawGhastTear(ctx);
    if (n==='slimeball')         return drawSlimeball(ctx);
    if (n.includes('spider eye')) return drawSpiderEye(ctx);
    if (n==='gunpowder')         return drawGunpowder(ctx);
    if (n==='string')            return drawString(ctx);
    if (n==='leather')           return drawLeather(ctx);
    if (n==='wool')              return drawWool(ctx);
    if (n==='feather')           return drawFeather(ctx);
    if (n==='bone')              return drawBone(ctx);
    if (n.includes('ink sac'))   return drawInkSac(ctx);
    if (n.includes('ender eye')||n.includes('eye of ender')) return drawEnderPearl(ctx);

    // potions
    if (n.includes('health'))         return drawPotion(ctx,'#FF2020');
    if (n.includes('speed'))          return drawPotion(ctx,'#70C0FF');
    if (n.includes('strength'))       return drawPotion(ctx,'#FF6000');
    if (n.includes('fire resist'))    return drawPotion(ctx,'#FF8000');
    if (n.includes('night vision'))   return drawPotion(ctx,'#0030C0');
    if (n.includes('invisibility'))   return drawPotion(ctx,'#F0F0F8');
    if (n.includes('poison'))         return drawPotion(ctx,'#40A020');
    if (n.includes('regeneration'))   return drawPotion(ctx,'#FF50A0');
    if (n.includes('slowness'))       return drawPotion(ctx,'#8090C0');
    if (n.includes('weakness'))       return drawPotion(ctx,'#6040C0');
    if (n.includes('leaping'))        return drawPotion(ctx,'#40C080');
    if (n.includes('water breathing')) return drawPotion(ctx,'#20A0FF');
    if (n.includes('luck'))           return drawPotion(ctx,'#00CC00');
    if (n.includes('splash potion'))  return drawPotion(ctx,'#A050FF');
    if (n.includes('exp bottle'))     return drawExpBottle(ctx);
    if (n.includes('potion'))         return drawPotion(ctx,'#8020C0');

    // special
    if (n.includes('ender pearl'))    return drawEnderPearl(ctx);
    if (n.includes('totem'))          return drawTotem(ctx);
    if (n.includes('enchanted book')) return drawBook(ctx,true);
    if (n==='lead')                   return drawLead(ctx);
    if (n.includes('name tag'))       return drawNameTag(ctx);
    if (n==='firework')               return drawFirework(ctx);
    if (n==='map')                    return drawMap(ctx);
    if (n.includes('music disc'))     return drawMusicDisc(ctx);
    if (n==='tnt')                    return drawTNT(ctx);
    if (n==='beacon')                 return drawBeacon(ctx);
    if (n.includes('nether star'))    return drawGeneric(ctx,'nether-star-special');
    if (n.includes('dragon egg'))     { for(let y=0;y<16;y++) for(let x=0;x<16;x++){const dx=x-8,dy=y-8;if(dx*dx/22+(dy-1)*(dy-1)/32<1)px(ctx,x,y,dy<0?'#2A1A4A':'#180E30');} fill(ctx,6,0,4,3,'#3A2A5A'); return; }
    if (n==='saddle')                 return drawSaddle(ctx);
    if (n.includes('horse armor'))    return drawHorseArmor(ctx, n.includes('gold')?'#FFD700':n.includes('iron')?'#D0D0D0':'#40D0E8');

    // blocks/furniture
    if (n.includes('bed'))            { const cols={red:'#CC2020',blue:'#2050CC',white:'#E8E8E8',yellow:'#D4C010',green:'#208020',purple:'#8020CC',black:'#282828',pink:'#E050A0',orange:'#D45010',cyan:'#10A0A0'}; const k=Object.keys(cols).find(c=>n.includes(c)); return drawBed(ctx,k?cols[k]:'#CC2020'); }
    if (n==='chest'||n.includes('trapped chest')) return drawChest(ctx);
    if (n.includes('ender chest'))    { drawChest(ctx); bg(ctx,'rgba(0,0,0,0)'); fill(ctx,0,0,16,16,'rgba(40,0,60,0.8)'); drawChest(ctx); return; }
    if (n.includes('crafting table')) return drawCraftingTable(ctx);
    if (n.includes('furnace')||n.includes('smoker')||n.includes('blast')) return drawFurnace(ctx);
    if (n.includes('enchanting'))     return drawEnchantingTable(ctx);
    if (n.includes('lantern'))        return drawLantern(ctx);
    if (n.includes('campfire'))       { fill(ctx,4,10,8,6,'#8B5E2A'); fill(ctx,0,12,4,4,'#8B5E2A'); fill(ctx,12,12,4,4,'#8B5E2A'); fill(ctx,5,6,6,6,'#FF8020'); fill(ctx,7,4,2,4,'#FF4000'); fill(ctx,6,8,4,4,'#FFB020'); return; }
    if (n==='tnt')                    return drawTNT(ctx);
    if (n.includes('jukebox')||n.includes('note block')) { bg(ctx,'#8B5E2A'); fill(ctx,4,4,8,8,'#282828'); fill(ctx,6,4,4,1,'#C8A020'); return; }
    if (n==='bell')                   { fill(ctx,5,0,6,2,'#C8A020'); fill(ctx,4,2,8,8,'#D4B030'); fill(ctx,3,4,10,6,'#D4B030'); fill(ctx,4,9,8,3,'#C8A020'); px(ctx,8,11,'#909090'); return; }
    if (n.includes('bookshelf'))      { bg(ctx,'#8B5E2A'); fill(ctx,0,1,16,4,'#C8A040'); fill(ctx,0,7,16,4,'#C8A040'); fill(ctx,0,12,16,4,'#C8A040'); [[1,1],[4,1],[7,1],[10,1],[13,1],[1,7],[4,7],[7,7],[10,7],[13,7],[1,12],[4,12],[7,12],[10,12],[13,12]].forEach(([x,y])=>fill(ctx,x,y,2,4,`hsl(${(x*30+y*20)%360},60%,40%)`)); return; }
    if (n.includes('anvil'))          { fill(ctx,2,0,12,4,'#484848'); fill(ctx,0,3,16,2,'#404040'); fill(ctx,3,5,10,10,'#484848'); fill(ctx,1,13,14,3,'#404040'); fill(ctx,4,5,3,3,lighten('#484848',20)); return; }

    if (n==='brick'||n==='bricks'||n==='brick block') return drawBrick(ctx);

    drawGeneric(ctx, name);
}
