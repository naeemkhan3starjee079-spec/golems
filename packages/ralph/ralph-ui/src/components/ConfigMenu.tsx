import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { loadConfig, saveConfig, type RalphConfig, type UiMode, type Model } from '../utils/config.js';

// Config item definition
interface ConfigItem {
  key: keyof RalphConfig | 'ntfyTopic';
  label: string;
  type: 'select' | 'text';
  options?: string[];
  getValue: (config: RalphConfig) => string;
  setValue: (config: RalphConfig, value: string) => RalphConfig;
}

// Configurable items
const CONFIG_ITEMS: ConfigItem[] = [
  {
    key: 'uiMode',
    label: 'UI Mode',
    type: 'select',
    options: ['live', 'iteration', 'startup'],
    getValue: (config) => config.uiMode || 'live',
    setValue: (config, value) => ({ ...config, uiMode: value as UiMode }),
  },
  {
    key: 'defaultModel',
    label: 'Default Model',
    type: 'select',
    options: ['haiku', 'sonnet', 'opus'],
    getValue: (config) => config.defaultModel || 'opus',
    setValue: (config, value) => ({ ...config, defaultModel: value as Model }),
  },
  {
    key: 'ntfyTopic',
    label: 'Ntfy Topic',
    type: 'text',
    getValue: (config) => config.notifications?.ntfyTopic || '',
    setValue: (config, value) => ({
      ...config,
      notifications: { ...config.notifications, enabled: !!value, ntfyTopic: value },
    }),
  },
];

interface ConfigMenuProps {
  onClose: () => void;
  onSave?: () => void;
}

// AIDEV-NOTE: Ink's useInput hook throws errors in non-TTY contexts.
// ConfigMenu's input handling is split into a hook-based and effect-based approach.

// Hook for raw mode keyboard handling - must be called at component level
function useRawModeInput(
  isActive: boolean,
  config: RalphConfig,
  setConfig: (c: RalphConfig) => void,
  selectedIndex: number,
  setSelectedIndex: (i: number | ((prev: number) => number)) => void,
  editMode: boolean,
  setEditMode: (b: boolean) => void,
  editValue: string,
  setEditValue: (s: string | ((prev: string) => string)) => void,
  message: string | null,
  setMessage: (m: string | null) => void,
  onClose: () => void,
  onSave?: () => void,
) {
  useInput((input, key) => {
    // Clear any message on next input
    if (message) setMessage(null);

    // Handle escape or 'q' to close without saving
    if (key.escape || (input === 'q' && !editMode)) {
      onClose();
      return;
    }

    if (editMode) {
      // Text editing mode
      if (key.return) {
        // Save the edited value
        const item = CONFIG_ITEMS[selectedIndex];
        const newConfig = item.setValue(config, editValue);
        setConfig(newConfig);
        setEditMode(false);
      } else if (key.backspace || key.delete) {
        setEditValue(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setEditValue(prev => prev + input);
      }
      return;
    }

    // Navigation mode
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : CONFIG_ITEMS.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => (prev < CONFIG_ITEMS.length - 1 ? prev + 1 : 0));
    } else if (key.return || key.rightArrow) {
      const item = CONFIG_ITEMS[selectedIndex];
      if (item.type === 'select' && item.options) {
        // Cycle through options
        const currentValue = item.getValue(config);
        const currentIndex = item.options.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % item.options.length;
        const newConfig = item.setValue(config, item.options[nextIndex]);
        setConfig(newConfig);
      } else if (item.type === 'text') {
        // Enter text edit mode
        setEditValue(item.getValue(config));
        setEditMode(true);
      }
    } else if (key.leftArrow) {
      const item = CONFIG_ITEMS[selectedIndex];
      if (item.type === 'select' && item.options) {
        // Cycle through options backwards
        const currentValue = item.getValue(config);
        const currentIndex = item.options.indexOf(currentValue);
        const nextIndex = currentIndex <= 0 ? item.options.length - 1 : currentIndex - 1;
        const newConfig = item.setValue(config, item.options[nextIndex]);
        setConfig(newConfig);
      }
    } else if (input === 's') {
      // Save config
      try {
        saveConfig(config);
        setMessage('Config saved - changes take effect on next run');
        if (onSave) onSave();
      } catch (error) {
        setMessage(`Error saving config: ${error}`);
      }
    }
  }, { isActive });
}

// Inner component for raw mode - renders when isRawModeSupported is true
function ConfigMenuWithRawMode({ onClose, onSave }: ConfigMenuProps) {
  const [config, setConfig] = useState<RalphConfig>(() => loadConfig());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useRawModeInput(
    true, config, setConfig, selectedIndex, setSelectedIndex,
    editMode, setEditMode, editValue, setEditValue, message, setMessage,
    onClose, onSave
  );

  return (
    <ConfigMenuUI
      config={config}
      selectedIndex={selectedIndex}
      editMode={editMode}
      editValue={editValue}
      message={message}
    />
  );
}

// Inner component for fallback mode - renders when isRawModeSupported is false
function ConfigMenuWithFallback({ onClose, onSave }: ConfigMenuProps) {
  const [config, setConfig] = useState<RalphConfig>(() => loadConfig());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Fallback for non-raw mode - limited functionality (just close on q/Esc)
  useEffect(() => {
    const handler = (data: Buffer) => {
      const char = data.toString();
      if (char === 'q' || char === '\x1b') {
        onClose();
      }
    };

    if (process.stdin.isTTY) {
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on('data', handler);

      return () => {
        process.stdin.off('data', handler);
        process.stdin.setRawMode?.(false);
      };
    }
  }, [onClose]);

  return (
    <ConfigMenuUI
      config={config}
      selectedIndex={selectedIndex}
      editMode={editMode}
      editValue={editValue}
      message={message}
    />
  );
}

// Shared UI rendering component
function ConfigMenuUI({
  config,
  selectedIndex,
  editMode,
  editValue,
  message,
}: {
  config: RalphConfig;
  selectedIndex: number;
  editMode: boolean;
  editValue: string;
  message: string | null;
}) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Configuration</Text>
      </Box>

      {/* Config items */}
      {CONFIG_ITEMS.map((item, index) => {
        const isSelected = index === selectedIndex;
        const value = item.getValue(config);
        const isEditing = isSelected && editMode;

        return (
          <Box key={item.key} marginBottom={0}>
            <Text color={isSelected ? 'yellow' : 'white'}>
              {isSelected ? '> ' : '  '}
            </Text>
            <Text color={isSelected ? 'yellow' : 'gray'}>{item.label}: </Text>
            {isEditing ? (
              <Box>
                <Text color="green">{editValue}</Text>
                <Text color="cyan">_</Text>
              </Box>
            ) : (
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {value || '(not set)'}
              </Text>
            )}
            {isSelected && item.type === 'select' && !editMode && (
              <Text dimColor> ← →</Text>
            )}
          </Box>
        );
      })}

      {/* Message display */}
      {message && (
        <Box marginTop={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}

      {/* Help text */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          {editMode
            ? 'Type to edit, Enter to confirm'
            : '↑↓ navigate • ← → change value • Enter to edit text • s to save • q/Esc to cancel'}
        </Text>
      </Box>
    </Box>
  );
}

export function ConfigMenu({ onClose, onSave }: ConfigMenuProps) {
  // AIDEV-NOTE: Always use raw mode version since Ink's useInput works
  // (Dashboard's 'c' key opens this menu, proving Ink input is functional)
  // The fallback was too limited (only q/Esc) and caused navigation to break.
  return <ConfigMenuWithRawMode onClose={onClose} onSave={onSave} />;
}
