/* Side menu: slides in from the right. Closes on a link tap, the X, Esc, or a tap outside. */
(function(){
  var btn=document.getElementById("menuBtn"),menu=document.getElementById("menu"),
      scrim=document.getElementById("scrim"),close=document.getElementById("menuClose"),root=document.documentElement;
  if(!btn||!menu||!scrim||!close)return;
  function isOpen(){return root.classList.contains("menu-open")}
  function setOpen(open,returnFocus){
    root.classList.toggle("menu-open",open);
    btn.setAttribute("aria-expanded",open?"true":"false");
    btn.setAttribute("aria-label",open?"Close menu":"Open menu");
    if(open)close.focus();else if(returnFocus)btn.focus();
  }
  btn.addEventListener("click",function(){setOpen(!isOpen(),true)});
  close.addEventListener("click",function(){setOpen(false,true)});
  scrim.addEventListener("click",function(){setOpen(false,true)});
  menu.addEventListener("click",function(e){if(e.target.closest("a"))setOpen(false,false)});
  document.addEventListener("keydown",function(e){
    if(!isOpen())return;
    if(e.key==="Escape"){setOpen(false,true);return}
    if(e.key!=="Tab")return;
    var f=menu.querySelectorAll("a[href],button:not([disabled])");if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  window.addEventListener("pageshow",function(){setOpen(false,false)});
})();
