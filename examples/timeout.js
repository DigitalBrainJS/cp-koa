const CPKoa = require('../lib/index');
const {CPromise} = require('c-promise2');
const cpAxios= require('cp-axios');

const app = new CPKoa();

app.use(function* (ctx, next) {
  console.log(`Start [${ctx.url}]`);
  this.timeout(2000);
  const response = yield cpAxios(`https://run.mocky.io/v3/7b038025-fc5f-4564-90eb-4373f0721822?mocky-delay=5s`);
  ctx.body = `Hello! Response : [${JSON.stringify(response.data)}]`
}).on('progress', (ctx, score) => {
    console.log(`Progress: ${(score * 100).toFixed(1)}%`)
  }).listen(3000);
