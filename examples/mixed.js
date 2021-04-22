const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');

const app = new CPKoa();

app.use(function* (ctx, next) {
  console.log(`First middleware [${ctx.url}]`);
  yield CPromise.delay(2000);
  ctx.body = `Hello! [${yield next()}]`
})
  .use(async (ctx) => {
    console.log(`Second ECMA async middleware`);
    await CPromise.delay(1000);
    return new Date().toLocaleTimeString();
  })
  .on('progress', (ctx, score) => {
    console.log(`Progress: ${(score * 100).toFixed(1)}%`)
  }).listen(3000);
