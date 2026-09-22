/**
 * Event Code Mapping Layer for Hikvision DS-K1T320MFWX ISAPI AcsEvent
 */

export interface EventCodeDefinition {
  major: number;
  minor: number;
  category: string;
  neutralDescription: string;
  status: 'SUCCESS' | 'FAILED' | 'SYSTEM';
  verified: boolean;
}

export const KNOWN_EVENT_CODES: Record<string, EventCodeDefinition> = {
  // Authentication Successful
  '5:38': {
    major: 5,
    minor: 38,
    category: 'Access Control',
    neutralDescription: 'Authentication Passed / Access Granted',
    status: 'SUCCESS',
    verified: true,
  },
  '5:75': {
    major: 5,
    minor: 75,
    category: 'Authentication',
    neutralDescription: 'Successful Authentication (Face)',
    status: 'SUCCESS',
    verified: true,
  },
  '5:104': {
    major: 5,
    minor: 104,
    category: 'Authentication',
    neutralDescription: 'Successful Authentication (Face)',
    status: 'SUCCESS',
    verified: true,
  },
  '5:77': {
    major: 5,
    minor: 77,
    category: 'Authentication',
    neutralDescription: 'Successful Authentication (Fingerprint)',
    status: 'SUCCESS',
    verified: true,
  },
  '5:40': {
    major: 5,
    minor: 40,
    category: 'Authentication',
    neutralDescription: 'Successful Authentication (Card + Biometric)',
    status: 'SUCCESS',
    verified: true,
  },

  // Authentication Failed
  '5:39': {
    major: 5,
    minor: 39,
    category: 'Authentication',
    neutralDescription: 'Failed Authentication (Invalid Credential / Denied)',
    status: 'FAILED',
    verified: true,
  },
  '5:76': {
    major: 5,
    minor: 76,
    category: 'Authentication',
    neutralDescription: 'Failed Authentication (Face Mismatch)',
    status: 'FAILED',
    verified: true,
  },
  '5:78': {
    major: 5,
    minor: 78,
    category: 'Authentication',
    neutralDescription: 'Failed Authentication (Fingerprint Mismatch)',
    status: 'FAILED',
    verified: true,
  },
  '5:33': {
    major: 5,
    minor: 33,
    category: 'Authentication',
    neutralDescription: 'Failed Authentication (Card Expired / Inactive)',
    status: 'FAILED',
    verified: true,
  },
  '5:34': {
    major: 5,
    minor: 34,
    category: 'Authentication',
    neutralDescription: 'Failed Authentication (No Access Permission)',
    status: 'FAILED',
    verified: true,
  },
  '5:37': {
    major: 5,
    minor: 37,
    category: 'Authentication',
    neutralDescription: 'Failed Authentication (Anti-Passback Violation)',
    status: 'FAILED',
    verified: true,
  },

  // System Events (filtered out from attendance display)
  '5:1': {
    major: 5,
    minor: 1,
    category: 'System',
    neutralDescription: 'Door Unlocked',
    status: 'SYSTEM',
    verified: true,
  },
  '5:2': {
    major: 5,
    minor: 2,
    category: 'System',
    neutralDescription: 'Door Locked',
    status: 'SYSTEM',
    verified: true,
  },
  '5:21': {
    major: 5,
    minor: 21,
    category: 'System',
    neutralDescription: 'Door Unlocked',
    status: 'SYSTEM',
    verified: true,
  },
  '5:22': {
    major: 5,
    minor: 22,
    category: 'System',
    neutralDescription: 'Door Locked',
    status: 'SYSTEM',
    verified: true,
  },
};

/**
 * Determines whether an event code is an authentication attempt (Passed or Failed)
 */
export function isAuthenticationEvent(major: number, minor: number): boolean {
  const key = `${major}:${minor}`;
  const def = KNOWN_EVENT_CODES[key];
  if (def) {
    return def.status === 'SUCCESS' || def.status === 'FAILED';
  }
  // Any event with employee ID or access major code is treated as auth
  return major === 5 && (minor >= 30 && minor <= 120);
}

/**
 * Returns simple SUCCESS, FAILED or SYSTEM status
 */
export function getAuthStatus(major: number, minor: number): 'SUCCESS' | 'FAILED' {
  const key = `${major}:${minor}`;
  const def = KNOWN_EVENT_CODES[key];
  if (def) {
    return def.status === 'FAILED' ? 'FAILED' : 'SUCCESS';
  }
  // Failure codes in Hikvision are typically 39, 76, 78, 33, 34
  if ([39, 76, 78, 33, 34, 37].includes(minor)) {
    return 'FAILED';
  }
  return 'SUCCESS';
}

/**
 * Returns user-friendly description and clean status for the UI
 */
export function getNeutralEventDescription(major: number, minor: number, verifyMode?: string): {
  category: string;
  description: string;
  status: 'SUCCESS' | 'FAILED';
  statusLabel: 'Successful Authentication' | 'Failed Authentication';
  verifyModeLabel: string;
  codeDisplay: string;
} {
  const key = `${major}:${minor}`;
  const known = KNOWN_EVENT_CODES[key];
  const status = getAuthStatus(major, minor);

  const statusLabel = status === 'SUCCESS' ? 'Successful Authentication' : 'Failed Authentication';

  let description = known ? known.neutralDescription : `Raw Event (Major: ${major}, Minor: ${minor})`;

  const verifyModeMap: Record<string, string> = {
    faceOrFpOrCardOrPw: minor === 104 || minor === 75 ? 'Face' : 'Face / Fingerprint / Card / Password',
    fp: 'Fingerprint',
    face: 'Face',
    card: 'Card',
    pw: 'Password',
    faceAndFp: 'Face + Fingerprint',
    cardAndFp: 'Card + Fingerprint',
  };

  const verifyModeLabel = verifyMode
    ? verifyModeMap[verifyMode] || (verifyMode.includes('face') ? 'Face' : verifyMode)
    : minor === 104 || minor === 75
    ? 'Face'
    : 'Card';

  return {
    category: 'Access Control',
    description,
    status,
    statusLabel,
    verifyModeLabel,
    codeDisplay: `[${major}, ${minor}]`,
  };
}
