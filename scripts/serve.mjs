import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const port=Number(process.env.PORT)||5173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname);
    if(pathname.includes('\\')||pathname.split('/').includes('..')){res.writeHead(403);res.end();return;}
    let file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep) && file!==root){res.writeHead(403);res.end();return;}
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    if(file.includes(`${path.sep}rayfin${path.sep}`)||file.includes(`${path.sep}tests${path.sep}`)||file.includes(`${path.sep}scripts${path.sep}`)||file.includes(`${path.sep}node_modules${path.sep}`)||file.includes(`${path.sep}.git${path.sep}`)){res.writeHead(403);res.end();return;}
    const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'0.0.0.0',()=>console.log(`Fabric Chess Arena local preview: http://localhost:${port}`));
