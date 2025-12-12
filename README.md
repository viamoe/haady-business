# Haady Business Platform

A Next.js-based business management platform for merchants, built with Supabase, TypeScript, and modern web technologies.

## Features

- 🔐 **Authentication**: OAuth (Google) and OTP email authentication
- 🌍 **Internationalization**: Multi-language support (English/Arabic) with RTL support
- 🏢 **Business Management**: Merchant onboarding, store management, and business setup
- 🍪 **Cookie System**: Comprehensive cookie system for enhanced UX
- 🌐 **Public APIs**: Public endpoints for country data and other resources
- 📱 **Responsive Design**: Mobile-first responsive UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account and project

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Development

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Database Migrations

```bash
# Push migrations to Supabase
supabase db push
```

## Documentation

### Core Features

- [Cookie System](./docs/cookies-system.md) - Comprehensive cookie system for UX enhancements
- [Countries API](./docs/api/countries-api.md) - Public API for country data
- [Database Schema](./docs/database/) - Database documentation and migrations

### Database

- [Merchants Country Foreign Key](./docs/database/merchants-country-foreign-key.md) - Country reference implementation
- [Merchant Onboarding](./docs/database/create_merchant_onboarding.md) - Business setup flow
- [Cascade Relationships](./docs/database/cascade-relationships.md) - Database relationships

### Setup & Configuration

- [Supabase OAuth Config](./docs/setup/supabase-oauth-config.md) - OAuth setup guide
- [Zid Integration](./docs/integrations/zid-integration.md) - Zid platform integration

## Key Technologies

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Shadcn UI
- **Internationalization**: next-intl
- **Type Safety**: TypeScript

## Project Structure

```
haady-business/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── setup/             # Business setup flow
│   ├── dashboard/         # Dashboard pages
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── cookies.ts        # Cookie management
│   ├── supabase/         # Supabase clients
│   └── localized-url.ts  # URL localization
├── docs/                  # Documentation
├── supabase/
│   └── migrations/       # Database migrations
└── i18n/                 # Internationalization
```

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=your_site_url
```

## Default Settings

- **Default Country**: Saudi Arabia (SA)
- **Default Language**: English (en)
- **Default Locale**: en-SA

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

[Your License Here]
