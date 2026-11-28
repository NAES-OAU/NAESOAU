
/* Register page — image crop, rotation and browser-side photo validation */
fillDob($("dobMonth"),$("dobDay"));

let selectedPhoto = null;
let selectedPhotoUrl = null;
let photoRotation = 0;
let photoZoom = 1;
let photoX = 0;
let photoY = 0;
let photoValid = false;
let faceDetectorPromise = null;
let cropCanvas = $("cropCanvas");
let cropCtx = cropCanvas.getContext("2d");
let workingImage = null;
let validationRun = 0;

function setPhotoStatus(message, ok=false){
  const el=$("photoCheck");
  if(el){el.textContent=message;el.style.color=ok?"#16733c":"#a33";}
}

function loadFaceDetector(){
  if(faceDetectorPromise)return faceDetectorPromise;
  faceDetectorPromise=(async()=>{
    if(!window.FilesetResolver || !window.FaceDetector){
      throw new Error("The photo-checking service did not load. Refresh the page and try again.");
    }
    const vision=await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    return FaceDetector.createFromOptions(vision,{
      baseOptions:{
        modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
      },
      runningMode:"IMAGE",
      minDetectionConfidence:0.55
    });
  })();
  return faceDetectorPromise;
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

function blurScore(canvas){
  const c=canvas.getContext("2d",{willReadFrequently:true});
  const {data,width,height}=c.getImageData(0,0,canvas.width,canvas.height);
  const gray=new Float32Array(width*height);
  for(let i=0,p=0;i<data.length;i+=4,p++){
    gray[p]=0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];
  }
  let sum=0,sum2=0,n=0;
  for(let y=1;y<height-1;y+=2){
    for(let x=1;x<width-1;x+=2){
      const p=y*width+x;
      const lap=gray[p-1]+gray[p+1]+gray[p-width]+gray[p+width]-4*gray[p];
      sum+=lap;sum2+=lap*lap;n++;
    }
  }
  return n?sum2/n-(sum/n)**2:0;
}

async function validatePhoto(){
  const run=++validationRun;
  photoValid=false;
  photoBlob=null;photoThumb=null;
  $("prev").style.display="none";
  drawCrop();
  setPhotoStatus("Checking image quality and number of faces…");
  try{
    const {w,h}=rotatedDimensions();
    if(Math.min(w,h)<300){
      setPhotoStatus("This image is too small. Please choose a photo at least 300 × 300 pixels.");
      return;
    }
    const detector=await loadFaceDetector();
    const result=detector.detect(cropCanvas);
    if(run!==validationRun)return;
    const faces=result.detections||[];
    if(faces.length!==1){
      setPhotoStatus(faces.length===0
        ?"No face was detected. Choose a clear photo with your face visible."
        :"More than one face was detected. Choose a photo showing only you.");
      return;
    }
    const sharpness=blurScore(cropCanvas);
    if(sharpness<18){
      setPhotoStatus("This photo appears too blurry. Choose a sharper, well-lit image.");
      return;
    }
    const blob=await cropToBlob();
    if(run!==validationRun)return;
    photoBlob=await shrink(blob,480,.88);
    photoThumb=await blobToUrl(await shrink(blob,240,.8));
    $("prev").src=URL.createObjectURL(photoBlob);
    $("prev").style.display="block";
    photoValid=true;
    setPhotoStatus("Photo accepted: one face detected and basic image checks passed.",true);
  }catch(err){
    console.error("Photo validation:",err);
    setPhotoStatus(err.message||"Could not check this photo. Refresh and try again.");
  }
}

async function loadSelectedPhoto(file){
  validationRun++;
  photoValid=false;photoBlob=null;photoThumb=null;workingImage=null;
  $("prev").style.display="none";
  if(selectedPhotoUrl)URL.revokeObjectURL(selectedPhotoUrl);
  selectedPhoto=file;
  if(!file){$("photoEditor").hidden=true;return}
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
    setPhotoStatus("Use a JPG, PNG or WebP image.");
    $("photoEditor").hidden=false;
    return;
  }
  if(file.size>8*1024*1024){
    setPhotoStatus("This image is larger than 8 MB. Choose a smaller image.");
    $("photoEditor").hidden=false;
    return;
  }
  selectedPhotoUrl=URL.createObjectURL(file);
  const img=new Image();
  img.onload=async()=>{
    workingImage=img;
    photoRotation=0;photoZoom=1;photoX=0;photoY=0;
    $("photoZoom").value="1";$("photoX").value="0";$("photoY").value="0";
    $("photoEditor").hidden=false;
    drawCrop();
    await validatePhoto();
  };
  img.onerror=()=>setPhotoStatus("That file is not a readable image.");
  img.src=selectedPhotoUrl;
}

$("photo").addEventListener("change",function(){
  loadSelectedPhoto(this.files&&this.files[0]);
});
$("rotatePhoto").addEventListener("click",()=>{
  if(!workingImage)return;
  photoRotation=(photoRotation+90)%360;
  validatePhoto();
});
$("resetPhoto").addEventListener("click",()=>{
  if(!workingImage)return;
  photoRotation=0;photoZoom=1;photoX=0;photoY=0;
  $("photoZoom").value="1";$("photoX").value="0";$("photoY").value="0";
  validatePhoto();
});
["photoZoom","photoX","photoY"].forEach(id=>{
  $(id).addEventListener("input",()=>{
    photoZoom=+$("photoZoom").value;
    photoX=+$("photoX").value;
    photoY=+$("photoY").value;
    drawCrop();
    photoValid=false;photoBlob=null;photoThumb=null;
    $("prev").style.display="none";
    setPhotoStatus("Crop adjusted. Rechecking photograph…");
    clearTimeout(window.__naesoPhotoCheck);
    window.__naesoPhotoCheck=setTimeout(validatePhoto,350);
  });
});

/* Registration submission */
$("f").addEventListener("submit",async e=>{
  e.preventDefault();
  if($("submit").disabled)return;
  if($("rWeb").value){say("msg","Registration received. Thank you.","ok");return}
  const v={full_name:$("fullName").value.trim(),reg_no:normReg($("reg").value),dob_month:+$("dobMonth").value,dob_day:+$("dobDay").value,phone:$("phone").value.trim(),email:$("email").value.trim(),level:$("level").value};
  if(!v.full_name||!v.reg_no||!v.dob_month||!v.dob_day||!v.phone||!/^\S+@\S+\.\S+$/.test(v.email)||!selectedPhoto){
    say("msg","Fill in every field, add your photograph and use a valid email.","err");return;
  }
  if(!photoValid||!photoBlob||!photoThumb){
    say("msg","Your photograph has not passed the checks yet. Please choose or adjust a suitable photo.","err");return;
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
    $("f").reset();photoBlob=null;photoThumb=null;selectedPhoto=null;photoValid=false;$("photoEditor").hidden=true;$("prev").style.display="none";
    setTimeout(()=>{location.href="pay.html"},1500);
  }catch(err){
    console.error("Registration error:",err);say("msg",err.code==="23505"?"This registration or matric number is already registered.":err.where==="upload"?"Could not upload your image. Try a different photo. If it keeps failing, tell an executive.":busy(err&&err.message)?"The site is busy. Try again in a few minutes.":"Could not save your registration. Check your connection and try again.","err");
  }
  if(!done)unlock("submit");
});
