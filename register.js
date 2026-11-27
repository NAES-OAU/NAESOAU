/* Register page */
fillDob($("dobMonth"),$("dobDay"));
$("photo").addEventListener("change",async function(){
  const f=this.files[0];if(!f)return;
  try{photoBlob=await shrink(f,480,.85);photoThumb=await blobToUrl(await shrink(f,240,.8));$("prev").src=URL.createObjectURL(photoBlob);$("prev").style.display="block"}
  catch(e){say("msg","That file is not a readable image.","err")}
});
$("f").addEventListener("submit",async e=>{
  e.preventDefault();
  if($("submit").disabled)return;
  if($("rWeb").value){say("msg","Registration received. Thank you.","ok");return}
  const v={full_name:$("fullName").value.trim(),reg_no:normReg($("reg").value),dob_month:+$("dobMonth").value,dob_day:+$("dobDay").value,phone:$("phone").value.trim(),email:$("email").value.trim(),level:$("level").value};
  if(!v.full_name||!v.reg_no||!v.dob_month||!v.dob_day||!v.phone||!/^\S+@\S+\.\S+$/.test(v.email)||!photoBlob){say("msg","Fill in every field, add your image and use a valid email.","err");return}
  if(v.phone.replace(/\D/g,"").length<10){say("msg","Enter a valid WhatsApp number with at least 10 digits. You will need it to get your receipt.","err");return}
  if(!okDob(v.dob_month,v.dob_day)){say("msg","That birthday does not exist. Check the month and day.","err");return}
  if(!REGEX.test(v.reg_no)){say("msg","Check your registration or matric number. "+REGMSG,"err");return}
  if(!$("consent").checked){say("msg","Tick the box to agree to the Privacy Notice.","err");return}
  let done=false;
  lock("submit","Uploading, please wait…");
  try{
    const path=uuid()+".jpg";
    const up=await sb.storage.from("photos").upload(path,photoBlob,{contentType:"image/jpeg"});
    if(up.error){up.error.where="upload";throw up.error}
    v.photo_path=path;v.photo_data=photoThumb;
    const ins=await sb.from("registrations").insert(v);
    if(ins.error){await sb.storage.from("photos").remove([path]).catch(()=>{});throw ins.error}
    done=true;$("submit").textContent="Done. Taking you to payment…";
    say("msg","Registration received. Welcome to NAESOAU, "+v.full_name.split(" ")[0]+"! Taking you to the payment page...","ok");
    try{sessionStorage.setItem("naes_reg",v.reg_no);sessionStorage.setItem("naes_phone",v.phone);sessionStorage.setItem("naes_keep",$("keep").checked?"1":"0")}catch(e){}if($("keep").checked)setStudent(v.reg_no,v.phone);
    $("f").reset();photoBlob=null;photoThumb=null;$("prev").style.display="none";
    setTimeout(()=>{location.href="pay.html"},1500);
  }catch(err){
    console.error("Registration error:",err);say("msg",err.code==="23505"?"This registration or matric number is already registered.":err.where==="upload"?"Could not upload your image. Try a different photo. If it keeps failing, tell an executive.":busy(err&&err.message)?"The site is busy. Try again in a few minutes.":"Could not save your registration. Check your connection and try again.","err");
  }
  if(!done)unlock("submit");
});
