const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');
const cpAxios = require('cp-axios');

const app = new CPKoa();

app.use(async function (ctx) {
  await ctx.run(function* () {
    yield CPromise.delay(1000);
    console.log('stage 1');
    yield CPromise.delay(1000);
    console.log('stage 2');
    yield CPromise.delay(1000);
    console.log('stage 3');
    yield CPromise.delay(1000);
    console.log('stage 4');
    yield CPromise.delay(1000);
    console.log('stage 5');
    yield CPromise.delay(1000);
    console.log('stage 6');
    yield CPromise.delay(1000);
    console.log('stage 7');
  }).innerWeight(7);

  await CPromise.delay(5000);
  console.log('done');

  ctx.body = 'Done!';
})
  .on('progress', (ctx, score) => {
    console.log(`Progress: ${(score * 100).toFixed(1)}%`)
  }).listen(3000);

const request = cpAxios('http://localhost:3000/');

setTimeout(() => {
  console.log('send cancel');
  request.cancel();
}, 4500);
