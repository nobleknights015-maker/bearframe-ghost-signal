// Offline local web server for the Bearframe Sprite Studio. No npm install.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, 'frontend', 'public');
if (!fs.existsSync(path.join(root, 'studio', 'index.html'))) {
  console.error('Studio files missing. Unzip the entire package first.'); process.exit(1);
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  const rel=pathname.replace(/^\/+/, '');
  let file=path.resolve(root,rel);
  if(file!==root && !file.startsWith(root+path.sep)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  try {
    if(fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
    res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end('File not found'); }
}).listen(0,'127.0.0.1',function() {
  const url='http://127.0.0.1:'+this.address().port+'/studio/';
  console.log('Bearframe Character Generator: '+url);
  const args=process.platform==='win32'?['/c','start','',url]:
     process.platform==='darwin'?[url]:['--',url];
  const cmd=process.platform==='win32'?'cmd':
     process.platform==='darwin'?'open':'xdg-open';
  try { const child=spawn(cmd,args,{detached:true,stdio:'ignore'});child.unref(); }
  catch { console.log('Open the address in a browser manually.'); }
});
