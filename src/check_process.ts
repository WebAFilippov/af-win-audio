import { getProcessesByName } from 'node-processlist'

const arg = Number(process.argv[2]) || 1000

setInterval(() => {
  ;(async () => {
    const processes = await getProcessesByName('af-win-audio.exe', {})
    console.log('=====================================')
    console.log(processes)
  })()
}, arg)
