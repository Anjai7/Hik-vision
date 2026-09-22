import { HikvisionClient } from './HikvisionClient';
import { AcsEventItem, AcsEventSearchResponse } from './types';

export interface SearchEventsOptions {
  position?: number;
  maxResults?: number;
  major?: number;
  minor?: number;
  startTime?: string;
  endTime?: string;
  searchId?: string;
}

export interface EventSearchResult {
  searchId: string;
  totalMatches: number;
  numOfMatches: number;
  responseStatus: string;
  events: AcsEventItem[];
  raw: unknown;
}

export class HikvisionEvents {
  constructor(private client: HikvisionClient) {}

  /**
   * Search attendance and access events with pagination
   */
  public async searchEvents(options: SearchEventsOptions = {}): Promise<EventSearchResult> {
    const position = options.position ?? 0;
    const maxResults = options.maxResults ?? 30;
    const searchId = options.searchId || '1';

    const acsEventCond: Record<string, any> = {
      searchID: searchId,
      searchResultPosition: position,
      maxResults: maxResults,
      major: options.major ?? 0,
      minor: options.minor ?? 0,
    };

    if (options.startTime) {
      acsEventCond.startTime = options.startTime;
    }
    if (options.endTime) {
      acsEventCond.endTime = options.endTime;
    }

    const payload = {
      AcsEventCond: acsEventCond,
    };

    const raw = await this.client.post<AcsEventSearchResponse>(
      '/ISAPI/AccessControl/AcsEvent?format=json',
      payload
    );

    const acsEvent = raw.AcsEvent || {};
    const events = Array.isArray(acsEvent.InfoList) ? acsEvent.InfoList : [];
    const totalMatches = Number(acsEvent.totalMatches ?? events.length);
    const numOfMatches = Number(acsEvent.numOfMatches ?? events.length);
    const responseStatus = acsEvent.responseStatusStrg || 'UNKNOWN';

    return {
      searchId: acsEvent.searchID || searchId,
      totalMatches,
      numOfMatches,
      responseStatus,
      events,
      raw,
    };
  }

  /**
   * Automatically fetch events across multiple pages (e.g. 0, 30, 60, 90...)
   * until all matching events are fetched or pagination ends.
   */
  public async fetchAllEvents(options: Omit<SearchEventsOptions, 'position'> = {}): Promise<AcsEventItem[]> {
    const allEvents: AcsEventItem[] = [];
    const batchSize = options.maxResults ?? 30;
    let position = 0;
    let total = Infinity;

    while (position < total) {
      const result = await this.searchEvents({
        ...options,
        position,
        maxResults: batchSize,
      });

      if (!result.events || result.events.length === 0) {
        break;
      }

      allEvents.push(...result.events);
      total = result.totalMatches;
      position += result.events.length;

      // If fewer events than requested were returned or we reached total, exit
      if (result.events.length < batchSize || position >= total) {
        break;
      }
    }

    return allEvents;
  }
}
