import React, { useState, useEffect, memo, useRef } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface IterationHeaderProps {
  iteration: number;
  model: string;
  startTime: number;
  isRunning?: boolean;
}

function formatElapsed(startTime: number): string {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// ElapsedTime component - updates every second independently
// Memoized to prevent parent re-renders from affecting it
const ElapsedTime = memo(function ElapsedTime({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(startTime));

  useEffect(() => {
    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsed(formatElapsed(startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <Text dimColor>Elapsed: {elapsed}</Text>;
});

// Main IterationHeader - memoized to prevent unnecessary re-renders
// Only re-renders when iteration, model, or isRunning changes
export const IterationHeader = memo(function IterationHeader({
  iteration,
  model,
  startTime,
  isRunning = true,
}: IterationHeaderProps) {
  // Use a stable key based on meaningful content to prevent duplicate box renders
  // This ensures Ink doesn't create multiple boxes for the same iteration
  const stableKey = `iteration-${iteration}-${model}-${isRunning}`;
  
  return (
    <Box key={stableKey} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} width="100%">
      <Box justifyContent="space-between">
        <Box>
          {isRunning && (
            <Text color="green">
              <Spinner type="dots" />{' '}
            </Text>
          )}
          <Text bold color="cyan">Iteration {iteration}</Text>
        </Box>
        <Text color="yellow"> Model: {model}</Text>
      </Box>
      <Box justifyContent="flex-end">
        <ElapsedTime startTime={startTime} />
      </Box>
    </Box>
  );
});
