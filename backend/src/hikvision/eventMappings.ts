/**
 * Event Code Mapping Layer for Hikvision DS-K1T320MFWX ISAPI AcsEvent
 * 
 * IMPORTANT:
 * As per specifications, events are NOT labeled as "Check In" or "Check Out"
 * because directional semantics depend on terminal configuration and attendance rules.
 * All descriptions are neutral and based on verified access control event codes.
 */

export interface EventCodeDefinition {
  major: number;
  minor: number;
  category: string;
  neutralDescription: string;
  verified: boolean;
}

export const KNOWN_EVENT_CODES: Record<string, EventCodeDefinition> = {
  // Major 5: Access Control Events
  '5:38': {
    major: 5,
    minor: 38,
    category: 'Access Control',
    neutralDescription: 'Authentication Passed / Access Granted',
    verified: true,
  },
  '5:39': {
    major: 5,
    minor: 39,
    category: 'Access Control',
    neutralDescription: 'Authentication Failed / Access Denied',
    verified: false,
  },
  '5:1': {
    major: 5,
    minor: 1,
    category: 'Access Control',
    neutralDescription: 'Door Unlocked',
    verified: true,
  },
  '5:2': {
    major: 5,
    minor: 2,
    category: 'Access Control',
    neutralDescription: 'Door Locked',
    verified: true,
  },
  '5:21': {
    major: 5,
    minor: 21,
    category: 'Access Control',
    neutralDescription: 'Door Unlocked',
    verified: true,
  },
  '5:22': {
    major: 5,
    minor: 22,
    category: 'Access Control',
    neutralDescription: 'Door Locked',
    verified: true,
  },
  '5:75': {
    major: 5,
    minor: 75,
    category: 'Access Control',
    neutralDescription: 'Face Verification Passed',
    verified: false,
  },
  '5:76': {
    major: 5,
    minor: 76,
    category: 'Access Control',
    neutralDescription: 'Face Verification Failed',
    verified: false,
  },
  '5:104': {
    major: 5,
    minor: 104,
    category: 'Access Control',
    neutralDescription: 'Face Authentication Passed',
    verified: true,
  },
};

/**
 * Returns a neutral, non-presumptive event description
 */
export function getNeutralEventDescription(major: number, minor: number, verifyMode?: string): {
  category: string;
  description: string;
  verifyModeLabel: string;
  codeDisplay: string;
} {
  const key = `${major}:${minor}`;
  const known = KNOWN_EVENT_CODES[key];

  const category = known ? known.category : major === 5 ? 'Access Control' : `Major ${major}`;
  const description = known ? known.neutralDescription : `Raw Event (Major: ${major}, Minor: ${minor})`;

  const verifyModeMap: Record<string, string> = {
    faceOrFpOrCardOrPw: minor === 104 || minor === 75 ? 'Face' : 'Card / Biometric',
    fp: 'Fingerprint',
    face: 'Face',
    card: 'Card',
    pw: 'Password',
    faceAndFp: 'Face + Fingerprint',
    cardAndFp: 'Card + Fingerprint',
  };

  const verifyModeLabel = verifyMode ? verifyModeMap[verifyMode] || (verifyMode.includes('face') ? 'Face' : verifyMode) : (minor === 104 || minor === 75 ? 'Face' : 'Automatic');

  return {
    category,
    description,
    verifyModeLabel,
    codeDisplay: `[${major}, ${minor}]`,
  };
}
