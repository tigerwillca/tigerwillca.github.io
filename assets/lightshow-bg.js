/* Ten-step background light show (Ember -> AIFRED), mirrored from lightshow.ps1.
   Renders on a small canvas stretched full-viewport behind a readability veil.
   Never captures input; pauses when the tab is hidden; static glow for reduced motion. */
(function(){
  'use strict';
  var cv=document.getElementById('lightshow-bg'); if(!cv||!cv.getContext) return;
  var ctx=cv.getContext('2d',{alpha:false}); if(!ctx) return;
  function P(a){return a.map(function(s){return s.split(',').map(Number);});}
  var STEPS=[
    {name:'Ember',   dur:6, pal:P(['170,4,0','255,90,0','255,160,16','255,220,70','200,60,140','120,0,170'])},
    {name:'Spark',   dur:6, pal:P(['180,80,0','255,150,16','255,200,40','255,230,110','255,250,200'])},
    {name:'Root',    dur:6, pal:P(['70,0,12','140,0,20','190,0,40','90,0,180','70,0,140'])},
    {name:'Bloom',   dur:6, pal:P(['40,0,90','70,0,140','120,10,200','150,40,220','85,0,165'])},
    {name:'Rainbow', dur:7, pal:P(['255,0,0','255,110,0','255,220,0','0,220,40','0,220,255','0,80,255','180,0,255'])},
    {name:'Tide',    dur:7, pal:P(['0,210,255','40,80,255','120,0,255','0,160,220'])},
    {name:'Eclipse', dur:7, pal:P(['255,140,20','255,200,60','180,90,40','80,160,255','20,80,255']), L:[255,160,30], R:[40,140,255]},
    {name:'Wave',    dur:7, pal:P(['0,0,180','0,80,255','0,200,255','0,40,200'])},
    {name:'Rainbow Wave', dur:8, pal:P(['255,0,0','255,110,0','255,220,0','0,220,40','0,220,255','0,80,255','180,0,255'])},
    {name:'AIFRED',  dur:15, pal:P(['0,0,180','0,80,255','0,200,255','180,0,255','255,100,0','255,215,0'])}
  ];
  var XF=2.5, TOTAL=STEPS.reduce(function(s,x){return s+x.dur;},0), TAU=Math.PI*2;
  function fr(v){return v-Math.floor(v);}
  function ss(a,b,v){v=Math.max(0,Math.min(1,(v-a)/(b-a)));return v*v*(3-2*v);}
  function pal(p,u,o){u=fr(u)*p.length;var i=Math.floor(u),f=u-i,a=p[i],b=p[(i+1)%p.length];f=f*f*(3-2*f);
    o[0]=a[0]+(b[0]-a[0])*f;o[1]=a[1]+(b[1]-a[1])*f;o[2]=a[2]+(b[2]-a[2])*f;return o;}
  var c=[0,0,0], d=[0,0,0];
  /* each field writes rgb (0..255) into o for normalized x,y at global time T */
  var FIELD=[
    function(s,x,y,T,o){pal(s.pal,x*.8+.15*Math.sin(y*3+T*.4)+T*.05,o);return .78+.22*Math.sin(T*TAU/5);},
    function(s,x,y,T,o){pal(s.pal,x*.5-T*.08+.1*y,o);var k=fr(x*.7+y*.2-T*.14)-.5;return .55+.45*Math.exp(-k*k/.025);},
    function(s,x,y,T,o){pal(s.pal,(1-y)*.9+.1*Math.sin(x*4+T*.3)-T*.05,o);return .45+.55*y;},
    function(s,x,y,T,o){var dx=x-.5,dy=(y-.5)*.8,r=Math.sqrt(dx*dx+dy*dy),a=Math.atan2(dy,dx);
      pal(s.pal,r*1.3-T*.05+.08*Math.sin(a*5+T*.3),o);return (.6+.4*Math.sin(T*TAU/6-r*3))*(1-.5*r);},
    function(s,x,y,T,o){pal(s.pal,x*.6+y*.2+T*.03,o);return .8;},
    function(s,x,y,T,o){pal(s.pal,T*.07+.22*Math.sin(x*2+y*1.5+T*.2),o);return .8;},
    function(s,x,y,T,o){var sm=.5+.12*Math.sin(T*.4)+.05*Math.sin(y*3+T*.3),k=ss(sm-.14,sm+.14,x);
      for(var i=0;i<3;i++)o[i]=s.L[i]+(s.R[i]-s.L[i])*k;var g=Math.exp(-(x-sm)*(x-sm)/.004);return .7+.3*g;},
    function(s,x,y,T,o){pal(s.pal,.05+.1*x,o);var cy=.55+.2*Math.sin(x*4-T*.9),k=Math.exp(-(y-cy)*(y-cy)/.012);
      o[0]+=(0-o[0])*k;o[1]+=(200-o[1])*k;o[2]+=(255-o[2])*k;return .7+.3*k;},
    function(s,x,y,T,o){pal(s.pal,x*.8+T*.04,o);return .5+.45*(.5+.5*Math.sin(x*6+y*1.5-T*1.1));},
    function(s,x,y,T,o){ /* sapphire core + gentle all-colour aurora wave across the top */
      var dx=x-.5,dy=y-.55,r=Math.sqrt(dx*dx+dy*dy);pal(s.pal,.02+.25*r+.04*Math.sin(T*.25),o);
      var core=Math.max(0,1-r*1.4);o[0]*=.6;o[1]=o[1]*.8+40*core;o[2]=Math.min(255,o[2]+60*core);
      var ay=.22+.08*Math.sin(x*3-T*.5),ak=Math.exp(-(y-ay)*(y-ay)/.01)*.45;pal(s.pal,x*.9+T*.05,d);
      for(var i=0;i<3;i++)o[i]+=(d[i]-o[i])*ak;return .7+.18*Math.sin(T*TAU/8);}
  ];
  var W=0,H=0,img=null;
  function size(){var a=innerWidth/innerHeight||1;H=72;W=Math.max(48,Math.min(220,Math.round(H*a)));
    cv.width=W;cv.height=H;img=ctx.createImageData(W,H);}
  function locate(t){t=fr(t/TOTAL)*TOTAL;for(var i=0;i<STEPS.length;i++){if(t<STEPS[i].dur)return[i,t];t-=STEPS[i].dur;}return[STEPS.length-1,0];}
  var cur=0;
  function frame(T){
    var L=locate(T),i=L[0],lt=L[1],s=STEPS[i],j=(i+1)%STEPS.length,n=STEPS[j];
    var mix=ss(s.dur-XF,s.dur,lt); cur=i; var px=img.data,p=0;
    for(var yy=0;yy<H;yy++){var y=yy/(H-1);for(var xx=0;xx<W;xx++){var x=xx/(W-1);
      var b=FIELD[i](s,x,y,T,c),r=c[0]*b,g=c[1]*b,bl=c[2]*b;
      if(mix>0){var b2=FIELD[j](n,x,y,T,d);r+=(d[0]*b2-r)*mix;g+=(d[1]*b2-g)*mix;bl+=(d[2]*b2-bl)*mix;}
      px[p++]=r;px[p++]=g;px[p++]=bl;px[p++]=255;}}
    ctx.putImageData(img,0,0);
  }
  size(); addEventListener('resize',function(){size();if(reduced)still();});
  var mq=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):null, reduced=!!(mq&&mq.matches);
  function still(){ /* calm static sapphire-and-amber glow */
    var g=ctx.createRadialGradient(W*.5,H*.62,0,W*.5,H*.62,W*.6);g.addColorStop(0,'rgb(20,70,210)');g.addColorStop(.55,'rgb(8,24,90)');g.addColorStop(1,'rgb(11,9,8)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);var a=ctx.createRadialGradient(W*.5,0,0,W*.5,0,H*.7);
    a.addColorStop(0,'rgba(255,150,40,.55)');a.addColorStop(1,'rgba(255,150,40,0)');ctx.fillStyle=a;ctx.fillRect(0,0,W,H);}
  var t0=null,last=0;
  function loop(ts){if(reduced)return;if(t0===null)t0=ts;if(ts-last>=33){last=ts;frame((ts-t0)/1000);}requestAnimationFrame(loop);}
  if(reduced) still(); else requestAnimationFrame(loop);
  if(mq&&mq.addEventListener) mq.addEventListener('change',function(e){reduced=e.matches;if(reduced)still();else{t0=null;requestAnimationFrame(loop);}});
  window.__lightshow={steps:STEPS.map(function(s){return s.name;}),current:function(){return reduced?'static':STEPS[cur].name;},total:TOTAL};
})();
