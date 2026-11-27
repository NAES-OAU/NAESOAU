/* Executives page */
fillDob($("eMonth"),$("eDay"));
const ROLES={
  generals:"Generals (Full Access)",
  pro:"PRO",
  special:"Special",
  treasurer:"Treasurer",
  welfare:"Welfare"
};
const ALL_PERMS=["students_read","students_write","payments_read","payments_write","feedback_read","feedback_write","settings","admins"];
let access={role:"",perms:[]},meId="",meEmail="",mfaFactor=null;
const can=p=>access.perms.includes(p);
const showEl=(id,on)=>{$(id).style.display=on?"":"none"};
const td=(tr,t)=>{const c=document.createElement("td");c.textContent=t||"";tr.appendChild(c);return c};
const statusOf=r=>pays[r.reg_no]?LABEL[pays[r.reg_no].status]:"Unpaid";
function addBtn(cell,t,alt,fn){const b=document.createElement("button");b.type="button";b.className="btn sm"+(alt?" alt":"");b.textContent=t;b.onclick=fn;cell.appendChild(b)}
function waLink(r,p){
  let d=(r.phone||"").replace(/\D/g,"");
  if(d.startsWith("0"))d="234"+d.slice(1);else if(d.length===10)d="234"+d;
  const fn=(r.full_name||"").split(" ")[0],url=location.origin+"/";let t;
  if(p&&p.status==="approved")t="Hello "+fn+", your NAESOAU dues payment of "+naira(r.amount_due)+" has been confirmed. Download your receipt here: "+url+"receipt.html";
  else if(p&&p.status==="pending")t="Hello "+fn+", we have received your NAESOAU dues receipt and will confirm it shortly.";
  else if(p&&p.status==="rejected")t="Hello "+fn+", we could not confirm your NAESOAU dues receipt. Please upload a clear receipt again here: "+url+"pay.html";
  else t="Hello "+fn+", a reminder to pay your NAESOAU dues of "+naira(r.amount_due)+" to "+BANK_NAME+", "+ACCOUNT_NAME+", "+ACCOUNT_NUMBER+". Then upload your receipt here: "+url+"pay.html";
  return "https://wa.me/"+d+"?text="+encodeURIComponent(t);
}
async function fetchAll(table){
  const out=[];
  for(let from=0;;from+=1000){
    const {data,error}=await sb.from(table).select("*").order("created_at",{ascending:false}).order("id").range(from,from+999);
    if(error)return {data:null,error};
    out.push(...data);
    if(data.length<1000)break;
  }
  return {data:out,error:null};
}
async function signAll(bucket,paths){
  const out=[];
  for(let i=0;i<paths.length;i+=500){
    const r=await sb.storage.from(bucket).createSignedUrls(paths.slice(i,i+500),3600);
    out.push(...(r.data||[]));
  }
  return out;
}
async function signUrls(){
  pu={};ru={};
  const pp=await signAll("photos",regs.filter(r=>!r.photo_data).map(r=>r.photo_path));
  const rr=await signAll("receipts",allPays.map(p=>p.receipt_path).filter(Boolean));
  pp.forEach(u=>pu[u.path]=u.signedUrl);rr.forEach(u=>ru[u.path]=u.signedUrl);
}
async function openFull(path){
  const {data,error}=await sb.storage.from("photos").createSignedUrl(path,300);
  if(error||!data){say("dmsg","Could not open the full image.","err");return}
  const l=document.createElement("a");l.href=data.signedUrl;l.target="_blank";l.rel="noopener";l.click();
}
const last10=s=>String(s||"").replace(/\D/g,"").slice(-10);
const nameKey=s=>String(s||"").toLowerCase().replace(/[^a-z]/g,"");
function findDups(){
  const byPhone={},byName={},dup=new Set();
  regs.forEach(r=>{const p=last10(r.phone),n=nameKey(r.full_name);if(p.length>=10)(byPhone[p]=byPhone[p]||[]).push(r.id);if(n)(byName[n]=byName[n]||[]).push(r.id)});
  [byPhone,byName].forEach(m=>Object.values(m).forEach(g=>{if(g.length>1)g.forEach(id=>dup.add(id))}));
  return dup;
}
async function loadAdmin(){
  const acc=await sb.rpc("my_access");
  const row=first(acc.data);
  const legacy=acc.error&&/my_access|PGRST202/.test(String(acc.error.message||"")+String(acc.error.code||""));
  if(legacy)access={role:"super",perms:ALL_PERMS.slice()};
  else if(acc.error||!row){
    say("amsg","This account is not an executive, or its access has been switched off.","err");
    showEl("login",true);showEl("mfaForm",false);showEl("data",false);
    try{await sb.auth.signOut()}catch(e){}
    return;
  }else access={role:row.role,perms:row.perms||[]};
  try{const u=await sb.auth.getUser();meId=u.data&&u.data.user?u.data.user.id:"";meEmail=u.data&&u.data.user?u.data.user.email:""}catch(e){}
  $("who").textContent=(meEmail||"Signed in")+" · "+(ROLES[access.role]||access.role);
  showEl("login",false);showEl("mfaForm",false);showEl("data",true);
  showEl("secSettings",can("settings"));showEl("secStudents",can("students_read"));
  showEl("secFeedback",can("feedback_read"));showEl("secExec",can("admins"));
  showEl("csvPay",can("payments_read"));
  const s=await sb.from("app_settings").select("value").eq("key","session").maybeSingle();
  if(s.data)session=s.data.value;
  $("sessInput").value=session;
  regs=[];allPays=[];pays={};
  if(can("students_read")){const a=await fetchAll("registrations");if(a.error){say("dmsg","Could not load registrations.","err");return}regs=a.data}
  if(can("payments_read")){const b=await fetchAll("payments");if(b.error){say("dmsg","Could not load payments.","err");return}allPays=b.data||[]}
  allPays.forEach(p=>{if(p.session===session&&!pays[p.reg_no])pays[p.reg_no]=p});
  await signUrls();
  renderRegs();renderSummary();
  if(can("feedback_read")){const fb=await fetchAll("feedback");renderFeedback(fb.data||[])}
  if(can("admins")){loadExecs();loadLog()}
  refreshMfaUi();
  if(!access.perms.length)say("dmsg","You are signed in but have no access yet. Ask a Super Admin to check your role.","err");
}
function renderRegs(){
  const q=$("q").value.trim().toUpperCase(),lv=$("fLevel").value,du=$("fDues").value,dp=$("fDup").value,dups=findDups();
  const paid=regs.filter(r=>statusOf(r)==="Paid").length,pend=regs.filter(r=>statusOf(r)==="Pending").length;
  const list=regs.filter(r=>{
    if(lv!=="all"&&r.level!==lv)return false;
    if(dp==="dup"&&!dups.has(r.id))return false;
    if(du!=="all"&&statusOf(r)!==du)return false;
    if(!q)return true;
    const p=pays[r.reg_no];
    return [r.full_name,r.reg_no,r.phone,r.email,p&&p.status==="approved"?recNo(p):""].join(" ").toUpperCase().includes(q);
  });
  $("count").textContent="("+regs.length+" registered, "+paid+" paid, "+pend+" pending, "+list.length+" shown"+(dups.size?", "+dups.size+" possible duplicates":"")+")";
  const body=$("rows");body.textContent="";
  list.forEach(r=>{
    const p=pays[r.reg_no],tr=document.createElement("tr"),pt=document.createElement("td");
    const src=r.photo_data||pu[r.photo_path];
    if(src){const im=document.createElement("img");im.src=src;im.alt="";im.loading="lazy";im.decoding="async";im.title="Click to see the full image";im.style.cursor="pointer";im.onclick=()=>openFull(r.photo_path);pt.appendChild(im)}
    tr.appendChild(pt);
    [r.full_name,r.reg_no,bday(r),r.phone,r.email,r.level,naira(r.amount_due),statusOf(r),p&&p.status==="approved"?recNo(p):"",p&&p.reviewed_by?p.reviewed_by:""].forEach(x=>td(tr,x));
    if(dups.has(r.id)){const s=document.createElement("small");s.textContent="Possible duplicate";s.style.cssText="display:block;color:#c0392b;font-weight:600";tr.children[1].appendChild(s)}
    const rc=td(tr,""),ac=td(tr,"");
    if(p&&p.receipt_path&&ru[p.receipt_path]){const l=document.createElement("a");l.href=ru[p.receipt_path];l.target="_blank";l.rel="noopener";l.textContent="View";rc.appendChild(l)}
    else if(p&&p.method==="cash")rc.textContent="Cash";
    ac.style.whiteSpace="normal";ac.style.minWidth="260px";
    if(can("payments_write")&&p&&p.status==="pending"){addBtn(ac,"Approve",false,()=>approve(r,p));addBtn(ac,"Reject",true,()=>setPay(p.id,"rejected"))}
    if(can("payments_write")&&(!p||p.status==="rejected"))addBtn(ac,"Mark as Paid (Cash)",true,()=>cashPay(r));
    const m=document.createElement("a");m.className="btn alt sm";m.href=waLink(r,p);m.target="_blank";m.rel="noopener";m.textContent="Message";if(can("students_write")||can("payments_write"))ac.appendChild(m);
    if(can("students_write"))addBtn(ac,"Edit",true,()=>startEdit(r));
    if(can("students_write")&&(!p||p.status!=="approved"))addBtn(ac,"Delete",true,()=>delReg(r));
    body.appendChild(tr);
  });
}
let rt;["q","fLevel","fDues","fDup"].forEach(i=>$(i).addEventListener("input",()=>{clearTimeout(rt);rt=setTimeout(renderRegs,150)}));

