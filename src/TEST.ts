import AudioDeviceMonitor from './index';

const af = new AudioDeviceMonitor();

af.on("change", (deviceInfo, change) => {
  console.log(deviceInfo, change);
});

af.on("error", (message) => {
  console.log("error", message);
})

af.on("exit", (code) => {
  console.log('exit', code);
})

af.on("forceExit", (message) => {
  console.log('forceExit', message);
})  

af.start()

// af.stop()