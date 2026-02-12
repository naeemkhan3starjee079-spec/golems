# Background Task Safety Rules

## NEVER Stack Background Sleep Tasks

**What happens:** Multiple `Bash(sleep N, run_in_background: true)` tasks pile up. When compaction modifies thinking blocks, ALL pending background tasks fail with `thinking blocks cannot be modified` 400 errors, crashing the session.

**Rules:**
1. **MAX 1 background sleep task at any time.** Never queue more.
2. For long-running commands: run in background, check output file with `Read` when ready. Don't spawn poll timers alongside.
3. **Never** `sleep N && cat file` as a polling mechanism — just do other work and `Read` the file later.
4. For benchmarks/builds: `Bash(command > /tmp/output.txt 2>&1, run_in_background: true)` then `Read(/tmp/output.txt)` when you're ready to check.
5. If a background task is already running, do NOT launch another. Wait or do something else.