/* ---------- Dues summary for the treasurer ---------- */
const LEVELS=["100 Level","200 Level (Regular)","200 Level (DE)","300 Level","400 Level"];
function renderSummary(){
  const box=$("summary");box.textContent="";
  const h=document.createElement("b");h.textContent="Dues Summary"+(session?" ("+session+")":"");box.appendChild(h);
  const wrap=document.createElement("div");wrap.className="scroll";
  const t=document.createElement("table"),hd=document.createElement("tr");
  ["Level","Registered","Paid","Pending","Unpaid","Collected","Outstanding"].forEach(x=>{const c=document.createElement("th");c.textContent=x;hd.appendChild(c)});
  const th=document.createElement("thead");th.appendChild(hd);t.appendChild(th);
  const tb=document.createElement("tbody"),T=[0,0,0,0,0,0];
  const line=(name,v,bold)=>{const tr=document.createElement("tr");td(tr,name);v.forEach((x,i)=>td(tr,i>=4?naira(x):String(x)));if(bold)tr.style.fontWeight="800";tb.appendChild(tr)};
  LEVELS.forEach(lv=>{
    const rs=regs.filter(r=>r.level===lv);if(!rs.length)return;
    const v=[rs.length,0,0,0,0,0];
    rs.forEach(r=>{const p=pays[r.reg_no];
      if(p&&p.status==="approved"){v[1]++;v[4]+=p.amount_due}
      else{if(p&&p.status==="pending")v[2]++;else v[3]++;v[5]+=r.amount_due}});
    v.forEach((x,i)=>T[i]+=x);line(lv,v);
  });
  line("Total",T,true);
  t.appendChild(tb);wrap.appendChild(t);box.appendChild(wrap);
}
async function setPay(id,status){
  const {data,error}=await sb.from("payments").update({status}).eq("id",id).select();
  if(error||!data||!data.length){say("dmsg","Could not update. Try again.","err");return}
  loadAdmin();
}
function approve(r,p){
  if(!confirm("Approve "+naira(r.amount_due)+" for "+r.full_name+"? Check the First Bank account first."))return;
  setPay(p.id,"approved");
}
async function cashPay(r){
  if(!confirm("Record a cash payment of "+naira(r.amount_due)+" for "+r.full_name+"?"))return;
  const {error}=await sb.from("payments").insert({reg_no:r.reg_no,method:"cash",status:"approved"});
  if(error){say("dmsg",(String(error.message).includes("ALREADY_SUBMITTED")||error.code==="23505")?"This student already has a payment for this session.":"Could not record the payment. Try again.","err");return}
  loadAdmin();
}
function startEdit(r){
  editing=r;
  $("eName").value=r.full_name;$("eReg").value=r.reg_no;$("ePhone").value=r.phone;$("eEmail").value=r.email;
  $("eLevel").value=r.level;$("eMonth").value=r.dob_month;$("eDay").value=r.dob_day;
  $("ef").style.display="grid";$("ef").scrollIntoView();
}
$("eCancel").addEventListener("click",()=>{$("ef").style.display="none";editing=null});
$("ef").addEventListener("submit",async e=>{
  e.preventDefault();if(!editing)return;
  const v={full_name:$("eName").value.trim(),reg_no:normReg($("eReg").value),phone:$("ePhone").value.trim(),email:$("eEmail").value.trim(),level:$("eLevel").value,dob_month:+$("eMonth").value,dob_day:+$("eDay").value};
  if(v.phone.replace(/\D/g,"").length<10){say("dmsg","The WhatsApp number needs at least 10 digits.","err");return}
  if(v.dob_month&&v.dob_day&&!okDob(v.dob_month,v.dob_day)){say("dmsg","That birthday does not exist. Check the month and day.","err");return}
  if(!v.full_name||!v.phone||!v.dob_month||!v.dob_day||!/^\S+@\S+\.\S+$/.test(v.email)||!REGEX.test(v.reg_no)){say("dmsg","Check every field. "+REGMSG,"err");return}
  const {data,error}=await sb.from("registrations").update(v).eq("id",editing.id).select();
  if(error||!data||!data.length){say("dmsg",error&&error.code==="23505"?"That registration or matric number is already used.":"Could not save the changes.","err");return}
  $("ef").style.display="none";editing=null;say("dmsg","Changes saved.","ok");loadAdmin();
});
async function delReg(r){
  if(!confirm("Delete "+r.full_name+" and all their pending or rejected receipts? This cannot be undone."))return;
  const files=allPays.filter(p=>p.reg_no===r.reg_no&&p.receipt_path).map(p=>p.receipt_path);
  const {data,error}=await sb.from("registrations").delete().eq("id",r.id).select();
  if(error||!data||!data.length){say("dmsg",String(error&&error.message).includes("HAS_APPROVED_PAYMENT")?"This student has an approved payment and cannot be deleted.":"Could not delete. Try again.","err");return}
  await sb.storage.from("photos").remove([r.photo_path]).catch(()=>{});
  if(files.length)await sb.storage.from("receipts").remove(files).catch(()=>{});
  say("dmsg","Deleted.","ok");loadAdmin();
}
$("sessSave").addEventListener("click",async()=>{
  const v=$("sessInput").value.trim();
  if(!/^\d{4}\/\d{4}$/.test(v)){say("dmsg","Use the format 2026/2027.","err");return}
  if(!confirm("Change the session to "+v+"? New payments will count for this session and everyone will show as Unpaid until they pay."))return;
  const {data,error}=await sb.from("app_settings").update({value:v}).eq("key","session").select();
  if(error||!data||!data.length){say("dmsg","Could not change the session.","err");return}
  say("dmsg","Session changed.","ok");loadAdmin();
});

