/* Remembers a student on this device, only when they tick "Keep me signed in". */
const STUDENT_KEY="naes_student";
function getStudent(){try{const s=JSON.parse(localStorage.getItem(STUDENT_KEY)||"null");return s&&s.reg&&s.phone?s:null}catch(e){return null}}
function setStudent(reg,phone){try{localStorage.setItem(STUDENT_KEY,JSON.stringify({reg:reg,phone:phone}));return true}catch(e){return false}}
function clearStudent(){try{localStorage.removeItem(STUDENT_KEY);sessionStorage.removeItem("naes_reg");sessionStorage.removeItem("naes_phone");sessionStorage.removeItem("naes_keep")}catch(e){}}
(function(){
  if(!getStudent())return;
  const h=document.querySelector("header");if(!h)return;
  const w=document.createElement("span");w.className="who";
  const t=document.createElement("span");t.textContent="Saved on this device";
  const b=document.createElement("button");b.type="button";b.textContent="Forget";
  b.addEventListener("click",function(){clearStudent();location.reload()});
  w.appendChild(t);w.appendChild(b);h.appendChild(w);
})();
