import {
  defineVarType,
  _clearVarTypeRegistryForTesting,
  VarTypeString,
  VarTypeNumber,
  VarTypeBoolean,
  VarTypeDateTime,
  VarTypeTime,
  VarTypeDate,
  NativeType,
} from '../index';

describe('Native Type Tests', () => {
  // Clear the registry before each test to ensure isolation
  beforeEach(() => {
    _clearVarTypeRegistryForTesting();
  });

  describe('Redefinition Prevention', () => {
    const nativeTypes: NativeType[] = ['Object', 'String', 'Number', 'Boolean', 'DateTime', 'Time', 'Date', 'Unknown'];

    nativeTypes.forEach(type => {
      // Skip 'Unknown' as it might not be explicitly defined in the same way
      if (type === 'Unknown') return;

      it(`should throw an error when trying to redefine native type '${type}'`, () => {
        expect(() => defineVarType(type, { defaultValue: null }))
          .toThrow(`Variable type ${type} is already defined and cannot be redefined.`);
      });
    });
  });

  describe('Conversion Rules', () => {
    describe('VarTypeString', () => {
      const rule = VarTypeString.getConversionRule('Number');
      it('should convert Number to String', () => {
        expect(rule).toBeDefined();
        const result = rule!(123);
        expect(result.success).toBe(true);
        expect(result.convertedValue).toBe('123');
      });
       it('should convert Boolean to String', () => {
        const rule = VarTypeString.getConversionRule('Boolean');
        expect(rule).toBeDefined();
        expect(rule!(true).convertedValue).toBe('true');
        expect(rule!(false).convertedValue).toBe('false');
      });
    });

    describe('VarTypeNumber', () => {
      it('should convert String to Number', () => {
        const rule = VarTypeNumber.getConversionRule('String');
        expect(rule).toBeDefined();
        expect(rule!('456').convertedValue).toBe(456);
        expect(rule!('456.78').convertedValue).toBe(456.78);
        expect(rule!('-10').convertedValue).toBe(-10);
        // Test invalid string
        expect(rule!('abc').success).toBe(false);
        expect(rule!('abc').error).toContain('Cannot convert string "abc" to a valid Number');
         // Test empty string
        expect(rule!('').success).toBe(false);
        expect(rule!('').error).toContain('Cannot convert empty string to Number');
      });

      it('should convert Boolean to Number', () => {
         const rule = VarTypeNumber.getConversionRule('Boolean');
         expect(rule).toBeDefined();
         expect(rule!(true).convertedValue).toBe(1);
         expect(rule!(false).convertedValue).toBe(0);
      });
    });

    describe('VarTypeBoolean', () => {
       it('should convert Number to Boolean', () => {
        const rule = VarTypeBoolean.getConversionRule('Number');
        expect(rule).toBeDefined();
        expect(rule!(1).convertedValue).toBe(true);
        expect(rule!(0).convertedValue).toBe(false);
        expect(rule!(-1).convertedValue).toBe(true); // Any non-zero number is true
      });

      it('should convert String to Boolean', () => {
        const rule = VarTypeBoolean.getConversionRule('String');
        expect(rule).toBeDefined();
        expect(rule!('true').convertedValue).toBe(true);
        expect(rule!('false').convertedValue).toBe(false);
        expect(rule!('TRUE').convertedValue).toBe(true); // Case-insensitive
        expect(rule!('FaLsE').convertedValue).toBe(false);
         // Test invalid string (should fail)
        expect(rule!('abc').success).toBe(false);
        expect(rule!('abc').error).toContain('Cannot convert string "abc" to Boolean (expects \'true\' or \'false\')');
        // Test empty string (should fail)
        expect(rule!('').success).toBe(false);
        expect(rule!('').error).toContain('Cannot convert string "" to Boolean (expects \'true\' or \'false\')');
      });
    });

    // Common function to test Date/Time types String conversion
    const testDateTimeStringConversion = (varType: any, typeName: string) => {
       describe(typeName, () => {
          const rule = varType.getConversionRule('String');
          it(`should convert valid String to ${typeName} (timestamp)`, () => {
            expect(rule).toBeDefined();
            const date = new Date();
            const dateString = date.toISOString();
            const result = rule!(dateString);
            expect(result.success).toBe(true);
            // Compare timestamps, allowing for minor differences if any
            expect(result.convertedValue).toBeCloseTo(date.getTime());
          });

          it(`should fail converting invalid String to ${typeName}`, () => {
             expect(rule).toBeDefined();
             const result = rule!('invalid-date-string');
             expect(result.success).toBe(false);
             expect(result.error).toContain(`Cannot convert string "invalid-date-string" to a valid ${typeName}`);
          });

          it(`should fail converting empty String to ${typeName}`, () => {
            expect(rule).toBeDefined();
            const result = rule!('');
            expect(result.success).toBe(false);
            expect(result.error).toContain(`Cannot convert empty string to ${typeName}`);
         });
       });
    };

    testDateTimeStringConversion(VarTypeDateTime, 'DateTime');
    testDateTimeStringConversion(VarTypeTime, 'Time');
    testDateTimeStringConversion(VarTypeDate, 'Date');

    // Test Number to Date/Time/DateTime (should just pass through the number/timestamp)
     describe('Timestamp Passthrough (Number)', () => {
        const types = [
          { type: VarTypeDateTime, name: 'DateTime' },
          { type: VarTypeTime, name: 'Time' },
          { type: VarTypeDate, name: 'Date' }
        ];

        types.forEach(({ type, name }) => {
          it(`should accept Number as valid ${name} timestamp`, () => {
            const rule = type.getConversionRule('Number');
            expect(rule).toBeDefined();
            const timestamp = Date.now();
            const result = rule!(timestamp);
            expect(result.success).toBe(true);
            expect(result.convertedValue).toBe(timestamp);
          });
        });
    });
  });
});
