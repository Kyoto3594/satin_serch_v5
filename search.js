export async function onRequestPost({request}) {
  const ct=request.headers.get('content-type')||'';
  if(!ct.includes('multipart/form-data')) return json({error:'画像ファイルを送信してください'},400);
  const form=await request.formData(); const image=form.get('image');
  if(!image || typeof image.arrayBuffer!=='function') return json({error:'画像がありません'},400);
  const buf=await image.arrayBuffer();
  if(buf.byteLength>5*1024*1024) return json({error:'画像は5MB以下にしてください'},400);
  // Google Lens web upload endpoint. This is intentionally server-side so the browser does not need CORS access to Lens.
  const lens=new FormData(); lens.append('encoded_image',new Blob([buf],{type:image.type||'image/jpeg'}),image.name||'image.jpg');
  lens.append('processed_image_dimensions','1500,1500');
  const u='https://lens.google.com/v3/upload?ep=ccm&s='+Date.now();
  const lr=await fetch(u,{method:'POST',body:lens,redirect:'manual'});
  let html='';
  if(lr.status>=300 && lr.status<400){const loc=lr.headers.get('location'); if(loc){const rr=await fetch(new URL(loc,u),{redirect:'follow'});html=await rr.text();}}
  else html=await lr.text();
  if(!html) return json({error:'画像検索サービスから結果を取得できませんでした'},502);
  const results=parseResults(html);
  return json({results:rank(results)});
}
function decode(s){return s.replace(/\\u003c/g,'<').replace(/\\u003e/g,'>').replace(/\\u0026/g,'&').replace(/\\"/g,'"').replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
function strip(s){return decode(s.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim());}
function parseResults(h){const out=[];const seen=new Set();
  // Extract ordinary absolute URLs and nearby text. Lens HTML changes periodically, so several patterns are used.
  const re=/(https?:\\/\\/(?:www\\.)?[^"'<>\\s]{5,})/g; let m;
  while((m=re.exec(h))!==null){let url=m[1].replace(/\\\\u0026/g,'&').replace(/\\\\u003d/g,'=');if(/google\.com|gstatic\.com|googleusercontent\.com|lens\.google\.com/i.test(url))continue;try{url=new URL(url).href}catch{continue}if(seen.has(url))continue;seen.add(url);let a=Math.max(0,m.index-700),b=Math.min(h.length,m.index+900);let ctx=strip(h.slice(a,b));if(ctx.length>500)ctx=ctx.slice(0,500);out.push({url,title:guessTitle(ctx,url),snippet:ctx});if(out.length>=80)break}
  return out;
}
function guessTitle(ctx,url){const parts=ctx.split(/\s+/).filter(Boolean);let best=parts.slice(0,25).join(' ');try{return best||new URL(url).hostname}catch{return url}}
function rank(rs){const terms=[['サテン',10],['サテンブラウス',30],['ブラウス',20],['シャツ',8],['着衣',15],['動画',10],['作品',12],['作品名',15],['AV',8],['動画作品',12]];return rs.map(x=>{const s=(x.title+' '+x.snippet+' '+x.url).toLowerCase();let score=0,tags=[];for(const [t,w] of terms)if(s.includes(t.toLowerCase())){score+=w;tags.push(t)}if(/fanza|dmm\.co\.jp/i.test(s))score+=3;if(/jav|av|video/i.test(s))score+=2;return {...x,score,tags:[...new Set(tags)]}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,30)}
function json(x,status=200){return new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json;charset=utf-8'}})}
