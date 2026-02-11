---
globs: "**/ralph-ui/**"
---

# Ink (React CLI) Rules

## Keyboard Input Setup — MUST do BEFORE render()

```typescript
import { render } from 'ink';

if (process.stdin.isTTY && process.stdin.setRawMode) {
  process.stdin.setRawMode(true);
  process.stdin.resume();  // BOTH required!
}

const instance = render(<App />, {
  exitOnCtrlC: false,
  stdin: process.stdin,
  stdout: process.stdout,
});
```

Without `setRawMode(true)` + `resume()`, `useInput()` receives nothing.

## Ctrl+C — Use SIGINT, NOT stdin handler

```typescript
// BAD - conflicts with Ink's useInput:
process.stdin.on('data', (d) => { if (d[0] === 0x03) exit(); });

// GOOD:
process.on('SIGINT', () => cleanupAndExit());
```

## Multi-Component Keyboard

Use `isActive` prop:
```typescript
useInput((input, key) => { ... }, { isActive: !modalOpen });
```

## Terminal Cleanup on Exit

```typescript
function cleanupAndExit(code = 0) {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
  process.exit(code);
}
```
