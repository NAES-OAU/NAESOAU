/* NAESOAU home page slideshow.
   To add a photo: upload it next to index.html, then add a line to SLIDES below.
   Photos that are missing are skipped quietly, so the list can be longer than what is uploaded. */
(function(){
  var SLIDES=[
    {src:"hero-2.jpg",alt:"NAESOAU members at an association event, photo 2"},
    {src:"hero-3.jpg",alt:"NAESOAU members at an association event, photo 3"},
    {src:"hero-4.jpg",alt:"NAESOAU members at an association event, photo 4"},
    {src:"hero-5.jpg",alt:"NAESOAU members at an association event, photo 5"},
    {src:"hero-6.jpg",alt:"NAESOAU members at an association event, photo 6"},
    {src:"hero-7.jpg",alt:"NAESOAU members at an association event, photo 7"},
    {src:"hero-8.jpg",alt:"NAESOAU members at an association event, photo 8"},
    {src:"hero-9.jpg",alt:"NAESOAU members at an association event, photo 9"},
    {src:"hero-10.jpg",alt:"NAESOAU members at an association event, photo 10"},
    {src:"hero-11.jpg",alt:"NAESOAU members at an association event, photo 11"},
    {src:"hero-12.jpg",alt:"NAESOAU members at an association event, photo 12"},
    {src:"hero-13.jpg",alt:"NAESOAU members at an association event, photo 13"},
    {src:"hero-14.jpg",alt:"NAESOAU members at an association event, photo 14"},
    {src:"hero-15.jpg",alt:"NAESOAU members at an association event, photo 15"}
  ];
  var INTERVAL=5000; /* milliseconds each photo stays on screen */

  var box=document.getElementById("heroSlides");
  if(!box)return;
  var imgs=[box.querySelector(".slide")];
  var cur=0,timer=null,hovering=false,userPaused=false,idx=0;
  var reduce=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var dots=document.createElement("div");dots.className="dots";dots.style.display="none";
  var pp=document.createElement("button");pp.type="button";pp.className="pp";pp.style.display="none";
  box.appendChild(dots);box.appendChild(pp);

  function label(){
    pp.textContent=userPaused?"Play":"Pause";
    pp.setAttribute("aria-label",userPaused?"Play slideshow":"Pause slideshow");
  }
  if(reduce)userPaused=true;
  label();

  function mark(){
    var b=dots.children;
    for(var i=0;i<b.length;i++){if(i===cur)b[i].setAttribute("aria-current","true");else b[i].removeAttribute("aria-current")}
  }
  function show(i){
    if(i===cur)return;
    imgs[cur].classList.remove("on");
    cur=i;
    imgs[cur].classList.add("on");
    mark();
  }
  function next(){show((cur+1)%imgs.length)}
  function prev(){show((cur-1+imgs.length)%imgs.length)}
  function start(){
    if(timer){clearInterval(timer);timer=null}
    if(userPaused||imgs.length<2)return;
    timer=setInterval(function(){if(!hovering&&!document.hidden)next()},INTERVAL);
  }
  function buildDots(){
    dots.textContent="";
    imgs.forEach(function(_,i){
      var b=document.createElement("button");b.type="button";
      b.setAttribute("aria-label","Show photo "+(i+1)+" of "+imgs.length);
      b.addEventListener("click",function(){show(i);start()});
      dots.appendChild(b);
    });
    mark();
    var many=imgs.length>1;
    dots.style.display=many?"flex":"none";
    pp.style.display=many?"":"none";
  }

  pp.addEventListener("click",function(){userPaused=!userPaused;label();start()});
  box.addEventListener("mouseenter",function(){hovering=true});
  box.addEventListener("mouseleave",function(){hovering=false});
  box.addEventListener("focusin",function(){hovering=true});
  box.addEventListener("focusout",function(){hovering=false});

  var x0=null;
  box.addEventListener("touchstart",function(e){x0=e.touches[0].clientX},{passive:true});
  box.addEventListener("touchend",function(e){
    if(x0===null||imgs.length<2)return;
    var dx=e.changedTouches[0].clientX-x0;x0=null;
    if(Math.abs(dx)>40){if(dx<0)next();else prev();start()}
  },{passive:true});

  /* Load the other photos one at a time after the page has finished loading */
  function loadNext(){
    if(idx>=SLIDES.length)return;
    var s=SLIDES[idx++],im=new Image();
    im.onload=function(){
      im.className="slide";im.alt=s.alt||"";
      box.insertBefore(im,dots);
      imgs.push(im);
      buildDots();start();
      setTimeout(loadNext,300);
    };
    im.onerror=function(){loadNext()};
    im.src=s.src;
  }
  window.addEventListener("load",function(){setTimeout(loadNext,800)});
})();
