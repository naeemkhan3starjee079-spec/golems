#!/usr/bin/env bun
/**
 * Test that Ralph advances to next pending story after auto-block
 */

import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { runSingleIteration, createConfig } from './ralph-ui/src/runner/index.ts';

const testDir = '/tmp/test-ralph-advance';

// Setup test directory
function setup() {
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, 'stories'), { recursive: true });

  // Create index with blocked story first in pending
  const index = {
    nextStory: 'BLOCKED-001',
    pending: ['BLOCKED-001', 'GOOD-001'],
    blocked: [],
    completed: [],
    storyOrder: ['BLOCKED-001', 'GOOD-001']
  };
  writeFileSync(join(testDir, 'index.json'), JSON.stringify(index, null, 2));

  // Create blocked story (has blockedBy but in pending array)
  const blockedStory = {
    id: 'BLOCKED-001',
    title: 'Blocked story',
    blockedBy: 'Missing dependency',
    acceptanceCriteria: [
      { text: 'Should not run', checked: false }
    ],
    passes: false
  };
  writeFileSync(join(testDir, 'stories', 'BLOCKED-001.json'), JSON.stringify(blockedStory, null, 2));

  // Create good story
  const goodStory = {
    id: 'GOOD-001',
    title: 'Good story',
    acceptanceCriteria: [
      { text: 'Should run next', checked: false }
    ],
    passes: false
  };
  writeFileSync(join(testDir, 'stories', 'GOOD-001.json'), JSON.stringify(goodStory, null, 2));
}

// Test Ralph iteration behavior
async function testRalphAdvance() {
  console.log('Testing Ralph advance after auto-block...');
  
  const config = createConfig({
    prdJsonDir: testDir,
    workingDir: testDir,
    iterations: 1,
    model: 'haiku',
    quiet: true
  });
  
  // Run iteration - should auto-block BLOCKED-001 and return blocked result
  const result = await runSingleIteration(config, 1);
  
  console.log('Iteration result:', {
    storyId: result.storyId,
    success: result.success,
    hasBlocked: result.hasBlocked,
    error: result.error
  });
  
  // Verify the blocked story was handled correctly
  if (result.storyId !== 'BLOCKED-001') {
    throw new Error(`Expected storyId BLOCKED-001, got ${result.storyId}`);
  }
  if (!result.hasBlocked) {
    throw new Error('Expected hasBlocked to be true');
  }
  if (!result.error?.includes('Missing dependency')) {
    throw new Error('Expected error to mention blocking reason');
  }
  
  // Verify that Ralph advanced to the next story by checking the index
  const { readIndex } = await import('./ralph-ui/src/runner/prd.ts');
  const updatedIndex = readIndex(testDir);
  
  if (updatedIndex.nextStory !== 'GOOD-001') {
    throw new Error(`Expected nextStory to be GOOD-001, got ${updatedIndex.nextStory}`);
  }
  if (updatedIndex.pending.includes('BLOCKED-001')) {
    throw new Error('BLOCKED-001 should be removed from pending');
  }
  if (!updatedIndex.blocked.includes('BLOCKED-001')) {
    throw new Error('BLOCKED-001 should be added to blocked');
  }
  
  console.log('✅ Ralph advance test passed');
}

// Run test
try {
  setup();
  await testRalphAdvance();
  console.log('🎉 Ralph advance test completed!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup
  rmSync(testDir, { recursive: true, force: true });
}
