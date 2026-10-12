import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { NightCard } from '../types/session';
import { ScoutLocation } from '../types/scout';
import { SkyPlan } from '../types/planner';

interface SkywatchDB extends DBSchema {
  night_cards: {
    key: string;
    value: NightCard;
    indexes: { 'by-date': string };
  };
  cached_plans: {
    key: string;
    value: SkyPlan;
  };
  scout_cache: {
    key: string;
    value: {
      key: string;
      locations: ScoutLocation[];
      timestamp: number;
    };
  };
  weather_cache: {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
    };
  };
  tle_cache: {
    key: string;
    value: {
      noradId: number;
      line1: string;
      line2: string;
      name: string;
      timestamp: number;
    };
  };
}

const DB_NAME = 'skywatch_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SkywatchDB> | null> | null = null;

// In-memory fallback for test runners or environments without working indexedDB
const memoryStore = new Map<string, any>();

function hasIndexedDb(): boolean {
  try {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export async function getDb(): Promise<IDBPDatabase<SkywatchDB> | null> {
  if (!hasIndexedDb()) {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<SkywatchDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        try {
          if (!db.objectStoreNames.contains('night_cards')) {
            const store = db.createObjectStore('night_cards', { keyPath: 'id' });
            store.createIndex('by-date', 'dateString');
          }
          if (!db.objectStoreNames.contains('cached_plans')) {
            db.createObjectStore('cached_plans', { keyPath: 'planId' });
          }
          if (!db.objectStoreNames.contains('scout_cache')) {
            db.createObjectStore('scout_cache', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('weather_cache')) {
            db.createObjectStore('weather_cache', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('tle_cache')) {
            db.createObjectStore('tle_cache', { keyPath: 'noradId' });
          }
        } catch (e) {
          console.warn('Error upgrading stores:', e);
        }
      },
    }).catch((err) => {
      console.warn('IndexedDB unavailable or blocked (using memory store):', err);
      return null;
    });
  }
  try {
    return await dbPromise;
  } catch {
    return null;
  }
}

// Night Cards CRUD
export async function saveNightCard(card: NightCard): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.put('night_cards', card);
      return;
    }
  } catch (err) {
    console.warn('IndexedDB write failed, caching to memory:', err);
  }
  memoryStore.set(`card_${card.id}`, card);
}

export async function getAllNightCards(): Promise<NightCard[]> {
  try {
    const db = await getDb();
    if (db) {
      const all = await db.getAll('night_cards');
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('IndexedDB read failed, reading from memory:', err);
  }
  const cards: NightCard[] = [];
  memoryStore.forEach((v, k) => {
    if (k.startsWith('card_')) cards.push(v);
  });
  return cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getNightCard(id: string): Promise<NightCard | undefined> {
  try {
    const db = await getDb();
    if (db) {
      return await db.get('night_cards', id);
    }
  } catch (err) {
    console.warn('IndexedDB get failed:', err);
  }
  return memoryStore.get(`card_${id}`);
}

// Cached Plans
export async function cachePlan(plan: SkyPlan): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.put('cached_plans', plan);
      return;
    }
  } catch (err) {
    console.warn('Plan cache fallback to memory:', err);
  }
  memoryStore.set(`plan_${plan.planId}`, plan);
}

export async function getLatestCachedPlan(): Promise<SkyPlan | undefined> {
  try {
    const db = await getDb();
    if (db) {
      const all = await db.getAll('cached_plans');
      if (all.length > 0) {
        return all.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
      }
    }
  } catch (err) {
    console.warn('Failed reading plan cache from indexedDB:', err);
  }
  const plans: SkyPlan[] = [];
  memoryStore.forEach((v, k) => {
    if (k.startsWith('plan_')) plans.push(v);
  });
  if (plans.length === 0) return undefined;
  return plans.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
}

// Scout & Weather Cache
export async function cacheScoutResults(key: string, locations: ScoutLocation[]): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.put('scout_cache', { key, locations, timestamp: Date.now() });
      return;
    }
  } catch (err) {
    console.warn('Scout cache fallback to memory:', err);
  }
  memoryStore.set(`scout_${key}`, { locations, timestamp: Date.now() });
}

export async function getCachedScoutResults(key: string): Promise<ScoutLocation[] | null> {
  try {
    const db = await getDb();
    if (db) {
      const res = await db.get('scout_cache', key);
      if (res && Date.now() - res.timestamp <= 24 * 60 * 60 * 1000) {
        return res.locations;
      }
    }
  } catch (err) {
    console.warn('Scout cache read fallback to memory:', err);
  }
  const res = memoryStore.get(`scout_${key}`);
  if (!res) return null;
  if (Date.now() - res.timestamp > 24 * 60 * 60 * 1000) return null;
  return res.locations;
}

export async function cacheWeather(key: string, data: any): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      await db.put('weather_cache', { key, data, timestamp: Date.now() });
      return;
    }
  } catch (err) {
    console.warn('Weather cache fallback to memory:', err);
  }
  memoryStore.set(`weather_${key}`, { data, timestamp: Date.now() });
}

export async function getCachedWeather(key: string): Promise<any | null> {
  try {
    const db = await getDb();
    if (db) {
      const res = await db.get('weather_cache', key);
      if (res && Date.now() - res.timestamp <= 6 * 60 * 60 * 1000) {
        return res.data;
      }
    }
  } catch (err) {
    console.warn('Weather cache read fallback to memory:', err);
  }
  const res = memoryStore.get(`weather_${key}`);
  if (!res) return null;
  if (Date.now() - res.timestamp > 6 * 60 * 60 * 1000) return null;
  return res.data;
}
