import { describe, expect, it } from 'vitest'
import * as channels from './ipc-channels'

const FLASHQUERY_CHANNEL_VALUES = new Set([
  'flashquery:setConnection',
  'flashquery:probe',
  'flashquery:listVault',
  'flashquery:getDocument',
  'flashquery:writeDocument',
  'flashquery:createDocument',
  'flashquery:manageDirectory',
  'flashquery:moveDocument',
  'flashquery:removeDocument',
  'flashquery:search',
  'flashquery:documentConnections',
  'flashquery:list-vault-index',
  'flashquery:retry',
  'flashquery:status',
])

describe('FlashQuery IPC channels', () => {
  it('T-U-002 keeps FlashQuery channels exact and collision-free', () => {
    const channelEntries = Object.entries(channels).filter(([, value]) => typeof value === 'string')
    const flashqueryEntries = channelEntries.filter(([, value]) => value.startsWith('flashquery:'))

    expect(new Set(flashqueryEntries.map(([, value]) => value))).toEqual(FLASHQUERY_CHANNEL_VALUES)
    expect(flashqueryEntries).toHaveLength(FLASHQUERY_CHANNEL_VALUES.size)

    const collisions = channelEntries.filter(([name, value]) => (
      FLASHQUERY_CHANNEL_VALUES.has(value) && !name.startsWith('FLASHQUERY_')
    ))
    expect(collisions).toEqual([])
  })
})
