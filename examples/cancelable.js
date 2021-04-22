const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');

const app = new CPKoa();

app.use(function* (ctx, next) {
  console.log(`First middleware [${ctx.url}]`);
  this.innerWeight(3);
  yield CPromise.delay(1000);
  console.log('stage 1');
  yield CPromise.delay(1000);
  console.log('stage 2');
  ctx.body = `Hello! [${yield next()}]`
}).use(async (ctx) => {
  console.log(`Second ECMA async middleware`);
  await CPromise.run(function* () {
    yield CPromise.delay(1000);
    console.log('stage 4');
    yield CPromise.delay(1000);
    console.log('stage 5');
  }).listen(ctx.scope.signal);
  return new Date().toLocaleTimeString();
})
  .on('progress', (ctx, score) => {
    console.log(`Progress: ${(score * 100).toFixed(1)}%`)
  }).listen(3000);
