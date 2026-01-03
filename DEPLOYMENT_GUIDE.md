# Production Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] **Build Success** - Production build completed successfully
- [x] **Database Indexes** - All performance indexes applied
- [x] **TypeScript Errors** - All type errors fixed
- [x] **Tests Passing** - All tests pass (42/42)

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

#### Initial Setup
```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd haady-business
vercel --prod
```

#### Environment Variables
Make sure these are set in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Any other required environment variables

#### Continuous Deployment
If connected to GitHub:
1. Push to `main` branch
2. Vercel automatically deploys
3. Preview deployments for PRs

### Option 2: Manual Build & Deploy

#### Build for Production
```bash
cd haady-business
pnpm build
```

#### Start Production Server
```bash
pnpm start
```

#### Using PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start pnpm --name "haady-business" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 3: Docker Deployment

#### Create Dockerfile
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Build & Run Docker
```bash
docker build -t haady-business .
docker run -p 3000:3000 haady-business
```

## Post-Deployment Steps

### 1. Verify Database Indexes
```sql
-- Check indexes are in place
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('products', 'orders', 'stores')
ORDER BY tablename;
```

### 2. Test Critical Paths
- [ ] Dashboard loads quickly (< 1s)
- [ ] Products page loads quickly (< 500ms)
- [ ] Search functionality works
- [ ] Product creation/editing works
- [ ] Image uploads work
- [ ] Authentication works

### 3. Monitor Performance
- Check Vercel Analytics (if using Vercel)
- Monitor Supabase dashboard for query performance
- Check error logs
- Monitor API response times

### 4. Set Up Monitoring
- **Error Tracking**: Sentry, LogRocket, or similar
- **Performance**: Vercel Analytics, New Relic, or similar
- **Uptime**: UptimeRobot, Pingdom, or similar

## Environment Variables Checklist

### Required Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## Performance Optimizations Applied

✅ **Database Indexes** - 30+ indexes for maximum query performance
✅ **Query Optimization** - Parallel queries, reduced sequential queries
✅ **Caching** - 60-second revalidation for dashboard
✅ **Code Splitting** - Automatic with Next.js
✅ **Image Optimization** - Next.js Image component

## Rollback Plan

If deployment fails:

1. **Vercel**: Use deployment history to rollback
2. **Manual**: Revert to previous commit and redeploy
3. **Database**: Indexes are safe (IF NOT EXISTS)

## Support

If you encounter issues:
1. Check build logs
2. Check runtime logs
3. Verify environment variables
4. Check database connectivity
5. Review error tracking

## Next Steps After Deployment

1. ✅ Monitor performance metrics
2. ✅ Set up error tracking
3. ✅ Configure CDN (if not using Vercel)
4. ✅ Set up SSL certificate (if not using Vercel)
5. ✅ Configure domain name
6. ✅ Set up backups

