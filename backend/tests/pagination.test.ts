import { describe, it, expect } from 'vitest';
import { HikvisionUsers } from '../src/hikvision/HikvisionUsers';
import { HikvisionEvents } from '../src/hikvision/HikvisionEvents';

describe('Hikvision Pagination Logic', () => {
  it('should paginate across multiple user pages until all users are collected', async () => {
    const pages: Record<number, any> = {
      0: {
        UserInfoSearch: {
          searchID: '1',
          numOfMatches: 2,
          totalMatches: 5,
          UserInfo: [
            { employeeNo: '1', name: 'User 1' },
            { employeeNo: '2', name: 'User 2' },
          ],
        },
      },
      2: {
        UserInfoSearch: {
          searchID: '1',
          numOfMatches: 2,
          totalMatches: 5,
          UserInfo: [
            { employeeNo: '3', name: 'User 3' },
            { employeeNo: '4', name: 'User 4' },
          ],
        },
      },
      4: {
        UserInfoSearch: {
          searchID: '1',
          numOfMatches: 1,
          totalMatches: 5,
          UserInfo: [{ employeeNo: '5', name: 'User 5' }],
        },
      },
    };

    const requestedPositions: number[] = [];

    const mockClient: any = {
      post: async (path: string, body: any) => {
        const pos = body.UserInfoSearchCond.searchResultPosition;
        requestedPositions.push(pos);
        return pages[pos] || { UserInfoSearch: { numOfMatches: 0, totalMatches: 5, UserInfo: [] } };
      },
    };

    const usersService = new HikvisionUsers(mockClient);
    const users = await usersService.fetchAllUsers(2);

    expect(users).toHaveLength(5);
    expect(users.map((u) => u.employeeNo)).toEqual(['1', '2', '3', '4', '5']);
    expect(requestedPositions).toEqual([0, 2, 4]);
  });

  it('should paginate across multiple event pages using searchResultPosition', async () => {
    const requestedPositions: number[] = [];

    const mockClient: any = {
      post: async (path: string, body: any) => {
        const pos = body.AcsEventCond.searchResultPosition;
        requestedPositions.push(pos);

        if (pos === 0) {
          return {
            AcsEvent: {
              searchID: '1',
              numOfMatches: 2,
              totalMatches: 3,
              InfoList: [
                { major: 5, minor: 38, time: '2026-09-21T10:00:00Z', employeeNoString: '1', serialNo: 1 },
                { major: 5, minor: 38, time: '2026-09-21T11:00:00Z', employeeNoString: '1', serialNo: 2 },
              ],
            },
          };
        } else if (pos === 2) {
          return {
            AcsEvent: {
              searchID: '1',
              numOfMatches: 1,
              totalMatches: 3,
              InfoList: [
                { major: 5, minor: 38, time: '2026-09-21T12:00:00Z', employeeNoString: '1', serialNo: 3 },
              ],
            },
          };
        }
        return { AcsEvent: { numOfMatches: 0, totalMatches: 3, InfoList: [] } };
      },
    };

    const eventsService = new HikvisionEvents(mockClient);
    const events = await eventsService.fetchAllEvents({ maxResults: 2 });

    expect(events).toHaveLength(3);
    expect(requestedPositions).toEqual([0, 2]);
  });
});
