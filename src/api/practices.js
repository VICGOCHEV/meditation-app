import { api, USE_MOCK, delay } from './client'
import { mockPractices, findPractice } from './mock'

export async function fetchPractices() {
  if (USE_MOCK) {
    await delay(100)
    return mockPractices
  }
  const { data } = await api.get('/practices')
  return data
}

export async function fetchPractice(id) {
  if (USE_MOCK) {
    await delay(100)
    return findPractice(id)
  }
  const { data } = await api.get(`/practices/${id}`)
  return data
}

export async function completePractice(id) {
  if (USE_MOCK) {
    await delay(120)
    return { ok: true, id }
  }
  const { data } = await api.post(`/practices/${id}/complete`)
  return data
}
