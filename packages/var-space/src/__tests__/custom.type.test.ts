/**
 * Custom type test
 */

import {
  defineVarType,
  getVarType,
  _clearVarTypeRegistryForTesting
} from '../index';

describe('Custom Type', () => {

  // Clear the registry before each test
  beforeEach(() => {
    _clearVarTypeRegistryForTesting();
  });

  describe('throw redefine nativeType', () => {
    it('should throw an error if trying to override a native type', () => { 
      expect(() => defineVarType('String', {
        defaultValue: '',
        defaultDescriptor: {
          nativeType: 'String'  
        }
      })).toThrow('Variable type String is already defined and cannot be redefined.');
    });
  });

  describe('defineCustomType', () => {
    it('should define a new custom type', () => {
      type IUser = {  
        id: number;
        name: string;
      }

      defineVarType<IUser>('UserType', {
        defaultValue: { id: 0, name: '' },
        defaultDescriptor: {
          nativeType: 'Object',
        },
        toString: (value) => `${value.name} (${value.id})`
      });

      const userType = getVarType('UserType');

      expect(userType).toBeDefined();  
      expect(userType!.type).toBe('UserType');
      expect(userType!.defaultValue).toEqual({ id: 0, name: '' });
      expect(userType!.defaultDescriptor.nativeType).toBe('Object');
      expect(userType!.defaultDescriptor.writable).toBe(true);
      expect(userType!.defaultDescriptor.enumerable).toBe(true); 
      expect(userType!.defaultDescriptor.observable).toBe(false);
      expect(userType!.toString({ id: 1, name: 'John' })).toBe('John (1)');
    });
  });
});