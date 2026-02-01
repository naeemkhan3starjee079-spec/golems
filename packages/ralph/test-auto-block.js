#!/usr/bin/env bun
/**
 * Test for BUG-003: Auto-block stories with blockedBy field mismatch
 */

import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { autoBlockStoryIfNeeded, readIndex, getNextStory } from './ralph-ui/src/runner/prd.ts';

const testDir = '/tmp/test-auto-block';

// Setup test directory
function setup() {
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, 'stories'), { recursive: true });

  // Create index with story in pending array
  const index = {
    nextStory: 'TEST-001',
    pending: ['TEST-001', 'TEST-002'],
    blocked: [],
    completed: [],
    storyOrder: ['TEST-001', 'TEST-002']
  };
  writeFileSync(join(testDir, 'index.json'), JSON.stringify(index, null, 2));

  // Create story with blockedBy field
  const story = {
    id: 'TEST-001',
    title: 'Test story',
    blockedBy: 'Missing API key',
    acceptanceCriteria: [
      { text: 'Test criterion', checked: false }
    ],
    passes: false
  };
  writeFileSync(join(testDir, 'stories', 'TEST-001.json'), JSON.stringify(story, null, 2));

  // Create second story without blockedBy
  const story2 = {
    id: 'TEST-002',
    title: 'Second story',
    acceptanceCriteria: [
      { text: 'Test criterion', checked: false }
    ],
    passes: false
  };
  writeFileSync(join(testDir, 'stories', 'TEST-002.json'), JSON.stringify(story2, null, 2));
}

// Test auto-block functionality
function testAutoBlock() {
  console.log('Testing auto-block functionality...');
  
  // Before: story should be in pending
  let index = readIndex(testDir);
  console.log('Before - pending:', index.pending);
  console.log('Before - blocked:', index.blocked);
  console.log('Before - nextStory:', index.nextStory);
  
  // Call autoBlockStoryIfNeeded
  const wasBlocked = autoBlockStoryIfNeeded(testDir, 'TEST-001');
  console.log('Auto-block result:', wasBlocked);
  
  // After: story should be moved to blocked
  index = readIndex(testDir);
  console.log('After - pending:', index.pending);
  console.log('After - blocked:', index.blocked);
  console.log('After - nextStory:', index.nextStory);
  
  // Verify results
  if (!wasBlocked) {
    throw new Error('Expected story to be auto-blocked');
  }
  if (index.pending.includes('TEST-001')) {
    throw new Error('Story should be removed from pending');
  }
  if (!index.blocked.includes('TEST-001')) {
    throw new Error('Story should be added to blocked');
  }
  if (index.nextStory !== 'TEST-002') {
    throw new Error('nextStory should advance to TEST-002');
  }
  
  console.log('✅ Auto-block test passed');
}

// Test that Ralph advances to next story
function testAdvanceToNext() {
  console.log('Testing advance to next story...');
  
  const nextStory = getNextStory(testDir);
  console.log('Next story:', nextStory?.id);
  
  if (!nextStory || nextStory.id !== 'TEST-002') {
    throw new Error('Expected next story to be TEST-002');
  }
  if (nextStory.blockedBy) {
    throw new Error('Next story should not be blocked');
  }
  
  console.log('✅ Advance to next test passed');
}

// Run tests
try {
  setup();
  testAutoBlock();
  testAdvanceToNext();
  console.log('🎉 All tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
}
