/* Receipt page */
const loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
const FONT=(w,s)=>w+" "+s+"px 'Bricolage Grotesque',system-ui,-apple-system,'Segoe UI',sans-serif";
function fit(x,t,maxW,start,w){let s=start;x.font=FONT(w,s);while(x.measureText(t).width>maxW&&s>18){s-=2;x.font=FONT(w,s)}}
async function drawReceipt(d){
  const c=$("rcv"),x=c.getContext("2d"),W=1000,H=1600;
  const NAVY="#2a1a77",GOLD="#b88a1e",INK="#1e1458",MUTED="#6a6590",LINE="#ddd6c4";
  try{await document.fonts.ready}catch(e){}
  x.fillStyle="#fff";x.fillRect(0,0,W,H);
  x.fillStyle=NAVY;x.fillRect(0,0,W,230);
  x.fillStyle=GOLD;x.fillRect(0,230,W,8);
  try{const lg=await loadImg("logo.png");x.save();x.beginPath();x.arc(120,115,75,0,Math.PI*2);x.clip();x.drawImage(lg,45,40,150,150);x.restore()}catch(e){}
  x.fillStyle="#fff";x.font=FONT("800",56);x.fillText("NAESOAU",230,115);
  x.fillStyle="#e3b94f";x.font=FONT("600",24);x.fillText("National Association of Entrepreneurship Students, OAU",230,160);
  x.fillStyle=INK;x.font=FONT("800",58);x.fillText("Payment Receipt",80,330);
  x.fillStyle=MUTED;x.font=FONT("600",26);x.fillText("Evidence of dues payment",80,372);
  x.save();x.beginPath();if(x.roundRect)x.roundRect(80,410,260,260,24);else x.rect(80,410,260,260);x.clip();
  let drawn=false;
  if(d.photo_data){try{const im=await loadImg(d.photo_data),k=Math.max(260/im.width,260/im.height),w=im.width*k,h2=im.height*k;x.drawImage(im,80+(260-w)/2,410+(260-h2)/2,w,h2);drawn=true}catch(e){}}
  if(!drawn){x.fillStyle="#efeae0";x.fillRect(80,410,260,260);x.fillStyle=MUTED;x.font=FONT("600",24);x.fillText("No image",150,548)}
  x.restore();
  x.strokeStyle=GOLD;x.lineWidth=6;x.beginPath();if(x.roundRect)x.roundRect(80,410,260,260,24);else x.rect(80,410,260,260);x.stroke();
  [["Name",d.full_name],["Reg/Matric Number",d.reg_no],["Level",d.level]].forEach((r,i)=>{const y=440+i*100;x.fillStyle=MUTED;x.font=FONT("600",24);x.fillText(r[0],390,y);x.fillStyle=INK;fit(x,r[1]||"",540,40,"800");x.fillText(r[1]||"",390,y+46)});
  x.fillStyle="#f6f3ec";x.strokeStyle=LINE;x.lineWidth=2;x.beginPath();if(x.roundRect)x.roundRect(80,730,840,230,24);else x.rect(80,730,840,230);x.fill();x.stroke();
  x.fillStyle=MUTED;x.font=FONT("600",28);x.fillText("Amount Paid",120,790);
  x.fillStyle=NAVY;x.font=FONT("800",96);x.fillText("₦"+Number(d.amount_due).toLocaleString("en-NG"),120,890);
  x.fillStyle=MUTED;x.font=FONT("600",26);x.fillText("Association dues",120,938);
  x.save();x.translate(740,850);x.rotate(-0.2);x.strokeStyle=GOLD;x.lineWidth=8;x.beginPath();if(x.roundRect)x.roundRect(-110,-52,220,104,16);else x.rect(-110,-52,220,104);x.stroke();
  x.fillStyle=GOLD;x.font=FONT("800",72);x.textAlign="center";x.fillText("PAID",0,25);x.restore();x.textAlign="left";
  const lab=(t,px,py)=>{x.fillStyle=MUTED;x.font=FONT("600",24);x.fillText(t,px,py)};
  const val=(t,px,py,mw,s)=>{x.fillStyle=INK;fit(x,t,mw,s||36,"800");x.fillText(t,px,py)};
  lab("Payment Date",80,1040);val(fmtDate(d.paid_at),80,1086,400);
  lab("Receipt No.",540,1040);val("NAES-"+d.receipt_no,540,1086,380);
  lab("Session",80,1150);val(d.session||"",80,1196,400);
  lab("Payment Method",540,1150);val(d.method==="cash"?"Cash":"Bank Transfer",540,1196,380);
  lab("Paid To",80,1260);val("National Association of Entrepreneurship Students",80,1306,840,34);
  lab("Status",80,1370);val("Confirmed by NAESOAU Executives",80,1416,840,34);
  x.strokeStyle=LINE;x.lineWidth=2;x.beginPath();x.moveTo(80,1470);x.lineTo(920,1470);x.stroke();
  x.fillStyle=MUTED;x.font=FONT("400",22);
  x.fillText("This receipt is valid only for the person shown above.",80,1508);
  x.fillText("Present it together with your student ID card.",80,1540);
  x.fillStyle=GOLD;x.fillRect(0,1586,W,14);
}
$("rf").addEventListener("submit",async e=>{
  e.preventDefault();
  const reg=$("rcReg").value.trim().toUpperCase(),ph=$("rcPhone").value.trim();
  if(!reg||ph.replace(/\D/g,"").length<10){say("rmsg","Enter your registration or matric number and the WhatsApp number you registered with.","err");return}
  $("rcBtn").disabled=true;$("rcv").style.display="none";$("rcDl").style.display="none";
  const {data,error}=await sb.rpc("get_receipt",{p_reg_no:reg,p_phone:ph});
  const d=first(data);
  if(error&&String(error.message||"").includes("TOO_MANY_ATTEMPTS")){say("rmsg",LOCK,"err");$("rcBtn").disabled=false;return}
  if(error||!d){say("rmsg","No confirmed payment found for these details. Check them, or wait until the executives approve your receipt.","err");$("rcBtn").disabled=false;return}
  await drawReceipt(d);receiptReg=reg;
  $("rcv").style.display="block";$("rcDl").style.display="block";
  say("rmsg","Payment confirmed. Download your receipt below.","ok");
  $("rcBtn").disabled=false;
});
$("rcDl").addEventListener("click",()=>{
  $("rcv").toBlob(b=>{const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="NAESOAU-Receipt-"+receiptReg.replace(/[^A-Z0-9]/gi,"-")+".png";a.click()},"image/png");
});
