// const AudioDeviceMonitor = require('./dist/index.cjs.js');

// const af = new AudioDeviceMonitor()

// af.on('change', (data) => {
//   console.log(data)
// })

import AudioDeviceMonitor from './dist/index.esm.js';

const af = new AudioDeviceMonitor()

af.on('change', (data) => {
  console.log(data)
})
