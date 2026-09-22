import { describe, it, expect } from 'vitest';

interface StoredEvent {
  deviceId: string;
  serialNo: number;
  eventTime: string;
  employeeNo: string;
  major: number;
  minor: number;
}

/**
 * Simulates deduplication logic matching database composite constraint:
 * @@unique([deviceId, serialNo, eventTime, employeeNo])
 */
class InMemoryEventStore {
  private events: Map<string, StoredEvent> = new Map();

  private getCompositeKey(ev: {
    deviceId: string;
    serialNo: number;
    eventTime: string;
    employeeNo: string;
  }): string {
    return `${ev.deviceId}_${ev.serialNo}_${ev.eventTime}_${ev.employeeNo}`;
  }

  public insert(ev: StoredEvent): boolean {
    const key = this.getCompositeKey(ev);
    if (this.events.has(key)) {
      return false; // Duplicate suppressed
    }
    this.events.set(key, ev);
    return true; // Successfully inserted
  }

  public count(): number {
    return this.events.size;
  }
}

describe('Duplicate Event Prevention Strategy', () => {
  it('should allow distinct events from the same device and same employee', () => {
    const store = new InMemoryEventStore();

    const ev1: StoredEvent = {
      deviceId: 'dev-1',
      serialNo: 101,
      eventTime: '2026-09-21T08:30:00Z',
      employeeNo: '1',
      major: 5,
      minor: 38,
    };

    const ev2: StoredEvent = {
      deviceId: 'dev-1',
      serialNo: 102,
      eventTime: '2026-09-21T17:30:00Z',
      employeeNo: '1',
      major: 5,
      minor: 38,
    };

    expect(store.insert(ev1)).toBe(true);
    expect(store.insert(ev2)).toBe(true);
    expect(store.count()).toBe(2);
  });

  it('should reject exact duplicate events arriving from subsequent sync runs', () => {
    const store = new InMemoryEventStore();

    const event: StoredEvent = {
      deviceId: 'dev-1',
      serialNo: 101,
      eventTime: '2026-09-21T08:30:00Z',
      employeeNo: '1',
      major: 5,
      minor: 38,
    };

    // First sync
    expect(store.insert(event)).toBe(true);

    // Second sync returns the same event again
    expect(store.insert({ ...event })).toBe(false);
    expect(store.count()).toBe(1);
  });

  it('should not treat same serial number from different devices as duplicate', () => {
    const store = new InMemoryEventStore();

    const eventDev1: StoredEvent = {
      deviceId: 'device-terminal-A',
      serialNo: 42,
      eventTime: '2026-09-21T09:00:00Z',
      employeeNo: '1',
      major: 5,
      minor: 38,
    };

    const eventDev2: StoredEvent = {
      deviceId: 'device-terminal-B',
      serialNo: 42,
      eventTime: '2026-09-21T09:00:00Z',
      employeeNo: '1',
      major: 5,
      minor: 38,
    };

    expect(store.insert(eventDev1)).toBe(true);
    expect(store.insert(eventDev2)).toBe(true);
    expect(store.count()).toBe(2);
  });
});
