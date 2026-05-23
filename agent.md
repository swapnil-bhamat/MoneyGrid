# 🧠 Antigravity (PWA Finance Elite SE Agent Context)

This file contains high-fidelity architectural memory and context for pair programming. Always keep it in sync with the codebase state.

## 🏗️ Project Architecture (Flattened & Simplified)
To keep the codebase simple and highly scalable for new developers, we have replaced the dual `domains/` and `shared/` directory hierarchy with a consolidated, clean, role-based architecture. All source files now live directly under well-defined, single-purpose directories in `src/`:

### 🏗️ Architecture Blueprint

```mermaid
flowchart TD
    %% Custom Styles & Classes Definition
    classDef presLayer fill:#e0f2fe,stroke:#0369a1,stroke-width:2px,color:#0369a1,font-weight:bold;
    classDef svcLayer fill:#f0fdf4,stroke:#15803d,stroke-width:2px,color:#15803d,font-weight:bold;
    classDef dbLayer fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#b45309,font-weight:bold;
    classDef extLayer fill:#faf5ff,stroke:#6b21a8,stroke-width:2px,color:#6b21a8,font-weight:bold;
    classDef userNode fill:#fff,stroke:#1e293b,stroke-width:2px,color:#1e293b,font-weight:bold;

    User((👤 Active User)):::userNode

    subgraph Presentation["🌐 PRESENTATION LAYER (React 19)"]
        UI[App Shell Layout / Sidebar Nav]:::presLayer
        AIChat[Gemini Advisor Chat Panel]:::presLayer
        Pages["🗂️ Route Page Views (Flat Pages)
        • Analytics (Dashboard, FIRE, SWP)
        • Accounts (Holdings, Portfolio, REITs)
        • Transactions (Income, Upcoming, Insurance)
        • Budgets, Backups, Auth, Shared"]:::presLayer
    end

    subgraph Services["⚙️ BUSINESS & LOGIC SERVICES (Core Layer)"]
        HistoryService[History Service: Multi-level Session Undo/Redo]:::svcLayer
        BackupService[Drive Backup Service: Incremental Cloud Sync]:::svcLayer
        CryptoService[Crypto Service: AES-256-GCM Web Crypto Security]:::svcLayer
        MarketService[Market Data Service: Commodity Rates Cache]:::svcLayer
        GeminiService[Gemini Assistant Service: Prompt Engineering]:::svcLayer
    end

    subgraph Persistence["💾 LOCAL STORAGE & PERSISTENCE (Offline-First)"]
        DexieDB[("Dexie.js IndexedDB
        • 19 Versioned Tables
        • Schema Migrations v12")]:::dbLayer
        LocalStorage[("Browser LocalStorage
        • Theme preference cache
        • daily commodity rates")]:::dbLayer
    end

    subgraph Cloud["☁️ SECURE CLOUD SERVICES (External)"]
        GDrive["Google Drive API
        • AppData Folder Storage
        • OAuth Client Access"]:::extLayer
        GeminiAPI["Google Gemini API
        • Generative AI Models
        • JSON Schema Responses"]:::extLayer
        GoldAPI["GoldAPI.io
        • Indian/International Rates
        • Cached Responses"]:::extLayer
    end

    %% Flow lines mapping
    User <-->|Interacts| UI
    UI <-->|Navigates| Pages
    UI <-->|Consults| AIChat

    %% Page actions calling Services
    Pages -->|History state| HistoryService
    Pages -->|Real-time rates| MarketService
    Pages -->|Settings / Sync| BackupService
    AIChat -->|Conversations| GeminiService

    %% Service connections to Persistence
    HistoryService <-->|Undo/Redo Stack| DexieDB
    MarketService <-->|Rates cache lookup| LocalStorage
    BackupService <-->|Query and merge| DexieDB
    BackupService -.->|Encrypt oauth keys| CryptoService
    GeminiService -.->|Safe read-only context| DexieDB

    %% Crypto security bindings
    CryptoService <-->|Secure credentials storage| DexieDB

    %% Cloud triggers
    BackupService <-->|Incremental backup sync| GDrive
    GeminiService <-->|Context-enriched analysis| GeminiAPI
    MarketService <-->|Fetch fresh commodity rates| GoldAPI
```

### 📂 Directory Mapping

- `src/app/`: Root application bootstrappers, providers, central routing configurations (`App.tsx`, `main.tsx`), and core integration tests (`__tests__/`).
- `src/components/`: Reusable stand-alone UI elements and visual blocks, grouped logically by domain focus:
  - `common/`: Shared generic components (e.g., inputs, selectors, tables, confirmation modals, gauges, `CustomPieChart.tsx`).
  - `layout/`: Shell layout templates, error boundaries, core navigation bars, and undo/redo controls (`Layout.tsx`, `BasePage.tsx`).
  - `widgets/`: Dynamic standalone card widgets (e.g., gold rate calculator, gold rates widget, daily tips card).
  - `analytics/`, `backups/`, `budgets/`, `accounts/`, `auth/`, `ai/`: Cohesive components specific to these functional areas.
