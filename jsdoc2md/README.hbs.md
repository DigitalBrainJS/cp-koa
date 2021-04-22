[![Build Status](https://travis-ci.com/DigitalBrainJS/cp-koa.svg?branch=master)](https://travis-ci.com/DigitalBrainJS/cp-koa)
[![Coverage Status](https://coveralls.io/repos/github/DigitalBrainJS/cp-koa/badge.svg?branch=master)](https://coveralls.io/github/DigitalBrainJS/cp-koa?branch=master)
![npm](https://img.shields.io/npm/dm/cp-koa)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/cp-koa)
![David](https://img.shields.io/david/DigitalBrainJS/cp-koa)
[![Stars](https://badgen.net/github/stars/DigitalBrainJS/cp-koa)](https://github.com/DigitalBrainJS/cp-koa/stargazers)

## CP-Koa

`CPKoa` is an enhanced version of [Koa](https://www.npmjs.com/package/koa) with the support of cancellable middleware, 
that can be automatically canceled when client disconnecting.
The package internally uses `CPromise` (provided by [c-promise2](https://www.npmjs.com/package/c-promise2))
instead of the native to bring the cancellation and progress capturing to the `CPKoa`. 

See the [Codesandbox demo](https://codesandbox.io/s/cp-koa-readme-basic-xr2fi)
````javascript
const CPKoa = require('cp-koa');
const {CPromise} = require('c-promise2');

const app = new CPKoa();

app.use(function*(ctx, next){
  console.log(`First middleware [${ctx.url}]`);
  yield CPromise.delay(2000);
  ctx.body= `Hello! [${yield next()}]`
}).use(function*(){
  console.log(`Second middleware`);
  yield CPromise.delay(500);
  return new Date().toLocaleTimeString();
}).on('progress', (ctx, score)=>{
  console.log(`Progress: ${(score*100).toFixed(1)}%`)
}).listen(3000);
````

````output
First middleware [/]
Progress: 25.0%
Progress: 50.0%
Second middleware
Progress: 100.0%
````
You can still use ECMA async function as middlewares:

````javascript
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
````
CPKoa's `ctx` has a `scope` property that refers to the relative `CPromise` instance. 
Since every CPromise has a `signal` property that provides `AbortController` signal (controllers creating on demand),
you can use it to cancel your async routines, when the parent scope cancels.
This allowing you to use async middlewares and functions that do not support `CPromise` out of the box. 
````javascript
app.use(async (ctx) => {
  console.log(`Second ECMA async middleware`);
  await CPromise.run(function* () {
    yield CPromise.delay(1000);
    console.log('stage 4');
    yield CPromise.delay(1000);
    console.log('stage 5');
  }).listen(ctx.scope.signal);
})
````
CPKoa's ctx object has a shortcut to do this easier:
````javascript
app.use(async (ctx) => {
  await ctx.run(function* () { // this async routine will be cancelled when the client disconnecting
    yield CPromise.delay(1000);
    console.log('stage 4');
    yield CPromise.delay(1000);
    console.log('stage 5');
  });
  ctx.body= 'Done!';
})
````
CPromise provides `timeout` method, so you able to set a timeout for each middleware separately if you need to.
````javascript
const app = new CPKoa();

app.use(function* (ctx, next) {
  console.log(`Start [${ctx.url}]`);
  this.timeout(2000);
  const response = yield cpAxios(`https://run.mocky.io/v3/7b038025-fc5f-4564-90eb-4373f0721822?mocky-delay=5s`);
  ctx.body = `Hello! Response : [${JSON.stringify(response.data)}]`
}).listen(3000);
````
The `CPromise` chain can be marked as `atomic` - the execution of such a chain cannot be interrupted from the upper chains.
By default, the top chain will wait for the atomic chain to complete, or if the `detached` option has been set,
it will continue canceling the top chain while the atomic chain continues in the background.
````javascript
app.use(function*(ctx, next){
  this.atomic();// The request promise chain can not be interrupted while this sub-chain is not completed.
  yield CPromise.delay(100);
  console.log('stage 1');
  yield CPromise.delay(1000);
  console.log('stage 2');
  yield CPromise.delay(1000);
  console.log('stage 3');
  ctx.body = new Date().toLocaleTimeString();
})
````
Since koa-router currently do not support `CPromise` features, you have to use a workaround with `ctx.run`
inside your routes:
````javascript
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
````

## API Reference

{{>main}}

## License

The MIT License Copyright (c) 2021 Dmitriy Mozgovoy robotshara@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

