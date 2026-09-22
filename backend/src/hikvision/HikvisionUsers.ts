import { HikvisionClient } from './HikvisionClient';
import { UserCountResponse, UserInfo, UserInfoSearchResponse, HikvisionError } from './types';

export interface UserCountResult {
  userNumber: number;
  bindFingerprintUserNumber: number;
  bindFaceUserNumber: number;
  bindCardUserNumber: number;
  raw: unknown;
}

export interface SearchUsersOptions {
  position?: number;
  maxResults?: number;
  employeeNo?: string;
  searchId?: string;
}

export interface UserSearchResult {
  searchId: string;
  totalMatches: number;
  numOfMatches: number;
  users: UserInfo[];
  raw: unknown;
}

export class HikvisionUsers {
  constructor(private client: HikvisionClient) {}

  /**
   * Fetch total user and biometric enrollment counts
   */
  public async getUserCount(): Promise<UserCountResult> {
    const raw = await this.client.get<any>('/ISAPI/AccessControl/UserInfo/Count?format=json');
    const data = raw.UserInfoCount || raw;

    return {
      userNumber: Number(data.userNumber ?? 0),
      bindFingerprintUserNumber: Number(data.bindFingerprintUserNumber ?? 0),
      bindFaceUserNumber: Number(data.bindFaceUserNumber ?? 0),
      bindCardUserNumber: Number(data.bindCardUserNumber ?? 0),
      raw,
    };
  }

  /**
   * Search users with pagination parameters (searchResultPosition, maxResults)
   */
  public async searchUsers(options: SearchUsersOptions = {}): Promise<UserSearchResult> {
    const position = options.position ?? 0;
    const maxResults = options.maxResults ?? 30;
    const searchId = options.searchId || '1';

    const searchCond: Record<string, any> = {
      searchID: searchId,
      searchResultPosition: position,
      maxResults: maxResults,
    };

    if (options.employeeNo) {
      searchCond.EmployeeNoList = [{ employeeNo: options.employeeNo }];
    }

    const payload = {
      UserInfoSearchCond: searchCond,
    };

    const raw = await this.client.post<UserInfoSearchResponse>(
      '/ISAPI/AccessControl/UserInfo/Search?format=json',
      payload
    );

    const search = raw.UserInfoSearch || {};
    const users = Array.isArray(search.UserInfo) ? search.UserInfo : [];
    const totalMatches = Number(search.totalMatches ?? users.length);
    const numOfMatches = Number(search.numOfMatches ?? users.length);

    return {
      searchId: search.searchID || searchId,
      totalMatches,
      numOfMatches,
      users,
      raw,
    };
  }

  /**
   * Automatically fetch all users across multiple pages
   */
  public async fetchAllUsers(batchSize = 30): Promise<UserInfo[]> {
    const allUsers: UserInfo[] = [];
    let position = 0;
    let total = Infinity;

    while (position < total) {
      const result = await this.searchUsers({
        position,
        maxResults: batchSize,
      });

      if (!result.users || result.users.length === 0) {
        break;
      }

      allUsers.push(...result.users);
      total = result.totalMatches;
      position += result.users.length;

      if (position >= total) {
        break;
      }
    }

    return allUsers;
  }

  /**
   * Create user directly on the physical Hikvision terminal
   */
  public async createTerminalUser(user: {
    employeeNo: string;
    name: string;
    userType?: string;
    validFrom?: string;
    validTo?: string;
    belongGroup?: number;
    doorRight?: string;
  }): Promise<any> {
    const beginTime = user.validFrom || '2020-01-01T00:00:00';
    const endTime = user.validTo || '2035-12-31T23:59:59';
    const payload = {
      UserInfo: {
        employeeNo: user.employeeNo,
        name: user.name,
        userType: user.userType || 'normal',
        closeDelayEnabled: false,
        Valid: {
          enable: true,
          beginTime,
          endTime,
          timeType: 'local',
        },
        belongGroup: user.belongGroup || 1,
        doorRight: user.doorRight || '1',
        RightPlan: [
          {
            doorNo: 1,
            planTemplateNo: '1',
          },
        ],
      },
    };

    return this.client.post<any>('/ISAPI/AccessControl/UserInfo/Record?format=json', payload);
  }

  /**
   * Delete user directly from the physical Hikvision terminal
   */
  public async deleteTerminalUser(employeeNo: string): Promise<any> {
    const payload = {
      UserInfoDelCond: {
        EmployeeNoList: [{ employeeNo }],
      },
    };
    return this.client.put<any>('/ISAPI/AccessControl/UserInfo/Delete?format=json', payload);
  }

  /**
   * Update user validity time period on the physical terminal
   * Setting endTime in the past (e.g. yesterday) expires/blocks the user locally on the device!
   */
  public async updateUserValidity(employeeNo: string, options: {
    beginTime?: string; // Format: YYYY-MM-DDTHH:mm:ss
    endTime?: string;   // Format: YYYY-MM-DDTHH:mm:ss
    enable?: boolean;
    name?: string;
    userType?: string;
  }): Promise<any> {
    const beginTime = options.beginTime || '2020-01-01T00:00:00';
    const endTime = options.endTime || '2035-12-31T23:59:59';
    const enable = options.enable !== undefined ? options.enable : true;

    const payload: any = {
      UserInfo: {
        employeeNo,
        Valid: {
          enable,
          beginTime,
          endTime,
          timeType: 'local',
        },
      },
    };

    if (options.name) payload.UserInfo.name = options.name;
    if (options.userType) payload.UserInfo.userType = options.userType;

    const res = await this.client.put<any>(
      '/ISAPI/AccessControl/UserInfo/Modify?format=json',
      payload
    );

    return res;
  }
}
