/**
 * Node.js Test Configuration
 * 
 * This project uses Node.js native test runner (available from Node 18+)
 * with TypeScript support via tsx.
 * 
 * Test files are located in src/**\/*.test.ts
 * 
 * To run tests:
 * - npm test (runs all tests)
 * - node --test --import tsx/esm src/specific.test.ts (run specific test)
 * - npm run test:watch (watch mode)
 */

export default {
  // Test file pattern
  testPattern: 'src/**/*.test.ts',
  
  // TypeScript loader
  loader: 'tsx/esm',
  
  // Test runner options
  testRunner: {
    concurrency: true,
    timeout: 30000,
  }
};