const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');

const app = new CPKoa();

app.use(function*(ctx, next){
  console.log(`First middleware [${ctx.url}]`);
  this.innerWeight(2);
  yield CPromise.delay(2000);
  ctx.body= `Hello! [${yield next()}]`
}).use(function*(){
  console.log(`Second middleware`);
  yield CPromise.delay(5000);
  return new Date().toLocaleTimeString();
}).on('progress', (ctx, score)=>{
  console.log(`Progress: ${(score*100).toFixed(1)}%`)
}).listen(3000);

setTimeout(()=>{
  app.close();
}, 5000);
