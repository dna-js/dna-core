import {
  generateRequestId,
  extractPath,
  parseRequestParams,
  matchPath,
  matchParams,
  findMatchingRecord,
  formatTimestamp,
} from '../utils';
import { RequestRecord } from '../types';

describe('utils', () => {
  describe('generateRequestId', () => {
    it('should generate consistent id for same path and params', () => {
      const id1 = generateRequestId('/api/users', { id: 1 });
      const id2 = generateRequestId('/api/users', { id: 1 });
      expect(id1).toBe(id2);
    });

    it('should generate different ids for different params', () => {
      const id1 = generateRequestId('/api/users', { id: 1 });
      const id2 = generateRequestId('/api/users', { id: 2 });
      expect(id1).not.toBe(id2);
    });
  });

  describe('extractPath', () => {
    it('should extract path from full URL', () => {
      const path = extractPath('https://example.com/api/users?id=1');
      expect(path).toBe('/api/users');
    });

    it('should handle relative URLs', () => {
      const path = extractPath('/api/users?id=1');
      expect(path).toBe('/api/users');
    });

    it('should handle URLs without query params', () => {
      const path = extractPath('https://example.com/api/users');
      expect(path).toBe('/api/users');
    });
  });

  describe('parseRequestParams', () => {
    it('should parse query params from URL', () => {
      const params = parseRequestParams('/api/users?id=1&name=test', 'GET');
      expect(params).toEqual({ id: '1', name: 'test' });
    });

    it('should include body for POST requests', () => {
      const body = JSON.stringify({ title: 'test' });
      const params = parseRequestParams('/api/posts', 'POST', body);
      expect(params.body).toEqual({ title: 'test' });
    });
  });

  describe('matchPath', () => {
    it('should match exact paths', () => {
      expect(matchPath('/api/users', '/api/users')).toBe(true);
      expect(matchPath('/api/users', '/api/posts')).toBe(false);
    });

    it('should match regex patterns', () => {
      expect(matchPath('/api/.*', '/api/users')).toBe(true);
      expect(matchPath('/api/user.*', '/api/users')).toBe(true);
      expect(matchPath('/api/posts', '/api/users')).toBe(false);
    });
  });

  describe('matchParams', () => {
    it('should match when no rule provided', () => {
      expect(matchParams(undefined, { id: 1 })).toBe(true);
      expect(matchParams({}, { id: 1 })).toBe(true);
    });

    it('should match exact values', () => {
      expect(matchParams({ id: '1' }, { id: '1' })).toBe(true);
      expect(matchParams({ id: '1' }, { id: '2' })).toBe(false);
    });

    it('should match regex patterns', () => {
      expect(matchParams({ id: '\\d+' }, { id: '123' })).toBe(true);
      expect(matchParams({ id: '\\d+' }, { id: 'abc' })).toBe(false);
    });

    it('should fail when required param is missing', () => {
      expect(matchParams({ id: '\\d+' }, { name: 'test' })).toBe(false);
    });
  });

  describe('findMatchingRecord', () => {
    const records: RequestRecord[] = [
      {
        id: '1',
        path: '/api/users',
        method: 'GET',
        params: { id: 1 },
        response: { data: 'user1' },
        timestamp: Date.now(),
      },
      {
        id: '2',
        path: '/api/posts',
        method: 'GET',
        params: { id: 2 },
        response: { data: 'post2' },
        timestamp: Date.now(),
        matchRule: { id: '\\d+' },
      },
    ];

    it('should find matching record by path', () => {
      const result = findMatchingRecord(records, '/api/users', { id: 1 });
      expect(result.matched).toBe(true);
      expect(result.record?.id).toBe('1');
    });

    it('should return not matched when path does not match', () => {
      const result = findMatchingRecord(records, '/api/comments', { id: 1 });
      expect(result.matched).toBe(false);
    });

    it('should match with regex rule', () => {
      const result = findMatchingRecord(records, '/api/posts', { id: '123' });
      expect(result.matched).toBe(true);
      expect(result.record?.id).toBe('2');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-01-15T10:30:45').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/2024-01-15 \d{2}:\d{2}:\d{2}/);
    });
  });
});

