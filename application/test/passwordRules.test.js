import test from 'node:test'
import assert from 'node:assert/strict'
import { PASSWORD_RE, passwordChecks } from '../src/pages/Auth/passwordRules.js'

test('password rule matches backend: letter plus digit or symbol', () => {
  assert.equal(PASSWORD_RE.test('Password1'), true)
  assert.equal(PASSWORD_RE.test('Password!'), true)
  assert.equal(PASSWORD_RE.test('12345678'), false)
  assert.equal(PASSWORD_RE.test('Password'), false)
  assert.equal(PASSWORD_RE.test('Pass1'), false)
})

test('password hints expose the same non-alpha requirement', () => {
  assert.deepEqual(passwordChecks('Password!'), {
    long: true,
    letter: true,
    nonAlpha: true,
  })
  assert.equal(passwordChecks('Password').nonAlpha, false)
})
