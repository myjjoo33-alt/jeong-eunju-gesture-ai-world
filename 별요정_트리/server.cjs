'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const open=process.argv.includes('--open');
const port=8765,url=`http://127.0.0.1:${port}`;
const routes=new Map([
 ['/', ['index.html','text/html; charset=utf-8']],
 ['/index.html', ['index.html','text/html; charset=utf-8']],
 ['/tree-lit.png', ['눈 내리는 숲속의 빛나는 크리스마스트리 (1).png','image/png']],
 ['/눈 내리는 숲속의 빛나는 크리스마스트리 (1).png', ['눈 내리는 숲속의 빛나는 크리스마스트리 (1).png','image/png']],
 ['/tree-unlit.png', ['tree-unlit.png','image/png']],
 ['/fairy-cursor.png', ['fairy-cursor.png','image/png']]
]);
const server=http.createServer((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end();return;}
 if(pathname==='/__tree-health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify({app:'christmas-tree-local'}));return;}
 const route=routes.get(pathname);
 if(!route){res.writeHead(404);res.end();return;}
 fs.readFile(path.join(__dirname,route[0]),(error,data)=>{
  if(error){res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end('파일을 불러오지 못했습니다.');return;}
  res.writeHead(200,{'Content-Type':route[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:data);
 });
});
function openChrome(){
 const candidates=[path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Google/Chrome/Application/chrome.exe'),path.join(process.env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe')];
 const chrome=candidates.find(file=>fs.existsSync(file));
 if(!chrome){console.error('Chrome not found. Open '+url+' in Chrome.');return;}
 const child=spawn(chrome,[url],{detached:true,stdio:'ignore',windowsHide:true});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});child.unref();
}
server.on('error',async error=>{
 if(error.code==='EADDRINUSE'&&open){
  try{
   const response=await fetch(url+'/__tree-health',{signal:AbortSignal.timeout(2500)});
   if(response.ok&&(await response.json()).app==='christmas-tree-local'){console.log('Using the running Christmas tree server.');openChrome();return;}
  }catch{}
 }
 console.error(error.code==='EADDRINUSE'?'Port 8765 is busy.':'Server error: '+error.message);process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{
 console.log(`Christmas tree: ${url}`);
 console.log('Keep this window open. Close it to stop the local server.');
 if(open)openChrome();
});