const FB_LABEL={new:"Pending",approved:"Approved",rejected:"Rejected",resolved:"Resolved"};
function renderFeedback(list){
  if(list)fbList=list;
  const pending=fbList.filter(f=>f.status==="new").length;
  $("fbCount").textContent="("+fbList.length+" total, "+pending+" pending)";
  const flt=$("fbFilter").value,body=$("fbRows");body.textContent="";
  fbList.filter(f=>flt==="all"||f.status===flt).forEach(f=>{
    const tr=document.createElement("tr");
    td(tr,new Date(f.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}));
    td(tr,f.category);
    const m=td(tr,f.message);m.style.whiteSpace="normal";m.style.minWidth="260px";
    td(tr,f.contact||"");td(tr,FB_LABEL[f.status]||f.status);
    const a=td(tr,"");
    if(can("feedback_write")&&f.status==="new"){addBtn(a,"Approve",false,()=>setFeedback(f.id,"approved"));addBtn(a,"Reject",true,()=>setFeedback(f.id,"rejected"))}
    if(can("feedback_write")&&f.status==="approved")addBtn(a,"Mark Resolved",false,()=>setFeedback(f.id,"resolved"));
    if(can("feedback_write"))addBtn(a,"Delete",true,()=>deleteFeedback(f.id));
    body.appendChild(tr);
  });
}
async function setFeedback(id,status){
  const {data,error}=await sb.from("feedback").update({status}).eq("id",id).select();
  if(error||!data||!data.length){say("dmsg","Could not update. Try again.","err");return}
  loadAdmin();
}
async function deleteFeedback(id){
  if(!confirm("Delete this message permanently?"))return;
  const {data,error}=await sb.from("feedback").delete().eq("id",id).select();
  if(error||!data||!data.length){say("dmsg","Could not delete. Try again.","err");return}
  loadAdmin();
}
$("fbFilter").addEventListener("change",()=>renderFeedback());

