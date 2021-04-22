const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');
const cpAxios= require('cp-axios');

const app = new CPKoa();

app.use(function* (ctx, next) {
  console.log(`Start [${ctx.url}]`);
  this.innerWeight(2);
  yield CPromise.delay(2000);
  const response = yield cpAxios(`https://rickandmortyapi.com/api/character/${Math.round(Math.random() * 100)}`);
  ctx.body = `Hello! Response : [${JSON.stringify(response.data)}]`
}).on('progress', (ctx, score) => {
    console.log(`Progress: ${(score * 100).toFixed(1)}%`)
  }).listen(3000);
