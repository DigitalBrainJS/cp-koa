const CPKoa = require('../../lib/index');
const {CPromise} = require('c-promise2');
const cpAxios = require('cp-axios');
const assert = require('assert');

const {isCanceledError} = CPKoa;

module.exports = {
  'middlewares': {
    'should be canceled on client disconnect': () => {
      return new CPromise((resolve, reject, {onDone}) => {
        const app = new CPKoa();

        app.use(function* () {
          try {
            yield CPromise.delay(1000);
          } catch (err) {
            if (isCanceledError(err)) {
              return resolve();
            }

            reject(err);
          }
        })

        const server = app.listen(3000);

        onDone(() => {
          server.close()
        });

        (async () => {
          const promise = cpAxios('http://localhost:3000/');
          await CPromise.delay(100);
          promise.cancel();
        })();

      }, {timeout: 2000});
    },

    'should handle AbortSignal when client disconnect': () => {
      return new CPromise((resolve, reject, {onDone}) => {
        const app = new CPKoa();

        app.use(function* (ctx) {
          ctx.scope.signal.addEventListener('abort', () => {
            resolve();
          })
          yield CPromise.delay(1000);
          assert.fail('was not cancelled');
        })

        const server = app.listen(3000);

        onDone(() => server.close());

        (async () => {
          const promise = cpAxios('http://localhost:3000/');
          await CPromise.delay(100);
          promise.cancel();
        })();

      });
    },

    'should support cancellation using ctx.scope.onSignal as a workaround for ECMA async functions': () => {
      return new CPromise((resolve, reject, {onDone}) => {
        const app = new CPKoa();
        let canceled = false;

        app.use(async(ctx)=> {
          ctx.scope.onSignal(CPromise.SIGNAL_CANCEL, ()=>{
            canceled = true;
            resolve();
          })

          await CPromise.delay(1000);
          !canceled && assert.fail('was not cancelled');
        })

        const server = app.listen(3000);

        onDone(() => server.close());

        (async () => {
          const promise = cpAxios('http://localhost:3000/');
          await CPromise.delay(100);
          promise.cancel();
        })();

      });
    },

    'should support cancellation using ctx.run decorator as a workaround for ECMA async functions': async () => {
      const app = new CPKoa();
      let endReached = false;
      let pos = 0;

      app.use(async (ctx) => {
        await ctx.run(function* () {
          yield CPromise.delay(500);
          pos++;
          yield CPromise.delay(500);
          pos++;
          yield CPromise.delay(500);
          pos++;
        });

        await CPromise.delay(500);
        endReached = true;
      })

      const server = app.listen(3000);

      try {
        const promise = cpAxios('http://localhost:3000/');
        await CPromise.delay(1100);
        promise.cancel();
        await CPromise.delay(1000);
        assert.equal(pos, 2);
        assert.ok(!endReached, 'was not canceled');
      } finally {
        await server.close()
      }
    },
  },

  'CPKoa.cancel()': {
    'should cancel all requests and stop the server': async()=>{
      return new CPromise((resolve, reject, {onDone}) => {
        const app = new CPKoa();

        app.use(function*(ctx) {
          yield CPromise.delay(2000);
          assert.fail('was not cancelled');
        })

        const server = app.listen(3000);

        onDone(() => server.close());

        (async () => {
          CPromise.delay(100).then(()=>  app.close());

          const results= await CPromise.allSettled([
            cpAxios('http://localhost:3000/'),
            cpAxios('http://localhost:3000/'),
            cpAxios('http://localhost:3000/')
          ]);

          await results.forEach(({reason})=>{
            assert.strictEqual(reason.response.status, 503);
          })

        })().then(resolve, reject);

      });
    }
  }
};
