
/* Register page — image crop, zoom and rotation (no face or quality validation) */
fillDob($("dobMonth"),$("dobDay"));

/* Format the applicant name: surname in BLOCK CAPITALS, other names in Title Case. */
function formatApplicantName(value, keepTrailingSpace=false){
  const hasTrailingSpace=keepTrailingSpace && /\s$/.test(value);
  const words=value.trim().split(/\s+/).filter(Boolean);
  const formatted=words.map((word,index)=>{
    const lower=word.toLocaleLowerCase();
    if(index===0)return lower.toLocaleUpperCase();
    return lower.charAt(0).toLocaleUpperCase()+lower.slice(1);
  }).join(" ");
  return formatted+(hasTrailingSpace && formatted ? " " : "");
}

const fullNameInput=$("fullName");
if(fullNameInput){
  fullNameInput.placeholder="SURNAME Firstname Othername";
  fullNameInput.setAttribute("aria-label","Surname first, then other names");
  const nameLabel=fullNameInput.closest("label");
  if(nameLabel){
    for(const node of nameLabel.childNodes){
      if(node.nodeType===3 && node.textContent.trim()){
        node.textContent="Surname first, then other names ";
        break;
      }
    }
  }
  fullNameInput.addEventListener("input",function(){
    const start=this.selectionStart;
    const end=this.selectionEnd;
    const formatted=formatApplicantName(this.value,true);
    if(this.value!==formatted){
      this.value=formatted;
      this.setSelectionRange(Math.min(start,formatted.length),Math.min(end,formatted.length));
    }
  });
  fullNameInput.addEventListener("blur",function(){
    this.value=formatApplicantName(this.value);
  });
}

let selectedPhoto = null;
let selectedPhotoUrl = null;
let previewPhotoUrl = null;
let photoRotation = 0;
let photoZoom = 1;
let photoX = 0;
let photoY = 0;
let cropCanvas = $("cropCanvas");
let cropCtx = cropCanvas.getContext("2d");
let workingImage = null;
let photoEditRun = 0;

function setPhotoStatus(message){
  const el=$("photoCheck");
  if(el)el.textContent=message;
}

function rotatedDimensions(){
  const swap=(photoRotation%180)!==0;
  return swap?{w:workingImage.naturalHeight,h:workingImage.naturalWidth}
             :{w:workingImage.naturalWidth,h:workingImage.naturalHeight};
}

function drawCrop(){
  if(!workingImage)return;
  const {w,h}=rotatedDimensions();
  const temp=document.createElement("canvas");
  temp.width=w;temp.height=h;
  const t=temp.getContext("2d");
  t.translate(w/2,h/2);
  t.rotate(photoRotation*Math.PI/180);
  t.drawImage(workingImage,-workingImage.naturalWidth/2,-workingImage.naturalHeight/2);

  const side=Math.min(w,h)/photoZoom;
  const maxX=(w-side)/2, maxY=(h-side)/2;
  const sx=(w-side)/2+photoX*maxX;
  const sy=(h-side)/2+photoY*maxY;
  cropCtx.clearRect(0,0,320,320);
  cropCtx.drawImage(temp,sx,sy,side,side,0,0,320,320);
}

function cropToBlob(){
  return new Promise((resolve,reject)=>{
    const out=document.createElement("canvas");
    out.width=480;out.height=480;
    const ctx=out.getContext("2d");
    ctx.drawImage(cropCanvas,0,0,480,480);
    out.toBlob(b=>b?resolve(b):reject(new Error("Could not prepare this photograph.")),"image/jpeg",0.88);
  });
}

async function updateCroppedPhoto(){
  const run=++photoEditRun;
  if(!workingImage)return;
  try{
    drawCrop();
    const blob=await cropToBlob();
    if(run!==photoEditRun)return;
    photoBlob=await shrink(blob,480,.88);
    photoThumb=await blobToUrl(await shrink(blob,240,.8));
    if(previewPhotoUrl)URL.revokeObjectURL(previewPhotoUrl);
    previewPhotoUrl=URL.createObjectURL(photoBlob);
    $("prev").src=previewPhotoUrl;
    $("prev").style.display="block";
    setPhotoStatus("Photograph ready. Adjust it above if needed.");
  }catch(err){
    console.error("Photo preparation:",err);
    setPhotoStatus("Could not prepare this image. Please choose another photograph.");
  }
}

