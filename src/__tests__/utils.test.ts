import * as path from 'path';
import * as fs from 'fs-extra';
import { fileExists, getAbsolutePath, ensureDirectory } from '../utils';

// Mock fs-extra và path
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  ensureDirSync: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
}));

describe('Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fileExists', () => {
    it('should return true if file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      expect(fileExists('test.txt')).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('test.txt');
    });

    it('should return false if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(fileExists('test.txt')).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith('test.txt');
    });
  });

  describe('getAbsolutePath', () => {
    it('should return the absolute path', () => {
      (path.resolve as jest.Mock).mockReturnValue('/absolute/path/test.txt');
      expect(getAbsolutePath('test.txt')).toBe('/absolute/path/test.txt');
      expect(path.resolve).toHaveBeenCalled();
    });
  });

  describe('ensureDirectory', () => {
    it('should return true if directory was created successfully', () => {
      (fs.ensureDirSync as jest.Mock).mockImplementation(() => {});
      expect(ensureDirectory('test-dir')).toBe(true);
      expect(fs.ensureDirSync).toHaveBeenCalledWith('test-dir');
    });

    it('should return false if there was an error creating directory', () => {
      (fs.ensureDirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Directory creation failed');
      });
      expect(ensureDirectory('test-dir')).toBe(false);
      expect(fs.ensureDirSync).toHaveBeenCalledWith('test-dir');
    });
  });
}); 