const CPKoa = require('../lib/index');
const Router= require('koa-router');
const {CPromise} = require('c-promise2');

const app = new CPKoa();

const router = new Router();

router.get('/', async(ctx, next)=>{
  await ctx.run(function*(){
    this.innerWeight(3); // total progress score
    yield CPromise.delay(1000);
    console.log('stage 1');
    yield CPromise.delay(1000);
    console.log('stage 2');
    yield CPromise.delay(1000);
    console.log('stage 3');
    ctx.body= "Root page"
  });
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .on('progress', (ctx, score) => {
    console.log(`Progress: ${(score * 100).toFixed(1)}%`)
  }).listen(3000);
