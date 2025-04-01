import { strictConversionRules } from '../def.conversion.rule';
import { NativeType } from '../def.basic.type';

describe('Strict Conversion Rules', () => {

  const getRule = (targetType: NativeType, sourceType: NativeType) => {
    return strictConversionRules.get(targetType)?.get(sourceType);
  };

  // --- Tests for Target Type: String ---
  describe('Target: String', () => {
    const targetType: NativeType = 'String';

    it('should convert Number to String', () => {
      const rule = getRule(targetType, 'Number');
      expect(rule).toBeDefined();
      const result = rule!(123, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe('123');
    });

    it('should convert Boolean true to String', () => {
      const rule = getRule(targetType, 'Boolean');
      expect(rule).toBeDefined();
      const result = rule!(true, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe('true');
    });

    it('should convert Boolean false to String', () => {
      const rule = getRule(targetType, 'Boolean');
      expect(rule).toBeDefined();
      const result = rule!(false, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe('false');
    });

    it('should convert Date to ISO String', () => {
      const rule = getRule(targetType, 'Date');
      const testDate = new Date(2024, 0, 1, 12, 30, 0);
      expect(rule).toBeDefined();
      const result = rule!(testDate, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe(testDate.toISOString());
    });

    // Add tests for disallowed types if needed (e.g., Object to String should fail or have no rule)
    it('should not have a rule for Object to String', () => {
      const rule = getRule(targetType, 'Object');
      expect(rule).toBeUndefined();
    });
  });

  // --- Tests for Target Type: Number ---
  describe('Target: Number', () => {
    const targetType: NativeType = 'Number';

    it('should convert valid String to Number', () => {
      const rule = getRule(targetType, 'String');
      expect(rule).toBeDefined();
      const result = rule!(' 456.7 ', 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe(456.7);
    });

    it('should fail converting invalid String to Number', () => {
      const rule = getRule(targetType, 'String');
      expect(rule).toBeDefined();
      const result = rule!('abc', 'testKey', targetType);
      expect(result.success).toBe(false);
      expect(result.error).toContain('无法将字符串 "abc" 转换为有效数字');
    });

    it('should fail converting empty String to Number', () => {
      const rule = getRule(targetType, 'String');
      expect(rule).toBeDefined();
      const result = rule!('', 'testKey', targetType);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不接受空字符串');
    });

     it('should fail converting String with only spaces to Number', () => {
      const rule = getRule(targetType, 'String');
      expect(rule).toBeDefined();
      const result = rule!('   ', 'testKey', targetType);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不接受空字符串');
    });

    it('should convert Boolean true to Number 1', () => {
      const rule = getRule(targetType, 'Boolean');
      expect(rule).toBeDefined();
      const result = rule!(true, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe(1);
    });

    it('should convert Boolean false to Number 0', () => {
      const rule = getRule(targetType, 'Boolean');
      expect(rule).toBeDefined();
      const result = rule!(false, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe(0);
    });

    it('should convert Date to Number (timestamp)', () => {
      const rule = getRule(targetType, 'Date');
      const testDate = new Date();
      expect(rule).toBeDefined();
      const result = rule!(testDate, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toBe(testDate.getTime());
    });

     it('should not have a rule for Object to Number', () => {
      const rule = getRule(targetType, 'Object');
      expect(rule).toBeUndefined();
    });
  });

  // --- Tests for Target Type: Boolean ---
  describe('Target: Boolean', () => {
    const targetType: NativeType = 'Boolean';

    it('should convert Number 0 to false', () => {
        const rule = getRule(targetType, 'Number');
        expect(rule).toBeDefined();
        const result = rule!(0, 'testKey', targetType);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBe(false);
    });

     it('should convert non-zero Number to true', () => {
        const rule = getRule(targetType, 'Number');
        expect(rule).toBeDefined();
        const result = rule!(123, 'testKey', targetType);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBe(true);
        const resultNeg = rule!(-5, 'testKey', targetType);
        expect(resultNeg.success).toBe(true);
        expect(resultNeg.convertedValue).toBe(true);
    });

    it('should convert String "true" (case-insensitive, trimmed) to true', () => {
        const rule = getRule(targetType, 'String');
        expect(rule).toBeDefined();
        const result = rule!(' TrUe ', 'testKey', targetType);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBe(true);
    });

     it('should convert String "false" (case-insensitive, trimmed) to false', () => {
        const rule = getRule(targetType, 'String');
        expect(rule).toBeDefined();
        const result = rule!(' fAlSe ', 'testKey', targetType);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBe(false);
    });

     it('should fail converting other Strings to Boolean', () => {
        const rule = getRule(targetType, 'String');
        expect(rule).toBeDefined();
        const result = rule!('yes', 'testKey', targetType);
        expect(result.success).toBe(false);
        expect(result.error).toContain('无法将字符串 "yes" 转换为布尔值');
        const resultEmpty = rule!('', 'testKey', targetType);
        expect(resultEmpty.success).toBe(false);
        expect(resultEmpty.error).toContain('无法将字符串 "" 转换为布尔值');
    });

     it('should not have a rule for Date to Boolean', () => {
        const rule = getRule(targetType, 'Date');
        expect(rule).toBeUndefined();
    });

     it('should not have a rule for Object to Boolean', () => {
      const rule = getRule(targetType, 'Object');
      expect(rule).toBeUndefined();
    });
  });

  // --- Tests for Target Type: Date ---
  describe('Target: Date', () => {
    const targetType: NativeType = 'Date';

    it('should convert valid Number (timestamp) to Date', () => {
        const rule = getRule(targetType, 'Number');
        const timestamp = Date.now();
        expect(rule).toBeDefined();
        const result = rule!(timestamp, 'testKey', targetType);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBeInstanceOf(Date);
        expect((result.convertedValue as Date).getTime()).toBe(timestamp);
    });

    it('should fail converting invalid Number to Date', () => {
        const rule = getRule(targetType, 'Number');
        expect(rule).toBeDefined();
        // Using a clearly invalid number representation for a date
        const result = rule!(NaN, 'testKey', targetType);
        expect(result.success).toBe(false);
        expect(result.error).toContain('无法将数字 NaN 转换为有效日期');
    });

     it('should convert valid String to Date', () => {
        const rule = getRule(targetType, 'String');
        const dateString = '2023-10-26T10:00:00.000Z';
        expect(rule).toBeDefined();
        const result = rule!(dateString, 'testKey', targetType);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBeInstanceOf(Date);
        expect((result.convertedValue as Date).toISOString()).toBe(dateString);
    });

    it('should convert valid short String to Date', () => {
        const rule = getRule(targetType, 'String');
        const dateString = '2023-10-26';
        const expectedDate = new Date(dateString);
        expect(rule).toBeDefined();
        const result = rule!(dateString, 'testKey', targetType);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBeInstanceOf(Date);
        // Be careful comparing dates directly due to timezones; check components if needed
        expect((result.convertedValue as Date).getFullYear()).toBe(expectedDate.getFullYear());
        expect((result.convertedValue as Date).getMonth()).toBe(expectedDate.getMonth());
        expect((result.convertedValue as Date).getDate()).toBe(expectedDate.getDate());
    });

    it('should fail converting invalid String to Date', () => {
        const rule = getRule(targetType, 'String');
        expect(rule).toBeDefined();
        const result = rule!('not a date', 'testKey', targetType);
        expect(result.success).toBe(false);
        expect(result.error).toContain('无法将字符串 "not a date" 转换为有效日期');
    });

    it('should fail converting empty String to Date', () => {
        const rule = getRule(targetType, 'String');
        expect(rule).toBeDefined();
        const result = rule!('', 'testKey', targetType);
        expect(result.success).toBe(false);
        expect(result.error).toContain('不接受空字符串');
    });

     it('should fail converting String with only spaces to Date', () => {
      const rule = getRule(targetType, 'String');
      expect(rule).toBeDefined();
      const result = rule!('   ', 'testKey', targetType);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不接受空字符串');
    });

     it('should not have a rule for Boolean to Date', () => {
        const rule = getRule(targetType, 'Boolean');
        expect(rule).toBeUndefined();
    });

     it('should not have a rule for Object to Date', () => {
        const rule = getRule(targetType, 'Object');
        expect(rule).toBeUndefined();
    });
  });

  // --- Tests for Target Type: Object ---
  describe('Target: Object', () => {
    const targetType: NativeType = 'Object';

    it('should allow assigning Object to Object', () => {
      const rule = getRule(targetType, 'Object');
      const testObj = { a: 1, b: 'test' };
      expect(rule).toBeDefined();
      const result = rule!(testObj, 'testKey', targetType);
      expect(result.success).toBe(true);
      expect(result.convertedValue).toEqual(testObj); // Use toEqual for deep comparison
    });

    // Check that other types are disallowed
    it('should not have a rule for String to Object', () => {
      const rule = getRule(targetType, 'String');
      expect(rule).toBeUndefined();
    });
    it('should not have a rule for Number to Object', () => {
      const rule = getRule(targetType, 'Number');
      expect(rule).toBeUndefined();
    });
     it('should not have a rule for Boolean to Object', () => {
      const rule = getRule(targetType, 'Boolean');
      expect(rule).toBeUndefined();
    });
     it('should not have a rule for Date to Object', () => {
      const rule = getRule(targetType, 'Date');
      expect(rule).toBeUndefined();
    });

  });
});