$("login").addEventListener("submit",async e=>{
  e.preventDefault();
  const {error}=await sb.auth.signInWithPassword({email:$("aEmail").value.trim(),password:$("aPass").value});
  if(error){say("amsg","Wrong email or password.","err");return}
  $("amsg").className="msg";afterAuth();
});
$("out").addEventListener("click",async()=>{await sb.auth.signOut();location.reload()});
/* ---------- Clean up files nobody uses ---------- */
async function listFiles(bucket){
  const out=[];
  for(let off=0;;off+=1000){
    const {data,error}=await sb.storage.from(bucket).list("",{limit:1000,offset:off,sortBy:{column:"created_at",order:"asc"}});
    if(error)throw error;
    out.push(...data.filter(f=>f.id));
    if(data.length<1000)break;
  }
  return out;
}
async function usedPaths(table,col){
  const out=new Set();
  for(let from=0;;from+=1000){
    const {data,error}=await sb.from(table).select(col).order("id").range(from,from+999);
    if(error)throw error;
    data.forEach(r=>{if(r[col])out.add(r[col])});
    if(data.length<1000)break;
  }
  return out;
}
$("clean").addEventListener("click",async()=>{
  $("clean").disabled=true;say("dmsg","Checking files. This can take a moment.","ok");
  try{
    const [usedP,usedR,ph,rc]=await Promise.all([usedPaths("registrations","photo_path"),usedPaths("payments","receipt_path"),listFiles("photos"),listFiles("receipts")]);
    if((ph.length&&!usedP.size)||(rc.length&&!usedR.size)){say("dmsg","Stopped. Could not read the registration or payment list, so nothing was deleted.","err");return}
    const old=f=>Date.now()-new Date(f.created_at).getTime()>3600000;
    const dp=ph.filter(f=>old(f)&&!usedP.has(f.name)).map(f=>f.name);
    const dr=rc.filter(f=>old(f)&&!usedR.has(f.name)).map(f=>f.name);
    if(!dp.length&&!dr.length){say("dmsg","No unused files found.","ok");return}
    if(!confirm("Delete "+dp.length+" unused image(s) and "+dr.length+" unused receipt file(s)? Files linked to a registration or payment are never touched. This cannot be undone."))return;
    let gone=0;
    for(const [bucket,names] of [["photos",dp],["receipts",dr]]){
      for(let i=0;i<names.length;i+=100){
        const r=await sb.storage.from(bucket).remove(names.slice(i,i+100));
        if(r.error)throw r.error;
        gone+=(r.data||[]).length;
      }
    }
    say("dmsg","Deleted "+gone+" unused file(s).","ok");
  }catch(e){say("dmsg","Could not finish the cleanup. Try again.","err")}
  finally{$("clean").disabled=false}
});

