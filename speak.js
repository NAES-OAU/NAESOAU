/* Speak Up page */
$("sf").addEventListener("submit",async e=>{
  e.preventDefault();
  if($("sBtn").disabled)return;
  if($("sWeb").value){say("smsg","Sent. Thank you.","ok");return}
  const msg=$("sMsg").value.trim();
  if(msg.length<10){say("smsg","Write at least 10 characters.","err");return}
  try{const last=+localStorage.getItem("naes_fb")||0;if(Date.now()-last<60000){say("smsg","Please wait a minute before sending another message.","err");return}}catch(err){}
  lock("sBtn","Sending…");
  const {error}=await sb.from("feedback").insert({category:$("sCat").value,message:msg,contact:$("sContact").value.trim()||null});
  if(error){say("smsg",busy(error.message)?"The site is busy. Try again in a few minutes.":"Could not send your message. Check your connection and try again.","err")}
  else{say("smsg","Sent. The executives will see your message without your name.","ok");$("sf").reset();try{localStorage.setItem("naes_fb",String(Date.now()))}catch(err){}}
  unlock("sBtn");
});
