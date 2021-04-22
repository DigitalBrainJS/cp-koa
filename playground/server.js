const Koa= require('koa');
const {CPromise}= require("../../c-promise/lib/c-promise");
const CPKoa= require('../lib/index');
const Router= require('koa-router');

const app= new CPKoa();

const router = new Router();

const doJob= CPromise.promisify(function*(ctx){
  console.log('job::stage1');
  yield CPromise.delay(1000);
  console.log('job::stage2');
  yield CPromise.delay(1000);
  console.log('job::stage3');
  yield CPromise.delay(1000);
  console.log('job::stage4');
  yield CPromise.delay(1000);
  console.log('job::stage5');
  yield CPromise.delay(1000);
  ctx.body= "job ok!";
});

router.get('/listen', async (ctx, next) => {
  // ctx.router available
  console.log('router scope', ctx.scope.toString(true));

  ctx.scope.canceled(()=>{
    console.warn('relative scope canceled');
  })

  ctx.scope.onCancel(()=>{
    console.warn('relative scope canceled2');
  })

  ctx.scope.signal.addEventListener('abort', ()=>{
    console.warn('controller scope canceled3');
  });

  await CPromise.delay(3000);

  ctx.scope.cancel();

  ctx.body= `Cool! It Works!`;
});

router.get('/cancel', async (ctx, next)=>{
  await CPromise.delay(2000);
  throw new CPromise.CanceledError();
});

router.get('/job', async(ctx, next)=>{
  await doJob(ctx).listen(ctx.scope.signal);
});

router.get('/job2', async(ctx, next)=>{
  await CPromise.run(function*(){
    this.innerWeight(5);
    console.log('job2::stage1');
    yield CPromise.delay(1000);
    console.log('job2::stage2');
    yield CPromise.delay(1000);
    console.log('job2::stage3');
    yield CPromise.delay(1000);
    console.log('job2::stage4');
    yield CPromise.delay(1000);
    console.log('job2::stage5');
    yield CPromise.delay(1000);
    ctx.body= "job2 ok!";
  }).listen(ctx.scope.signal);
});

app
  .use(router.routes())
  .use(router.allowedMethods());

app.use(function*(ctx, next){
  console.log('middleware1');
  this.innerWeight(2);
  //this.progress(p=> console.log(`First middleware progress: ${p}`));
  yield CPromise.delay(5000);
  yield next();
  ctx.body= Date.now();
});

app.use(function*(ctx, next){
  //console.log('context', this);
  this.innerWeight(4);
  this.atomic();
  console.log('middleware2');
  yield CPromise.delay(2000);
  console.log('middleware2::stage2');
  yield CPromise.delay(2000);
  console.log('middleware2::stage3');
  yield CPromise.delay(2000);
  console.log('middleware2::stage4');
  yield next();
  //ctx.body="ok";
})

app.use(async (ctx, next)=>{
  //console.log('context', this);
  console.log('middleware3', ctx.scope.toString(true));
  await CPromise.delay(1000);

  //ctx.body="ok";
})

app.listen(3000);

app.on('progress', (ctx, progress, scope, data)=>{
  console.warn(`>Request Progress: ${progress}`, scope.label());
});
