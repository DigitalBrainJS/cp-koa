const Koa = require('koa');
const {CPromise, CanceledError} = require('c-promise2');
const createError = require('http-errors');

const {E_REASON_CANCELED} = CanceledError;

const {E_CLIENT_DISCONNECTED, E_SERVER_CLOSED} = CanceledError.registerErrors({
  E_CLIENT_DISCONNECTED: 'client disconnected',
  E_SERVER_CLOSED: {
    message: 'server closed',
    priority: Infinity,
    forced: true
  },
})

const ErrorCodesMap = {
  E_SERVER_CLOSED: 503,
  E_REASON_TIMEOUT: 504
}

const _shadow = Symbol('shadow');

/**
 * @typedef {Object} CPKoaCtx
 * @property {function} run promisify and run async function (ECMA async function, generator or callback-styled function)
 * @property {CPromise} scope ref to the relative CPromise scope
 * @inner
 */

/**
 * @api public
 * @extends Koa
 */

class CPKoaApplication extends Koa {
  constructor(options) {
    super(options);
    this[_shadow] = {
      requests: new Map(),
      cancelling: false,
      servers: [],
      scope: null
    }

    this.context[_shadow] = {
      scope: null
    }

    Object.defineProperties(this.context, {
      scope: {
        get() {
          return this[_shadow].scope
        }
      },

      run: {
        value(fn, options) {
          const shadow = this[_shadow];
          return CPromise.run(fn, options).listen(shadow.scope.signal);
        }
      }
    });
  }

  /**
   * @typedef {GeneratorFunction|function} CPKoaMiddleware
   * @param {CPKoaCtx} ctx
   * @param {function} next
   * @inner
   */

  /**
   * Add middleware to the app
   * @param {CPKoaMiddleware} middleware
   * @param {Object} [options]
   * @param {Boolean} [options.scopeArg] pass the relative CPromise scope to the middleware as the first argument
   * @returns {CPKoaApplication}
   */

  use(middleware, options) {
    if (typeof middleware !== 'function') throw new TypeError('middleware must be a function!');

    const {scopeArg} = options || {};

    return super.use(CPromise.promisify(middleware, {
      decorator: originalFn => {
        return function (scope, ctx, next) {
          ctx[_shadow].scope = scope;
          return scopeArg ? originalFn.call(this, scope, ctx, next) : originalFn.call(this, ctx, next);
        }
      },
      scopeArg: true
    }));
  }

  static compose(middleware) {
    if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
    for (const fn of middleware) {
      if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
    }

    /**
     * @param {Object} context
     * @param {function} [next]
     * @return {CPromise}
     * @api public
     */

    return function (ctx, next) {
      let index = -1
      return dispatch(0)

      function dispatch(i) {
        if (i <= index) return CPromise.reject(new Error('next() called multiple times'))
        index = i
        let fn = i === middleware.length ? next : middleware[i];
        if (!fn) return CPromise.resolve();
        try {
          return fn(ctx, dispatch.bind(null, i + 1));
        } catch (err) {
          return CPromise.reject(err)
        }
      }
    }
  }

  callback() {
    const shadow = this[_shadow];

    const composed = this.constructor.compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);

      const promise = this.handleRequest(ctx, () => {

        if (shadow.cancellaing) {
          return CPromise.reject(createError(503));
        }

        const middlewaresPromise = composed(ctx);

        this.listenerCount('progress') && middlewaresPromise.progress((p, scope, data) => {
          this.emit('progress', ctx, p, scope, data);
        });

        return middlewaresPromise.canceled(err => {
          if (err.code === E_CLIENT_DISCONNECTED) {
            return;
          }

          const error = createError(
            ErrorCodesMap[err.code] || 500,
            'Operation has been canceled' + (err.code === E_REASON_CANCELED ? '' : ': ' + err.message)
          )

          error.expose = true;

          throw error;
        }).weight(0)
      });

      shadow.requests.set(ctx, promise);

      ctx.req.on('close', () => {
        promise.cancel(E_CLIENT_DISCONNECTED);
      });

      return promise.finally(() => {
        shadow.requests.delete(ctx);
      });
    };


    return handleRequest;
  }

  listen(...args) {
    const server = super.listen(...args)
    this[_shadow].servers.push(server);
    return server.on('close', () => {
      const index = this[_shadow].servers.indexOf(server);
      index !== -1 && this[_shadow].servers.splice(index, 1);
    });
  }

  /**
   * Cancel all requests with timeout and close running http server
   * @param {number} [timeout = 10000]
   * @returns {CPromise}
   */

  close(timeout = 10000) {
    const shadow = this[_shadow];

    shadow.cancellaing = true;

    return CPromise.allSettled([...shadow.requests.values()].map(request => {
      request.cancel(E_SERVER_CLOSED);
      return request;
    })).timeout(timeout).finally(() => {
      try {
        shadow.requests.clear();
        shadow.servers.forEach(server => server.close());
      } finally {
        shadow.servers = [];
      }
    });
  }
}

module.exports = CPKoaApplication;

/**
 * Check whether the object is an CanceledError instance
 * @function
 * @param {*} thing
 * @returns {boolean}
 */

module.exports.isCanceledError = CPromise.isCanceledError;

/**
 * Request cancellation reason for cases when the user was disconnected
 * @type {string}
 */

module.exports.E_CLIENT_DISCONNECTED = CPromise.E_CLIENT_DISCONNECTED;

/**
 * Request cancellation reason for cases when the server is closing
 * @type {string}
 */

module.exports.E_SERVER_CLOSED = CPromise.E_SERVER_CLOSED;
