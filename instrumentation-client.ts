import { initBotId } from 'botid/client/core'

initBotId({
  protect: [
    { path: '/api/bouquets', method: 'POST' },
    { path: '/api/upload', method: 'POST' },
  ],
})