/* ---------- CSV ---------- */
function download(name,rows){
  // Stop spreadsheet formulas: text from students that starts with = @ + - is prefixed with '
  const safe=x=>{const t=String(x??"");return /^[=@\t\r]/.test(t)||(/^[+-]/.test(t)&&!/^[+-]?[\d\s()-]+$/.test(t))?"'"+t:t};
  const q=x=>'"'+safe(x).replace(/"/g,'""')+'"';
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+rows.map(r=>r.map(q).join(",")).join("\n")],{type:"text/csv"}));a.download=name;a.click();
}
$("csv").addEventListener("click",()=>download("naesoau-registrations.csv",[["Name","Reg/Matric No","Birthday","WhatsApp","Email","Level","Amount Due","Dues ("+session+")","Receipt No"]].concat(regs.map(r=>{const p=pays[r.reg_no];return [r.full_name,r.reg_no,bday(r),r.phone,r.email,r.level,r.amount_due,statusOf(r),p&&p.status==="approved"?recNo(p):""]}))));
$("csvUnpaid").addEventListener("click",()=>{
  const list=regs.filter(r=>{const x=statusOf(r);return x==="Unpaid"||x==="Rejected"});
  if(!list.length){say("dmsg","Everyone has paid or has a receipt waiting.","ok");return}
  download("naesoau-unpaid.csv",[["Name","Reg/Matric No","WhatsApp","Email","Level","Amount Due","Dues ("+session+")"]].concat(list.map(r=>[r.full_name,r.reg_no,r.phone,r.email,r.level,r.amount_due,statusOf(r)])));
});
$("csvPay").addEventListener("click",()=>{
  const byReg={};regs.forEach(r=>byReg[r.reg_no]=r);
  download("naesoau-payments.csv",[["Receipt No","Reg/Matric No","Name","Amount","Method","Session","Status","Name on Transfer","Submitted","Reviewed","Reviewed By"]].concat(allPays.map(p=>[recNo(p),p.reg_no,byReg[p.reg_no]?byReg[p.reg_no].full_name:"",p.amount_due,p.method,p.session,p.status,p.sender_name||"",p.created_at,p.reviewed_at||"",p.reviewed_by||""])));
});
/* ---------- 2-step verification ---------- */
async function afterAuth(){
  try{
    const {data}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if(data&&data.nextLevel==="aal2"&&data.currentLevel!=="aal2"){showEl("login",false);showEl("data",false);showEl("mfaForm",true);return}
  }catch(e){}
  loadAdmin();
}
$("mfaForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=await sb.auth.mfa.listFactors();
  const fac=((f.data&&f.data.totp)||[]).find(x=>x.status==="verified");
  if(!fac){say("mmsg","No 2-step device found. Sign in again.","err");return}
  const {error}=await sb.auth.mfa.challengeAndVerify({factorId:fac.id,code:$("mfaCode").value.trim()});
  if(error){say("mmsg","That code is not right. Check the app and try again.","err");return}
  $("mfaCode").value="";$("mmsg").className="msg";loadAdmin();
});
async function refreshMfaUi(){
  try{const f=await sb.auth.mfa.listFactors();const on=((f.data&&f.data.totp)||[]).some(x=>x.status==="verified");showEl("mfaSetup",!on);showEl("mfaOn",on)}catch(e){}
}
$("mfaSetup").addEventListener("click",async()=>{
  try{
    const lf=await sb.auth.mfa.listFactors();
    for(const f of ((lf.data&&lf.data.all)||[])){if(f.status!=="verified")await sb.auth.mfa.unenroll({factorId:f.id})}
    const {data,error}=await sb.auth.mfa.enroll({factorType:"totp",friendlyName:"NAESOAU "+Date.now()});
    if(error||!data){say("dmsg","2-step verification could not start. In Supabase, open Authentication, find Multi-Factor, and switch on TOTP (authenticator app).","err");return}
    mfaFactor=data.id;$("mfaQr").src=data.totp.qr_code;$("mfaSecret").textContent=data.totp.secret;$("mfaPanel").style.display="";
  }catch(e){say("dmsg","2-step verification could not start. Try again.","err")}
});
$("mfaVerify").addEventListener("click",async()=>{
  const code=$("mfaSetCode").value.trim();
  if(!/^\d{6}$/.test(code)){say("dmsg","Enter the 6-digit code from your authenticator app.","err");return}
  const {error}=await sb.auth.mfa.challengeAndVerify({factorId:mfaFactor,code});
  if(error){say("dmsg","That code is not right. Check the app and try again.","err");return}
  $("mfaPanel").style.display="none";$("mfaSetCode").value="";
  say("dmsg","2-step verification is on for your account.","ok");refreshMfaUi();if(can("admins"))loadExecs();
});

