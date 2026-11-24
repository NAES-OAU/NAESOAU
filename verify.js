/* Verify receipt page */
function showDetails(d){
  const box=$("vres");box.textContent="";
  [["Receipt No.","NAES-"+d.receipt_no],["Name",d.full_name],["Reg/Matric No.",d.reg_no],["Level",d.level],["Amount Paid",naira(d.amount_due)],["Session",d.session],["Payment Method",d.method==="cash"?"Cash":"Bank Transfer"]].forEach(r=>{
    const row=document.createElement("div");row.style.cssText="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line)";
    const a=document.createElement("span");a.textContent=r[0];a.style.color="var(--muted)";
    const b=document.createElement("b");b.textContent=r[1]||"";b.style.textAlign="right";
    row.append(a,b);box.appendChild(row);
  });
  box.style.display="block";
}
async function check(raw){
  const code=String(raw||"").trim();
  $("vres").style.display="none";
  if(!code){say("vmsg","Enter the receipt number printed on the receipt.","err");return}
  lock("vBtn","Checking…");
  const {data,error}=await sb.rpc("verify_receipt",{p_code:code});
  unlock("vBtn");
  if(error){say("vmsg",busy(error.message)?"Too many checks. Wait a moment and try again.":"Could not check right now. Please try again.","err");return}
  const d=first(data);
  if(!d){say("vmsg","NOT GENUINE. NAESOAU has no confirmed payment with this receipt number. Do not accept this receipt.","err");return}
  showDetails(d);
  say("vmsg","Receipt number found. Now compare the details below with the receipt you were shown. If the name, amount or any other detail is different, reject it.","ok");
}
$("vf").addEventListener("submit",e=>{e.preventDefault();check($("vNo").value)});
{const r=new URLSearchParams(location.search).get("r");if(r){$("vNo").value=r;check(r)}}
