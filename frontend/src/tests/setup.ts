import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebSocket globally
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
}));

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
    }),
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 256,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
    }),
    close: vi.fn(),
    state: 'running',
  })),
});

// Mock MediaRecorder
Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ondataavailable: null,
    onstop: null,
    onerror: null,
    state: 'inactive',
    mimeType: 'audio/webm;codecs=opus',
  })),
});

// Mock MediaRecorder.isTypeSupported
Object.defineProperty(MediaRecorder, 'isTypeSupported', {
  writable: true,
  value: vi.fn().mockReturnValue(true),
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([
        {
          stop: vi.fn(),
          kind: 'audio',
          label: 'Mock Audio Track',
        },
      ]),
    }),
  },
});

// Mock navigator.permissions
Object.defineProperty(navigator, 'permissions', {
  writable: true,
  value: {
    query: vi.fn().mockResolvedValue({
      state: 'granted',
      addEventListener: vi.fn(),
    }),
  },
});

// Mock window.requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn().mockImplementation((callback: FrameRequestCallback) => {
    return setTimeout(callback, 16);
  }),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn().mockImplementation((id: number) => {
    clearTimeout(id);
  }),
});

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});