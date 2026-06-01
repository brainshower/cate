import { spawn } from 'node:child_process'
import electron from 'electron'

const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CATE_SMOKE_TEST: '1',
    ELECTRON_RUN_AS_NODE: undefined,
  },
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