function loadSelectedPhoto(file){
  photoEditRun++;
  photoBlob=null;photoThumb=null;workingImage=null;
  $("prev").style.display="none";
  if(previewPhotoUrl){URL.revokeObjectURL(previewPhotoUrl);previewPhotoUrl=null;}
  if(selectedPhotoUrl){URL.revokeObjectURL(selectedPhotoUrl);selectedPhotoUrl=null;}
  selectedPhoto=file||null;
  if(!file){$("photoEditor").hidden=true;return;}
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
    setPhotoStatus("Please choose a JPG, PNG or WebP image.");
    $("photoEditor").hidden=false;
    return;
  }
  if(file.size>8*1024*1024){
    setPhotoStatus("This image is larger than 8 MB. Please choose a smaller image.");
    $("photoEditor").hidden=false;
    return;
  }
  selectedPhotoUrl=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{
    workingImage=img;
    photoRotation=0;photoZoom=1;photoX=0;photoY=0;
    $("photoZoom").value="1";$("photoX").value="0";$("photoY").value="0";
    $("photoEditor").hidden=false;
    updateCroppedPhoto();
  };
  img.onerror=()=>setPhotoStatus("That file could not be opened. Please choose another image.");
  img.src=selectedPhotoUrl;
}

$("photo").addEventListener("change",function(){
  loadSelectedPhoto(this.files&&this.files[0]);
});
$("rotatePhoto").addEventListener("click",()=>{
  if(!workingImage)return;
  photoRotation=(photoRotation+90)%360;
  updateCroppedPhoto();
});
$("resetPhoto").addEventListener("click",()=>{
  if(!workingImage)return;
  photoRotation=0;photoZoom=1;photoX=0;photoY=0;
  $("photoZoom").value="1";$("photoX").value="0";$("photoY").value="0";
  updateCroppedPhoto();
});
["photoZoom","photoX","photoY"].forEach(id=>{
  $(id).addEventListener("input",()=>{
    photoZoom=+$("photoZoom").value;
    photoX=+$("photoX").value;
    photoY=+$("photoY").value;
    updateCroppedPhoto();
  });
});

$("f").addEventListener("submit",async e=>{
  e.preventDefault();
  if($("submit").disabled)return;
  if($("rWeb").value){say("msg","Registration received. Thank you.","ok");return}
  const v={full_name:formatApplicantName($("fullName").value),reg_no:normReg($("reg").value),dob_month:+$("dobMonth").value,dob_day:+$("dobDay").value,phone:$("phone").value.trim(),email:$("email").value.trim(),level:$("level").value};
  if(!v.full_name||!v.reg_no||!v.dob_month||!v.dob_day||!v.phone||!/^\S+@\S+\.\S+$/.test(v.email)||!selectedPhoto||!photoBlob||!photoThumb){
    say("msg","Fill in every field, add your photograph and use a valid email.","err");return;
  }
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
    $("f").reset();photoBlob=null;photoThumb=null;selectedPhoto=null;workingImage=null;photoEditRun++;$("photoEditor").hidden=true;$("prev").style.display="none";
    if(selectedPhotoUrl){URL.revokeObjectURL(selectedPhotoUrl);selectedPhotoUrl=null;}
    if(previewPhotoUrl){URL.revokeObjectURL(previewPhotoUrl);previewPhotoUrl=null;}
    setTimeout(()=>{location.href="pay.html"},1500);
  }catch(err){
    console.error("Registration error:",err);say("msg",err.code==="23505"?"This registration or matric number is already registered.":err.where==="upload"?"Could not upload your image. Try a different photo. If it keeps failing, tell an executive.":busy(err&&err.message)?"The site is busy. Try again in a few minutes.":"Could not save your registration. Check your connection and try again.","err");
  }
  if(!done)unlock("submit");
});
