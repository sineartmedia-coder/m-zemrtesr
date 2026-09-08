import * as T from 'three';

// The entrance and main hall share one measured architectural grid.
export function buildPalace(scene: T.Scene, renderer: T.WebGLRenderer, photographs: string[]) {
  const mat = (color: number, roughness = .65, metalness = 0) => new T.MeshStandardMaterial({color, roughness, metalness});
  const stone = mat(0xdcd3c4, .7), cream = mat(0xf4ead9, .8), panel = mat(0x38332c, .5, .1), gold = mat(0xc99c53,.15,.95);
  const timber = mat(0x1f140e,.3, .1), leather = mat(0x1a120e,.4), metal = mat(0x4a4d52,.3,.7);
  const glow = new T.MeshBasicMaterial({color:0xffd493});
  const box = (w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material) => {
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m); mesh.position.set(x,y,z); mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
  };
  const cyl = (r:number, rb:number,h:number,x:number,y:number,z:number,m:T.Material) => {
    const mesh=new T.Mesh(new T.CylinderGeometry(r,rb,h,32),m);mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);return mesh;
  };
  const marble = marbleMap();
  const floor=(w:number,d:number,x:number,y:number,z:number) =>{
    const texture=marble.clone();texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(w/3,d/3);texture.needsUpdate=true;
    const m=new T.MeshStandardMaterial({map:texture,roughness:.18,metalness:.12,envMapIntensity:1.1});
    box(w,.12,d,x,y-.06,z,m);
    const inlay=mat(0x8a7151,.25,.2);
    [-1,1].forEach(s=>{box(.15,.015,d-1.6,x+s*(w/2-.8),y+.012,z,inlay);box(w-1.6,.015,.15,x,y+.013,z+s*(d/2-.8),inlay);});
    const joint=mat(0xb4aa96);
    for(let p=-w/2+1.5;p<w/2;p+=1.5)box(.012,.012,d,x+p,y+.007,z,joint);
    for(let p=-d/2+1.5;p<d/2;p+=1.5)box(w,.012,.012,x,y+.007,z+p,joint);
  };
  const column=(x:number,z:number,y:number,h:number) =>{
    box(1.15,.18,1.15,x,y+.09,z,stone);box(.99,.2,.99,x,y+.28,z,cream);
    cyl(.47,.49,.2,x,y+.47,z,stone);cyl(.34,.43,h-1.25,x,y+(h-1.25)/2+.58,z,cream);
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;cyl(.026,.026,h-1.55,x+Math.sin(a)*.353,y+h/2-.03,z+Math.cos(a)*.353,stone);}
    cyl(.44,.37,.25,x,y+h-.62,z,stone);box(.97,.21,.97,x,y+h-.4,z,cream);box(1.15,.22,1.15,x,y+h-.18,z,stone);
  };
  const border=(x:number,y:number,z:number,w:number,h:number,rotation:number) =>{
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;
    for(const [bw,bh,bx,by] of [[w,.06,0,h/2],[w,.06,0,-h/2],[.06,h,-w/2,0],[.06,h,w/2,0]]){
      const m=new T.Mesh(new T.BoxGeometry(bw,bh,.05),gold);m.position.set(bx,by,0);g.add(m);
    }scene.add(g);
  };
  const wall=(axis:'x'|'z',fixed:number,start:number,end:number,y:number,h:number,gaps:number[][]=[])=>{
    let cursor=start;
    [...gaps.map(([c,w])=>[c-w/2,c+w/2]).sort((a,b)=>a[0]-b[0]),[end,end]].forEach(([a,b])=>{
      if(a>cursor){const len=a-cursor,c=(a+cursor)/2;
        if(axis==='x'){box(len,h,.26,c,y+h/2,fixed,stone);box(len,.85,.34,c,y+.425,fixed,panel);box(len,.15,.43,c,y+.95,fixed,cream);box(len,.3,.52,c,y+h-.5,fixed,cream);box(len,.14,.67,c,y+h-.22,fixed,stone);}
        else{box(.26,h,len,fixed,y+h/2,c,stone);box(.34,.85,len,fixed,y+.425,c,panel);box(.43,.15,len,fixed,y+.95,c,cream);box(.52,.3,len,fixed,y+h-.5,c,cream);box(.67,.14,len,fixed,y+h-.22,c,stone);}
      }cursor=b;
    });
  };
  const arch=(x:number,z:number,y:number,w:number,h:number,ry=0)=>{
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;
    const spring=h-w/2;
    for(const side of [-1,1]){const j=new T.Mesh(new T.BoxGeometry(.4,spring,.5),cream);j.position.set(side*(w/2+.2),spring/2,0);g.add(j);}
    const shape=new T.Shape();const r=w/2;
    shape.absarc(0,spring,r+.4,0,Math.PI,false);shape.lineTo(-r,spring);shape.absarc(0,spring,r,Math.PI,0,true);shape.closePath();
    const rim=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.38,bevelEnabled:false,curveSegments:32}),cream);rim.position.z=-.19;g.add(rim);
    scene.add(g);
  };
  const light=(x:number,z:number,y:number,rotation:number)=>{
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;
    const back=new T.Mesh(new T.BoxGeometry(.16,.68,.09),gold);g.add(back);
    const glass=new T.Mesh(new T.CylinderGeometry(.065,.065,.45,12),glow);glass.position.z=.15;g.add(glass);
    [-.25,.25].forEach(py=>{const cap=new T.Mesh(new T.BoxGeometry(.19,.05,.22),gold);cap.position.set(0,py,.12);g.add(cap);});scene.add(g);
  };
  const bench=(x:number,z:number,y:number,ry=0)=>{
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;
    const part=(w:number,h:number,d:number,px:number,py:number,pz:number,m:T.Material)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(px,py,pz);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);};
    part(3.4,.16,.92,0,.42,0,timber);for(let i=0;i<4;i++)part(.82,.17,.87,-1.26+i*.84,.58,0,leather);
    [-1.4,1.4].forEach(px=>[-0.32,0.32].forEach(pz=>part(.095,.45,.095,px,.225,pz,gold)));scene.add(g);
  };
  const photo=(src:string,x:number,z:number,y:number,w:number,maxH:number,ry=0,flankWithLights=false)=>{
    const group=new T.Group();group.position.set(x,y,z);group.rotation.y=ry;scene.add(group);
    new T.TextureLoader().load(src,t=>{
      t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const aspect=t.image.width/t.image.height;const h=Math.min(maxH,w/aspect);const pw=h*aspect;
      const image=new T.Mesh(new T.PlaneGeometry(pw,h),new T.MeshBasicMaterial({map:t}));image.position.z=.13;group.add(image);
      const back=new T.Mesh(new T.BoxGeometry(pw+.34,h+.34,.17),timber);group.add(back);
      [.1,.2].forEach((extra,i)=>{for(const [bw,bh,bx,by] of [[pw+extra,.065,0,(h+extra)/2],[pw+extra,.065,0,-(h+extra)/2],[.065,h+extra,-(pw+extra)/2,0],[.065,h+extra,(pw+extra)/2,0]]){const m=new T.Mesh(new T.BoxGeometry(bw,bh,.08),i?gold:cream);m.position.set(bx,by,.14);group.add(m);}});
      const lamp=new T.Mesh(new T.BoxGeometry(Math.min(pw*.6,1.4),.075,.13), 
        new T.MeshStandardMaterial({ color: 0xc8962c, emissive: 0xffd090, emissiveIntensity: 2.2, metalness: .85, roughness: .15 }));
      lamp.position.set(0,h/2+.34,.28);group.add(lamp);

      
      // Place decorative wall lights exactly hugging the frame if requested
      if (flankWithLights) {
        const dx = Math.sin(ry + Math.PI/2) * (pw/2 + .65);
        const dz = Math.cos(ry + Math.PI/2) * (pw/2 + .65);
        light(x + dx, z + dz, 4.2, ry);
        light(x - dx, z - dz, 4.2, ry);
      }
    });
  };
  const ceiling=(x:number,z:number,w:number,d:number,y:number,skylight:boolean)=>{
    const sw=skylight?w*.42:0;
    if(skylight){box((w-sw)/2,.2,d,x-(w+sw)/4,y,z,cream);box((w-sw)/2,.2,d,x+(w+sw)/4,y,z,cream);
      box(sw,.2,1.5,x,y,z-d/2+.75,cream);box(sw,.2,1.5,x,y,z+d/2-.75,cream);
      const sky=new T.MeshBasicMaterial({color:0xbfcdd5});box(sw,.04,d-3,x,y+.15,z,sky);
      for(let p=-d/2+1.5;p<=d/2-1.4;p+=1.6)box(sw+.15,.14,.08,x,y-.04,z+p,stone);
      for(let p=-sw/2;p<=sw/2+.01;p+=sw/4)box(.08,.14,d-3,x+p,y-.04,z,stone);
    }else box(w,.2,d,x,y,z,cream);
    for(let p=-d/2+2;p<d/2;p+=3.8){
      for(const s of [-1,1]){box((w-sw)/2-.65,.17,.17,x+s*(w+sw)/4,y-.2,z+p,stone);}
    }
  };

  // ── Geometry ─────────────────────────────────────────────────────────────
  floor(20,20,0,0,23); floor(28,20,0,1.5,3);
  wall('z',-10.13,13,33,0,9);wall('z',10.13,13,33,0,9);
  wall('x',33.13,-10,10,0,9,[[0,4.5]]);
  wall('x',13.15,-10,10,1.5,7.5,[[0,7]]);
  wall('x',-7.13,-14,14,1.5,9,[[0,7]]);
  wall('x',13.13,-14,-10,1.5,9);wall('x',13.13,10,14,1.5,9);
  // Main hall side walls: openings for cafe (z=8), love (z=-5). No columns here – they blocked doorways.
  wall('z',-13.98,-7,13,1.5,9,[[-5,3],[8,3]]);wall('z',13.98,-7,13,1.5,9,[[-5,3],[8,3]]);
  ceiling(0,23,20,20,9,false);ceiling(0,3,28,20,10.5,true);
  arch(0,13,1.5,7,7.1);arch(0,-6.92,1.5,7,7.1);

  // Doorway arches in main hall side walls (where openings are, no columns blocking them)
  [-1,1].forEach(s=>{
    arch(s*13.65,8,1.5,3,5.7,Math.PI/2);
    arch(s*13.65,-5,1.5,3,5.7,Math.PI/2);
  });

  // Open door leaves (entrance z≈14.75)
  [-1,1].forEach(s=>{
    box(.17,5.9,3.15,s*3.73,4.45,14.75,timber);
    for(let i=0;i<3;i++)border(s*3.83,2.6+i*1.75,14.75,2.65,1.45,s*Math.PI/2);
    box(.09,.6,.09,s*3.9,3.1,15.8,gold);
  });
  // Stairs
  for(let i=0;i<12;i++){const h=(i+1)*.125;box(7.5,h,.584,0,h/2,19.708-i*.584,stone);box(7.5,.035,.075,0,h+.018,19.98-i*.584,cream);}
  [-1,1].forEach(s=>{
    box(.75,1.1,7,s*4.13,1.35,16.5,stone);box(.93,.13,7.25,s*4.13,1.94,16.5,cream);
    box(1.3,1.6,1.3,s*4.13,.8,20.25,stone);box(1.45,.12,1.45,s*4.13,1.65,20.25,cream);
    box(1.3,2.6,1.3,s*4.13,1.3,13.85,stone);box(1.45,.12,1.45,s*4.13,2.65,13.85,cream);
    // Entrance columns (z=22..31) – safely away from all doorways
    for(const z of [22,27,31]){column(s*9.45,z,0,8.35);light(s*9.7,z,3.8,-s*Math.PI/2);}
    // Main hall wall lights only – NO columns (they blocked doors & artwork)
    light(s*13.65, 11, 4.2, -s*Math.PI/2);
    // (Other lights are now dynamically aligned to frames via photo() flag)
    // Entrance hall photos
    photo(photographs[s===-1?0:1],s*9.78,24.5,4.4,5.3,4.3,-s*Math.PI/2);
    border(s*9.82,4.4,24.5,6.2,5.1,-s*Math.PI/2);
    bench(s*8.65,24.5,0,Math.PI/2);
    // Main hall photos on side walls
    photo(photographs[s===-1?2:3],s*13.7,2.2,4.8,5.5,4.2,-s*Math.PI/2, true);
    border(s*13.72,4.85,2.2,6.8,5.2,-s*Math.PI/2);
    photo(photographs[s===-1?4:5],s*8.9,-6.88,4.9,5.0,4.2,0);
    bench(s*9.6,2.5,1.5,Math.PI/2);
    photo(photographs[s===-1?6:7],s*7.7,12.92,4.9,4.2,4.0,Math.PI);
  });
  bench(0,6.1,1.5);bench(0,-2.3,1.5);
  // Central sculpture on pedestal
  box(1.45,.15,1.45,0,1.58,1.4,stone);box(1.15,1.1,1.15,0,2.2,1.4,cream);box(1.35,.14,1.35,0,2.82,1.4,stone);
  const sculpture=new T.Mesh(new T.TorusKnotGeometry(.55,.14,144,24,2,3),cream);sculpture.position.set(0,3.65,1.4);sculpture.castShadow=true;scene.add(sculpture);
  // Security equipment
  box(2.8,.14,1.2,-2.6,.85,26,metal);box(1.45,1.45,1.25,-2.6,1.45,25.8,metal);
  box(1.08,.85,.03,-2.6,1.55,26.45,leather);
  for(let i=0;i<10;i++)box(.06,.79,.04,-3.09+i*.108,1.52,26.48,mat(0x15181a));
  [-3.65,-1.55].forEach(x=>{[-0.45,0.45].forEach(dz=>box(.09,.85,.09,x,.42,26+dz,metal));});
  [-.85,.85].forEach(x=>box(.16,2.5,.38,x,1.25,26,metal));box(1.86,.2,.38,0,2.5,26,metal);
  box(2.2,1,.85,3.2,.5,26,timber);box(2.35,.08,.97,3.2,1.04,26,stone);

  // ── Lights ───────────────────────────────────────────────────────────────
  scene.add(new T.AmbientLight(0x202025, .5));
  const sun=new T.DirectionalLight(0xffeed1,1.8);sun.position.set(-12,18,10);sun.target.position.set(2,0,5);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-24,right:24,top:25,bottom:-25,near:.5,far:55});
  sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun,sun.target);
  for(const z of [22,28,1,9]){const l=new T.PointLight(0xffcf85,85,25,2.5);l.position.set(0,z>13?7.3:8.9,z);scene.add(l);}
  // Spotlights for main-hall side paintings — targeted to frame outer edges
  // photo at s*13.7, z=2.2  (inner x boundary ≈ s*13.7, outer ≈ s*13.95)
  for (const s of [-1,1]) {
    // Side-wall painting (z≈2.2)
    const spot1 = new T.SpotLight(0xffc570, 110, 16, Math.PI/4.5, .65, 1.5);
    spot1.position.set(s*11.5, 8.5, 2.2);
    spot1.target.position.set(s*13.7, 4.8, 2.2);
    scene.add(spot1, spot1.target);
    // Entrance-hall painting (z≈24.5)
    const spot2 = new T.SpotLight(0xffc570, 95, 18, Math.PI/3.5, .7, 1.5);
    spot2.position.set(s*7.5, 7.7, 24.5);
    spot2.target.position.set(s*9.78, 4.4, 24.5);
    scene.add(spot2, spot2.target);
  }
}

function marbleMap(){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d')!;
  const pixels=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const warp=Math.sin(x*.017+y*.008)*30+Math.sin(y*.041)*9;
    const wave=Math.sin((x+y*.68+warp)*.031);
    const fine=Math.sin((x*.8-y+warp)*.085);
    const vein=Math.pow(Math.abs(wave),24)*18+Math.pow(Math.abs(fine),34)*7;
    const cloud=Math.sin(x*.013)*Math.sin(y*.011)*6;
    const k=(y*512+x)*4;pixels.data[k]=224-vein+cloud;pixels.data[k+1]=217-vein+cloud;pixels.data[k+2]=202-vein+cloud;pixels.data[k+3]=255;
  }ctx.putImageData(pixels,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
