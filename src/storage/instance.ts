import { seedDishes } from '../data/seed'
import { createStore, type StorageLike } from './store'

/** Used only when localStorage is blocked (some private modes): works until the page is closed. */
class MemoryStorage implements StorageLike {
  private data = new Map<string, string>()
  getItem(k: string): string | null {
    return this.data.get(k) ?? null
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v)
  }
  removeItem(k: string): void {
    this.data.delete(k)
  }
}

function pickStorage(): StorageLike {
  try {
    const probe = 'dbara.v1.probe'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return new MemoryStorage()
  }
}

/** The one store the app uses. */
export const store = createStore(pickStorage(), seedDishes)
