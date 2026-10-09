(function(){
  var globe=document.getElementById('globe');
  if(globe){
    addEventListener('pageshow',function(){globe.classList.remove('zoom');});
    globe.addEventListener('click',function(ev){
      if(ev.button!==0||ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey) return;
      if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      ev.preventDefault();globe.classList.add('zoom');
      setTimeout(function(){location.href=globe.getAttribute('href');},480);
    });
  }
  // Apple Wallet pass: stays hidden until wallet/config.json says enabled AND a signing endpoint exists.
  fetch('/gate/wallet/config.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null;}).then(function(cfg){
    if(!cfg||cfg.enabled!==true||!cfg.signEndpoint) return;
    var form=document.getElementById('pass-form'),soon=document.getElementById('pass-soon');
    form.hidden=false;soon.hidden=true;
    form.addEventListener('submit',function(ev){
      ev.preventDefault();
      var name=document.getElementById('pass-name').value.trim().slice(0,40);
      if(!name) return;
      location.href=cfg.signEndpoint+'?name='+encodeURIComponent(name);
    });
  }).catch(function(){});
})();
