const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');

const app = new CPKoa();

app.use(async (ctx) => {
  console.log(`ECMA async middleware`);
  await ctx.run(function* () {
    yield CPromise.delay(1000);
    console.log('stage 4');
    yield CPromise.delay(1000);
    console.log('stage 5');
  });
  ctx.body= 'Done!';
})
  .on('progress', (ctx, score) => {
    console.log(`Progress: ${(score * 100).toFixed(1)}%`)
  }).listen(3000);
