const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');

const app = new CPKoa();

app.use(function*(ctx, next){
  console.log(`First middleware [${ctx.url}]`);
  this.innerWeight(4);
  yield CPromise.delay(100);
  console.log('stage 1');
  yield CPromise.delay(1000);
  console.log('stage 2');
  yield CPromise.delay(1000);
  console.log('stage 3');
  ctx.body= `Hello! [${yield next()}]`
}).use(function*(ctx, next){
  console.log(`Second middleware`);
  this.innerWeight(4);
  this.atomic();// The request promise chain can not be interrupted while this sub-chain is not completed.
  yield CPromise.delay(100);
  console.log('stage 4');
  yield CPromise.delay(1000);
  console.log('stage 5');
  yield CPromise.delay(1000);
  console.log('stage 6');
  return new Date().toLocaleTimeString();
})
  .on('progress', (ctx, score)=>{
  console.log(`Progress: ${(score*100).toFixed(1)}%`)
}).listen(3000);