- `src/contexts/`: Shared React state providers (e.g., `themeContext.tsx`, `authContext.ts`, `bioLockContext.tsx`, `DashboardDataContext.tsx`).
- `src/data/`: Domain-agnostic static data files and mathematical constants (e.g., `financialTips.ts`, `reitData.ts`).
- `src/hooks/`: Shareable custom React hooks (e.g., `useMobile.ts`, `useUndoRedo.ts`, `useAuth.ts`, `useDashboardData.ts`).
- `src/infrastructure/`: Low-level services and configurations:
  - `db/`: Core IndexedDB definition, Dexie initialization, typescript definitions, and database migrations (`db.ts`, `db.types.ts`, `dbMigrations.ts`).
  - `crypto/`: Cryptographic Web Crypto API wrapper for biometric key derivation and local api credentials encryption.
- `src/pages/`: Page views representing route endpoints, flat and simple to find:
  - `analytics/`: Financial dashboard, FIRE page, asset projections, tools overview, and systematic withdrawal page (`SwpPage`).
  - `accounts/`: Portfolios, holdings, bank accounts, holders, asset classes, and REITs.
  - `transactions/`: Income flows, cash flow merging, upcoming expenses, insurances, and configuration types pages.
  - `budgets/`: Goals tracking and monthly category budget cards.
  - `backups/`: Google Drive sync panel, debug logs console, and DB query builder.
  - `auth/`: Login/Credential lock portal.
  - `shared/`: Generic core pages (e.g., about page, finance guidelines).
- `src/service-worker/`: PWA service worker configurations, Workbox cache layer, and registrations.
- `src/services/`: Shared business, networking, or cloud services (e.g., Google Drive client, Gemini API, Gold API cache, logging).
- `src/styles/`: Bootstrap overrides, CSS variables, and Sass modules (`main.scss`).
- `src/types/`: Centralized interface models (e.g., UI columns, custom type defs).
- `src/utils/`: Pure utilities (e.g., encryption helpers, Indian-to-international gold converter, number formatting, notification banners).

## 💾 Data Schema (Dexie.js)
The app uses IndexedDB via Dexie.js (Current Schema Version: **12**). Key tables and their purposes:
- `configs`: Encrypted local settings (API keys, theme choices, biometric keys, cloud status).
- `assetPurposes`: Asset purpose categories linked to goals.
- `loanTypes`: Predefined loan options with default interest rates.
- `assets`: User asset entries (amounts, categories, links to institutions).
- `liabilities`: User liabilities entries (interest rates, balances).
- `assetClasses`: Core asset groups (e.g., Equity, Debt, Cash).
- `assetSubClasses`: Subcategories (e.g., Mutual Funds, EPF, Gold).
- `sipTypes`: Systematic Investment Plan schedules.
- `sipHoldings`: Active monthly SIP contributions.
- `upcomingExpenses`: Recurring or future planned purchases.
- `insurances`: General and health insurance policies.
- `insuranceTypes`: Policies category definitions.
- `holders`: Registered wealth holder accounts.
- `buckets`: Envelope-method category allocation buckets.
- `goals`: Targeted financial milestones (e.g., lean-FIRE, house downpayment).
- `goalsBuckets`: Intersection mappings for budget allocations.
- `accounts`: Financial account containers.
- `reits`: Real Estate Investment Trusts with yields and holdings.
- `history`: Session-based operations queue supporting multi-level undo/redo operations.

## 🔐 Authentication & Security Flow
1. **Local Authentication (`BioLockProvider`)**:
   - Integrates biometrics/WebAuthn where possible, falling back to secure password configuration.
   - Encapsulates locks dynamically over core layout rendering when key configurations exist.
2. **Secrets Encryption (`src/utils/encryption.ts`)**:
   - Encrypts third-party config credentials (e.g., `GOLD_API_KEY`, Google Drive oauth tokens) inside IndexedDB using a derived key.
   - Utilizes PBKDF2 for key derivation and AES-256-GCM from Web Crypto API for secure hardware-accelerated encryption.

## 🔌 Core Integrations
- **Google Drive API**: Client-side versioned backup flow, performing automated background incremental JSON synchronization.
- **Gemini API**: Conversational financial advisor. Analyzes user net-worth breakdown, cash flow diagrams, and budget goals, delivering clean contextual text advice.
- **GoldAPI**: Real-time commodity updates for Indian and international rates (gold/silver) cached in `localStorage` for 24 hours.

## 🧪 Testing Suite Status
- **Test Command**: `npx vitest run` or `npm run test`
- **Current Health**: All 5 test suites containing 18 unit/integration tests are passing successfully.
- **Key Practices**: When updating components that trigger DB writes or auth actions, always wrap state transitions in React `act(...)`.
