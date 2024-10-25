import AudioDeviceMonitor from './index'

const af = new AudioDeviceMonitor({
  autoStart: true,
  logger: false,
  delay: 1,
  step: 1,
})

af.on('change', (deviceInfo, change) => {})

af.on('error', message => {
  console.log('error:: ', message)
})

af.on('alert', message => {
  console.log('info:: ', message)
})

af.on('exit', code => {
  console.log('exit:: ', code)
})

af.on('forceExit', message => {
  console.log('forceExit:: ', message)
})

af.updateSettings({
  step: 1011,
})

af.downVolume()
