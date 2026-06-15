import test from 'node:test'
import assert from 'node:assert/strict'
import { apiBaseUrl, shouldUseMock } from '../src/api/clientConfig.js'

test('mock mode is only enabled explicitly', () => {
  assert.equal(shouldUseMock({}), false)
  assert.equal(shouldUseMock({ VITE_API_URL: 'https://api.example.test' }), false)
  assert.equal(shouldUseMock({ VITE_USE_MOCK: 'false' }), false)
  assert.equal(shouldUseMock({ VITE_USE_MOCK: 'true' }), true)
})

test('api base url falls back to same-origin /api', () => {
  assert.equal(apiBaseUrl({}), '/api')
  assert.equal(apiBaseUrl({ VITE_API_URL: 'https://api.example.test' }), 'https://api.example.test')
})