/* ---------- Executive accounts (Super Admin) ---------- */
function execErr(m){
  m=String(m||"");
  return m.includes("NO_SUCH_USER")?"No account with that email. Create it first in Supabase under Authentication, then Users, then add it here.":
    m.includes("LAST_SUPER")?"At least one active Super Admin must remain.":
    m.includes("NO_MFA_FACTOR")?"That person has not set up 2-step verification yet.":
    m.includes("FORBIDDEN")?"Only a Super Admin can do this.":"Could not save. Try again.";
}
const tick=(cell,on,label)=>{const c=document.createElement("input");c.type="checkbox";c.checked=on;c.style.cssText="width:auto;padding:0;margin:0 6px 0 0";cell.appendChild(c);cell.appendChild(document.createTextNode(label));return c};
async function loadExecs(){
  const {data,error}=await sb.rpc("admin_list");
  const body=$("execRows");body.textContent="";
  if(error){say("xmsg","The executive list is not available yet. Run the roles SQL in Supabase first.","err");return}
  (data||[]).forEach(a=>{
    const tr=document.createElement("tr");
    td(tr,a.email||"(unknown)");
    const rc=td(tr,""),sel=document.createElement("select");sel.style.width="auto";
    Object.entries(ROLES).forEach(([k,v])=>sel.add(new Option(v,k)));sel.value=a.role;rc.appendChild(sel);
    const act=tick(td(tr,""),a.active," Active");
    td(tr,a.mfa_enrolled?"Set up":"Not set up");
    const req=tick(td(tr,""),a.require_mfa," Required");
    td(tr,a.last_sign_in_at?new Date(a.last_sign_in_at).toLocaleString("en-GB"):"Never");
    addBtn(td(tr,""),"Save",false,()=>saveExec(a.user_id,sel.value,act.checked,req.checked));
    body.appendChild(tr);
  });
}
async function saveExec(id,role,active,req){
  const {error}=await sb.rpc("admin_update",{p_user_id:id,p_role:role,p_active:active,p_require_mfa:req});
  if(error){say("xmsg",execErr(error.message),"err");loadExecs();return}
  say("xmsg","Saved.","ok");loadExecs();loadLog();
  if(id===meId)afterAuth();
}
$("execAdd").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("xEmail").value.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){say("xmsg","Enter the executive's email address.","err");return}
  const {error}=await sb.rpc("admin_add",{p_email:email,p_role:$("xRole").value});
  if(error){say("xmsg",execErr(error.message),"err");return}
  $("xEmail").value="";say("xmsg","Executive added.","ok");loadExecs();loadLog();
});

