const SUPABASE_URL="https://aecgqcgprmyohdikiduf.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_n2x1oa3eVJHhxQ__Gc4Ybg_e0ifpPcR";
const BANK_NAME="First Bank Nigeria Limited";
const ACCOUNT_NAME="National Association of Entrepreneurship Students";
const ACCOUNT_NUMBER="2046465467";
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=i=>document.getElementById(i);
const MON=["January","February","March","April","May","June","July","August","September","October","November","December"];
const REGEX=/^(?:[A-Z]{3}\/\d{4}\/\d{3,4}|\d{8,12}[A-Z]{1,2})$/;
const REGMSG="Use your matric number like ERT/2022/041, or your JAMB registration number (8 to 12 digits followed by letters).";
function normReg(s){
  const t=String(s||"").toUpperCase().trim().replace(/\s*[\/\\]\s*/g,"/");
  const m=t.match(/^([A-Z]{3})[\s\/-]+(\d{4})[\s\/-]+(\d{3,4})$/);
  return m?m[1]+"/"+m[2]+"/"+m[3]:t.replace(/\s+/g,"");
}
let photoBlob=null,photoThumb=null,receiptBlob=null,receiptReg="";
let regs=[],allPays=[],pays={},fbList=[],pu={},ru={},session="",editing=null;
const say=(id,t,c)=>{const m=$(id);m.textContent=t;m.className="msg "+c};
const bday=r=>MON[r.dob_month-1]?r.dob_day+" "+MON[r.dob_month-1]:"";
const naira=n=>"₦"+Number(n).toLocaleString("en-NG");
const first=d=>Array.isArray(d)?d[0]:d;
const LABEL={approved:"Paid",pending:"Pending",rejected:"Rejected"};
const recNo=p=>"NAES-"+p.id.slice(0,8).toUpperCase();
const fmtDate=s=>s?new Date(s).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"";
const busy=m=>String(m||"").includes("TOO_MANY_REQUESTS");
const uuid=()=>crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]&15;return(c==="x"?r:(r&3|8)).toString(16)});
const DIM=[31,29,31,30,31,30,31,31,30,31,30,31];
const okDob=(m,d)=>m>=1&&m<=12&&d>=1&&d<=DIM[m-1];
const LOCK="Too many wrong attempts for this matric number. Please wait 15 minutes and try again.";
function fillDob(m,d){m.add(new Option("Month",""));MON.forEach((n,i)=>m.add(new Option(n,i+1)));d.add(new Option("Day",""));for(let i=1;i<=31;i++)d.add(new Option(i,i))}
const blobToUrl=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b)});
function shrink(file,max,q){
  return new Promise((res,rej)=>{
    const img=new Image(),u=URL.createObjectURL(file);
    img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");
      c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      c.toBlob(b=>{URL.revokeObjectURL(u);b?res(b):rej()},"image/jpeg",q)};
    img.onerror=()=>{URL.revokeObjectURL(u);rej()};
    img.src=u;
  });
}
