# Deploy to Railway

Deploy the cloud worker to Railway.

1. Run tests: `bun test` from monorepo root
2. If tests pass, push current branch to remote
3. Use `railway up` to deploy to production
4. Wait for deployment, check health endpoint
5. Verify: `curl https://golems-production.up.railway.app/`
6. Show deployment status and any errors