/* ---------- Activity log (Super Admin) ---------- */
const dv=v=>{if(v===null||v===undefined||v==="")return"empty";const s=typeof v==="object"?JSON.stringify(v):String(v);return s.length>40?s.slice(0,40)+"…":s};
function fmtDetail(action,d){
  if(!d)return"";
  if(/ update$/.test(action))return Object.entries(d).map(([k,v])=>k+": "+dv(v.from)+" → "+dv(v.to)).join("; ");
  const s=JSON.stringify(d);return s.length>180?s.slice(0,180)+"…":s;
}
async function loadLog(){
  const {data,error}=await sb.from("audit_log").select("*").order("at",{ascending:false}).limit(200);
  const body=$("logRows");body.textContent="";
  if(error)return;
  (data||[]).forEach(l=>{
    const tr=document.createElement("tr");
    td(tr,new Date(l.at).toLocaleString("en-GB"));td(tr,l.actor_email||"");td(tr,l.action);td(tr,l.target||"");
    const d=td(tr,fmtDetail(l.action,l.detail));d.style.whiteSpace="normal";d.style.minWidth="260px";
    body.appendChild(tr);
  });
}
$("logRefresh").addEventListener("click",loadLog);

/* Already signed in on this device? Go straight to the dashboard. */
(async()=>{try{const {data}=await sb.auth.getSession();if(data.session)afterAuth()}catch(e){}})();

