import { describe, it, expect } from 'vitest';
import { HikvisionAuth } from '../src/hikvision/HikvisionAuth';

describe('HikvisionAuth - RFC 2617 / RFC 7616 Digest Authentication', () => {
  it('should correctly parse standard Hikvision WWW-Authenticate challenge header', () => {
    const auth = new HikvisionAuth();
    const challengeHeader =
      'Digest qop="auth", realm="IP Camera(D3452)", nonce="4d50596d4f5459344e5445364e5467334d4451314e7a413d", stale="FALSE", opaque="12345678"';

    const parsed = auth.parseChallenge(challengeHeader);

    expect(parsed).not.toBeNull();
    expect(parsed?.realm).toBe('IP Camera(D3452)');
    expect(parsed?.nonce).toBe('4d50596d4f5459344e5445364e5467334d4451314e7a413d');
    expect(parsed?.qop).toBe('auth');
    expect(parsed?.opaque).toBe('12345678');
    expect(parsed?.algorithm).toBe('MD5');
  });

  it('should return null for malformed or non-digest headers', () => {
    const auth = new HikvisionAuth();
    expect(auth.parseChallenge('')).toBeNull();
    expect(auth.parseChallenge('Basic cm9vdDoxMjM0NQ==')).toBeNull();
    expect(auth.parseChallenge('Digest some_broken_header')).toBeNull();
  });

  it('should generate a valid Authorization Digest header with incrementing nonce count', () => {
    const auth = new HikvisionAuth();
    auth.parseChallenge(
      'Digest realm="Hikvision", nonce="testnonce123", qop="auth"'
    );

    const header1 = auth.generateAuthorizationHeader(
      'GET',
      '/ISAPI/System/deviceInfo',
      'admin',
      'password123'
    );

    expect(header1).toContain('Digest username="admin"');
    expect(header1).toContain('realm="Hikvision"');
    expect(header1).toContain('nonce="testnonce123"');
    expect(header1).toContain('uri="/ISAPI/System/deviceInfo"');
    expect(header1).toContain('qop="auth"');
    expect(header1).toContain('nc=00000001');
    expect(header1).toMatch(/cnonce="[a-f0-9]{32}"/);
    expect(header1).toMatch(/response="[a-f0-9]{32}"/);

    // Second request should increment nc to 00000002
    const header2 = auth.generateAuthorizationHeader(
      'POST',
      '/ISAPI/AccessControl/AcsEvent?format=json',
      'admin',
      'password123'
    );
    expect(header2).toContain('nc=00000002');
  });

  it('should reset challenge state on request', () => {
    const auth = new HikvisionAuth();
    auth.parseChallenge('Digest realm="Hikvision", nonce="testnonce"');
    expect(auth.getChallenge()).not.toBeNull();

    auth.resetChallenge();
    expect(auth.getChallenge()).toBeNull();
  });
});
