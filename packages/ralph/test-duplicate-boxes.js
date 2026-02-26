#!/usr/bin/env node

/**
 * Test script to simulate rapid error iterations and verify no duplicate empty boxes
 * This simulates the scenario described in BUG-004
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create a temporary status file to simulate rapid updates
const statusFile = '/tmp/ralph-status-test.json';

function writeStatus(iteration, error = null, retryIn = 0) {
  const status = {
    state: error ? 'retry' : 'running',
    iteration,
    storyId: 'BUG-004',
    model: 'kiro',
    startTime: Date.now() - 10000, // 10 seconds ago
    lastActivity: Math.floor(Date.now() / 1000),
    error,
    retryIn,
    pid: process.pid,
  };
  
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
}

async function simulateErrorLoop() {
  console.log('🧪 Testing duplicate box renders during error loop...');
  
  // Simulate 5 rapid error iterations
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Iteration ${i} ---`);
    
    // Write running state
    writeStatus(i);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Write error state
    writeStatus(i, `Simulated error ${i}`, 3);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Write retry state
    writeStatus(i, `Simulated error ${i}`, 2);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    writeStatus(i, `Simulated error ${i}`, 1);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Clean up
  if (fs.existsSync(statusFile)) {
    fs.unlinkSync(statusFile);
  }
  
  console.log('\n✅ Test completed - check terminal output for duplicate boxes');
  console.log('Expected: No duplicate empty ╭───╮ borders');
  console.log('If you see many empty boxes stacked, the bug is still present');
}

// Run the test
simulateErrorLoop().catch(console.error);
