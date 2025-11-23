export {};

declare global {
  interface Window {
    toggleDevTools?: () => void;
  }
}
