import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// vitest globals:false 환경에서는 RTL auto-cleanup이 등록되지 않으므로 직접 등록
afterEach(() => {
  cleanup();
});
