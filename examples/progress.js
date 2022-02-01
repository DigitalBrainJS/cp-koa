const {CPromise} = require('c-promise2');


const fn = CPromise.promisify(function* (n) {
  this.innerWeight(0);

  for(let i= 0; i<100; i++) {
    this.progress(i/100);
    yield CPromise.delay(100);
  }

});

CPromise.run(function*(){
  yield fn();
  console.log('done');
}).progress(score=>{
  console.log(`Progress middleware: ${(score * 100).toFixed(1)}%`);
});
