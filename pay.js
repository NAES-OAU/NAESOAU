/* Pay Dues page */
$("acctNum").textContent=ACCOUNT_NUMBER;$("acctName").textContent=ACCOUNT_NAME;$("acctBank").textContent=BANK_NAME;
$("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(ACCOUNT_NUMBER);$("copy").textContent="Copied"}catch(e){$("copy").textContent="Copy Failed, Select the Number"}});
async function loadSession(){
  try{const {data}=await sb.from("app_settings").select("value").eq("key","session").maybeSingle();if(data){session=data.value;$("sessTxt").textContent=session}}catch(e){}
}
loadSession();
try{const st=getStudent();const r=sessionStorage.getItem("naes_reg")||(st?st.reg:""),p=sessionStorage.getItem("naes_phone")||(st?st.phone:"");if(r)$("payReg").value=r;if(p)$("payPhone").value=p;if(st||sessionStorage.getItem("naes_keep")==="1")$("keepPay").checked=true;sessionStorage.removeItem("naes_reg");sessionStorage.removeItem("naes_phone");sessionStorage.removeItem("naes_keep")}catch(e){}
$("receipt").addEventListener("change",async function(){
  const f=this.files[0];
  if(!f){receiptBlob=null;$("rprev").style.display="none";return}
  try{receiptBlob=await shrink(f,1200,.8);$("rprev").src=URL.createObjectURL(receiptBlob);$("rprev").style.display="block"}
  catch(e){receiptBlob=null;$("rprev").style.display="none";say("pmsg","That file is not a readable image.","err")}
});
async function info(reg,phone){
  const {data,error}=await sb.rpc("get_payment_info",{p_reg_no:reg,p_phone:phone});
  if(error)return String(error.message||"").includes("TOO_MANY_ATTEMPTS")?{locked:true}:null;
  const row=first(data);if(row&&$("keepPay").checked)setStudent(reg,phone);return row;
}
$("pf").addEventListener("submit",async e=>{
  e.preventDefault();
  if($("payBtn").disabled)return;
  const reg=normReg($("payReg").value),ph=$("payPhone").value.trim(),sender=$("paySender").value.trim();
  if(!reg||ph.replace(/\D/g,"").length<10||!sender||!receiptBlob){say("pmsg","Enter your registration or matric number, the WhatsApp number you registered with, the name on the transfer and your receipt screenshot.","err");return}
  lock("payBtn","Submitting, please wait…");
  try{
    const row=await info(reg,ph);
    if(row&&row.locked){say("pmsg",LOCK,"err");return}
    if(!row){say("pmsg","We could not match this matric number and WhatsApp number. Check them, or register first.","err");return}
    if(row.status==="approved"){say("pmsg","Your dues are already confirmed. Get your receipt on the Receipt page.","ok");return}
    if(row.status==="pending"){say("pmsg","Your receipt is already waiting for approval.","ok");return}
    const path=uuid()+".jpg";
    const up=await sb.storage.from("receipts").upload(path,receiptBlob,{contentType:"image/jpeg"});
    if(up.error){up.error.where="upload";throw up.error}
    const ins=await sb.rpc("submit_receipt",{p_reg_no:reg,p_phone:ph,p_sender:sender,p_receipt_path:path});
    if(ins.error||ins.data===false){await sb.storage.from("receipts").remove([path]).catch(()=>{});throw ins.error||{message:"REG_NOT_FOUND"}}
    say("pmsg","Receipt received for "+naira(row.amount_due)+". Executives will approve it after checking the account. Use Check My Status later.","ok");
    $("receipt").value="";receiptBlob=null;$("rprev").style.display="none";
  }catch(err){
    console.error("Receipt error:",err);const m=String(err&&err.message||"");
    say("pmsg",err&&err.where==="upload"?"Could not upload your receipt image. Try a different screenshot. If it keeps failing, tell an executive.":(m.includes("ALREADY_SUBMITTED")||(err&&err.code==="23505"))?"A receipt for this registration or matric number is already waiting or approved.":m.includes("TOO_MANY_ATTEMPTS")?LOCK:m.includes("REG_NOT_FOUND")?"We could not match this matric number and WhatsApp number. Check them, or register first.":busy(m)?"The site is busy. Try again in a few minutes.":"Could not submit your receipt. Check your connection and try again.","err");
  }finally{unlock("payBtn")}
});
$("statusBtn").addEventListener("click",async()=>{
  const reg=normReg($("payReg").value),ph=$("payPhone").value.trim();
  if(!reg||ph.replace(/\D/g,"").length<10){say("pmsg","Enter your registration or matric number and the WhatsApp number you registered with.","err");return}
  const row=await info(reg,ph);
  if(row&&row.locked){say("pmsg",LOCK,"err");return}
  if(!row){say("pmsg","We could not match this matric number and WhatsApp number.","err");return}
  const s=row.status;
  say("pmsg",s==="approved"?"Dues confirmed. Thank you! Get your receipt on the Receipt page.":s==="pending"?"Receipt received. Waiting for approval.":s==="rejected"?"Your receipt was not accepted. Upload a clear receipt again.":"No receipt yet. You owe "+naira(row.amount_due)+".",s==="rejected"?"err":"ok");
});
