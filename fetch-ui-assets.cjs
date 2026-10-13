const https=require('node:https'),fs=require('node:fs');
const files={
  'assets/zxing-browser.min.js':'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js',
  'assets/zxing-browser-LICENSE':'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/LICENSE',
  'assets/zxing-library-LICENSE':'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/LICENSE'
};
Promise.all(Object.entries(files).map(([path,url])=>new Promise((resolve,reject)=>{
  if(fs.existsSync(path))return resolve();
  https.get(url,res=>{
    if(res.statusCode!==200){res.resume();return reject(Error(path+': '+res.statusCode));}
    const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{
      const bytes=Buffer.concat(chunks);fs.writeFileSync(path,bytes);console.log(path+' '+bytes.length);resolve();
    });res.on('error',reject);
  }).on('error',reject);
}))).catch(e=>{console.error(e);process.exitCode=1;});
