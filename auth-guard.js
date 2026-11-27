// Front-end session gate. Database RLS must independently enforce the same access rules.
(function(){
  const style=document.createElement("style");style.textContent="body{visibility:hidden!important}";document.head.appendChild(style);
  async function check(){try{const {data,error}=await sb.auth.getSession();if(error)throw error;if(!data.session){const next=location.pathname.split("/").pop()||"home.html";location.replace("index.html?next="+encodeURIComponent(next));return;}document.body.style.visibility="visible";style.remove();}
  catch(e){console.error("Session check failed",e);location.replace("index.html");}}
  check();
  sb.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){location.replace("index.html")}});
})();
