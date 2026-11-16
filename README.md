# Vivekam

**Vivekam** is a full-stack slash-command prompt-engineering studio and online deal-check companion built for **ChatGPT, Claude, and Gemini**, with first-class support for **English, Malayalam (`മലയാളം`), and Manglish**.

Instead of rewriting long instructions every time you open an AI chat, append a short slash command such as `/redteam`, `/ELI5`, or `/realitycheck` to shift how an AI responds—clearer, blunter, shorter, more technical, or skeptical of inflated sale discounts. You can launch prompts straight into **ChatGPT** with one click, generate **Always-On** custom instructions for ChatGPT, Claude, and Gemini, or evaluate and refine prompts locally and via server-proxied **Gemini** studios.

---

## Key Features

### 1. Explore Hub (Dual Mode: Normal Commands & Sales Deal Check)
- **Normal Commands Playbook**
  - Interactive quick-start walkthrough (ask → append `/command` → stack commands like `/brutal /no-fluff`).
  - One-click **Try `/redteam` in ChatGPT** launch (`https://chatgpt.com/?q=...`).
  - **Make Them Always Work** setup generator with Compact instructions, one-click Copy, and platform setup steps for **ChatGPT** (Custom Instructions), **Claude** (Personal Preferences / Project Instructions), and **Gemini** (Saved Info).
  - Malayalam (`മലയാളം`) explanatory notes throughout.
- **Sales & Deal Check Playbook**
  - Step-by-step guide for auditing online sale screenshots in a **fresh chat** so the AI does not anchor on earlier answers.
  - Real-world **Side-by-Side Test** comparing a plain `"is it a good deal?"` prompt against `/realitycheck` on an Amazon sale listing (`iQOO Z11x 5G`).
  - Dedicated **7 Sales & Deals commands** with instant **Copy** and **Try** in ChatGPT buttons.
  - Copyable **The Deal Check Prompt** template (checks launch price, inflated MRP, coupon/bank/exchange traps, variant mismatch, and 2 better alternatives) with one-click **Try in ChatGPT**.
  - 4-point **Check Before You Pay** checklist (`Variant`, `Small print`, `Launch price`, `Return window`).
- **Live Prompt Expansion Preview**
  - Type any prompt with slash commands, detect command conflicts automatically (e.g., `/ELI5` vs `/deepdive`), estimate token footprint, inspect the compiled system directive, and launch directly in ChatGPT.

### 2. Command Library (55 Built-in Commands Across 7 Groups)
- Browse all **55 commands** across **7 groups** (`Learn & Understand`, `Honest Feedback`, `Coding`, `Business & Career`, `Writing & Content`, `Decisions & Planning`, and `Sales & Deals`) plus **All**, **Favorites**, and **Custom** views.
- **Clean Collapsible Cards**: Collapsed cards display only the slash command, title, short description, favorite star toggle, and an accessible expand dropdown button. Expanding a card reveals:
  - Usage example
  - Malayalam note
  - Group & tag metadata (with *Tuned* / *Custom* badges)
  - **Copy** command button
  - **Try** button (launches ChatGPT pre-filled with the command example)
  - **Tune Directive** modal to override any built-in directive locally or reset to defaults
- **Search & Filter**: Filter instantaneously by `/slash`, label, description, tag, or Malayalam note, and narrow by clickable tag pills.

### 3. Honest Feedback Studio (AI Stress-Test & 3×3 Risk Heatmap)
- Evaluate startup ideas, resumes, landing pages, code plans, or scripts through **6 critical lenses**: `/brutal`, `/redteam`, `/devilsadvocate`, `/realitycheck`, `/steelman`, and `/challenge`.
- Calls Gemini structured JSON output (`/api/gemini/json`) to render:
  - Overall **Verdict** and **Confidence Score**
  - Interactive **3×3 Severity × Likelihood Risk Heatmap** detailing hidden costs, operational risks, and mitigations
  - **Hidden Assumptions**, **What Is Actually Good**, and prioritized **Next Steps**
- **Save** full reports to *My Library* or **Open in ChatGPT** with one click.

### 4. Prompt Builder (Structured Templates + Variables + AI Polish)
- Compose structured prompts cleanly with separate fields for **Role**, **Context**, **Task**, **Constraints**, **Output Format**, **Tone**, and **Examples**.
- **6 Built-in Templates**: *Launch Plan Audit*, *Bug Root-Cause Investigation*, *Clear Client Email Rewrite*, *Malayalam + English Learning Guide*, *Architecture Decision Record*, and *Sale Deal Check (Before You Buy)*.
- **Dynamic `{{variable}}` Detection**: Automatically detects placeholders like `{{product_and_price}}` or `{{error_or_stack}}` and provides a quick Fill Variables modal before copying or launching.
- **Improve with AI**: Sends your draft to Gemini (`/api/gemini/json`) to tighten clarity, constraints, and formatting, plus real-time token estimation and ChatGPT launch.

### 5. Prompt Analyzer (6-Dimension Scoring & Diff View)
- Paste any draft prompt to score it **0–10** across **6 criteria**:
  - `Clarity`, `Context`, `Specificity`, `Constraints`, `Output Format`, and `Safety`
- Highlights severity-tagged issues (`Critical`, `Warning`, `Suggestion`), recommends **1–3 Vivekam slash commands**, and generates a **rewritten improved prompt** with a **line-by-line visual diff**, **Use in Builder**, **Copy**, and **Open in ChatGPT** actions.

### 6. Always-On Setup & Live Test Sandbox
- Enable/disable commands individually or by group (including custom commands) to compile custom instructions in **Compact** (char-budget friendly) or **Detailed** mode, with live character and token counters.
- Includes one-click platform instructions for ChatGPT, Claude, and Gemini.
- **Test It Sandbox**: Streams live responses over Server-Sent Events (`/api/gemini/stream`) using your active compiled instructions so you can verify command behavior before pasting it into external AI settings.

### 7. Custom Command Creator
- Create custom `/slug` commands with group assignment, label, Malayalam explanation note, short description, system directive, usage example, and **Conflicts With** rules across all unique built-in slashes.
- Includes a live **Expansion Preview**, quick **Try in ChatGPT**, and full persistence/management.

### 8. My Library (Local Persistence & JSON Backup)
- Manage saved prompts, Studio answers, pinned items, favorites, and custom commands stored locally in browser `localStorage` (with versioned schema migration).
- **Export Backup (.json)** and **Import Backup (.json)** for portable, zero-account backup and restore.

### 9. Settings, Navigation & Accessibility
- **Collapsible Desktop Sidebar** (`vivekam_sidebar_collapsed` persisted) + responsive mobile bottom navigation bar & drawer.
- **Model & Reasoning Controls**: Select `gemini-4-hydrogen` (default fast), `gemini-3.1-flash-lite`, `gemini-4-argon`, or `gemini-4-carbon`, configure **Thinking Level** (`LOW` / `MEDIUM` / `HIGH`), max output tokens, context history window, and **Default Commands** appended automatically to generic ChatGPT launches.
- **Appearance & Localization**: Light, Dark, and System themes, custom slim themed scrollbars across light/dark surfaces, **English / മലയാളം** UI label toggle, and **Reduce Motion** accessibility switch.
- **Help & FAQ**: Expandable guide covering pricing, Malayalam/Manglish accuracy, URL/safety boundaries, command conflicts, plus a local feedback & JSON export form.
- **SEO & Branding**: Custom obsidian-and-amber SVG favicon (`/public/favicon.svg`), dynamic canonical URLs, Open Graph banner, Twitter card tags, and `WebApplication` Schema.org JSON-LD metadata.

---

## Command Registry Overview (55 Commands / 7 Groups)

| Group | Count | Commands |
| :--- | :---: | :--- |
| **Learn & Understand** | 8 | `/ELI5`, `/ELI10`, `/TLDR`, `/deepdive`, `/examples`, `/analogy`, `/stepbystep`, `/beginner` |
| **Honest Feedback** | 8 | `/brutal`, `/devilsadvocate`, `/challenge`, `/pros-cons`, `/redteam`, `/realitycheck`, `/steelman`, `/no-fluff` |
| **Coding** | 8 | `/debug`, `/code-review`, `/optimize`, `/explain-code`, `/test-cases`, `/edge-cases`, `/senior-engineer`, `/security-review` |
| **Business & Career** | 8 | `/startup-mode`, `/business-plan`, `/validate-idea`, `/ROI`, `/career-coach`, `/interview-mode`, `/prioritize`, `/opportunity-cost` |
| **Writing & Content** | 8 | `/rewrite`, `/professional`, `/casual`, `/persuasive`, `/shorten`, `/humanize`, `/hooks`, `/viral` |
| **Decisions & Planning** | 8 | `/decision`, `/checklist`, `/action-plan`, `/80-20`, `/priorities`, `/what-if`, `/second-opinion`, `/coach-me` |
| **Sales & Deals** | 7 | `/realitycheck`, `/pros-cons`, `/decision`, `/second-opinion`, `/redteam`, `/no-fluff`, `/opportunity-cost` *(sale & buyer-audit directives)* |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand (`5.x`), `lucide-react`, `motion`, `marked`, `dompurify`, `highlight.js`
- **Backend Proxy**: Express 4 (`server.ts`) running Vite middleware in development and static `dist/` in production on port `3000`
- **AI SDK**: `@google/genai` (server-side proxy only—API keys are never exposed to the browser)
- **Testing**: Vitest (`vitest run`)

---

## Project Structure

```text
.
├── index.html                  # Document title, Open Graph, Twitter, JSON-LD & favicon links
├── package.json                # Scripts (dev, build, start, lint, test) & dependencies
├── server.ts                   # Express server + Vite SSR/SPA middleware + /api/gemini/* routes
├── vite.config.ts              # Vite + React + Tailwind v4 configuration
├── .env.example                # Environment variable template (GEMINI_API_KEY, APP_URL)
├── public/
│   └── favicon.svg             # Obsidian & amber </ > brand icon
└── src/
    ├── App.tsx                 # Root router shell, theme & reduce-motion sync
    ├── main.tsx                # React mount & dynamic canonical / og:url injector
    ├── index.css               # Tailwind import & light/dark slim scrollbar theme tokens
    ├── components/
    │   ├── AppShell.tsx        # Collapsible sidebar, header ChatGPT launcher & mobile drawer
    │   ├── CommandChipButton.tsx
    │   ├── ErrorBoundary.tsx
    │   ├── MarkdownRenderer.tsx # Sanitized Markdown + syntax-highlighted code blocks
    │   └── ToastContainer.tsx
    ├── data/
    │   ├── commands.ts         # 55 built-in commands across 7 groups & DEAL_CHECK_PROMPT
    │   └── templates.ts        # 6 Prompt Builder starter templates
    ├── features/
    │   ├── AlwaysOnSetup.tsx
    │   ├── CommandLibrary.tsx
    │   ├── CustomCommandCreator.tsx
    │   ├── HelpFaq.tsx
    │   ├── HomeExplore.tsx
    │   ├── HonestFeedbackStudio.tsx
    │   ├── MyLibrary.tsx
    │   ├── PromptAnalyzer.tsx
    │   ├── PromptBuilder.tsx
    │   └── SettingsScreen.tsx
    ├── hooks/                  # Custom UI hooks (e.g. copy-to-clipboard)
    ├── lib/
    │   ├── __tests__/          # Vitest suite (commandEngine.test.ts)
    │   ├── chatgpt.ts          # ChatGPT URL builder & tab launcher
    │   ├── commandEngine.ts    # Slash parser, conflict detection, Always-On compiler & token estimator
    │   ├── gemini.ts           # SSE stream & JSON client helpers
    │   ├── schemas.ts          # Structured response schemas for Studios
    │   └── storage.ts          # Versioned localStorage persistence & backup JSON validation
    ├── store/
    │   └── useAppStore.ts      # Zustand application store
    └── types/
        └── index.ts            # Shared TypeScript interfaces
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (or compatible LTS runtime)
- A Google Gemini API key (only needed for the AI-powered Studios and live Test Sandbox; Explore, Command Library, ChatGPT launches, and Always-On Setup generation work completely client-side).

### Environment Variables
Copy `.env.example` to `.env` and configure:

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

> **Security Note**: `GEMINI_API_KEY` is read exclusively by `server.ts` on the server and is never bundled into client assets.

### Install & Run

```bash
# Install dependencies
npm install

# Start development server (Express + Vite middleware on port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser.

### Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs `server.ts` via `tsx` with live Vite middleware on port `3000` |
| `npm run build` | Builds the production Vite bundle into `dist/` |
| `npm start` | Starts the production Express server serving `dist/` on port `3000` |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |
| `npm test` | Executes the Vitest unit test suite (`vitest run`) |
| `npm run clean` | Removes `dist/` build artifacts |

---

## Server API Endpoints

| Method & Path | Description |
| :--- | :--- |
| `GET /api/health` | Returns server readiness and whether `GEMINI_API_KEY` is configured |
| `POST /api/gemini/stream` | Streams SSE text chunks (`data: {"text": "..."}`) with model, system instruction, thinking level, and safety error classification |
| `POST /api/gemini/json` | Generates schema-validated JSON (`responseMimeType: application/json`) for Honest Feedback Studio, Prompt Builder improvement, and Prompt Analyzer |

---

## Accuracy & Usage Note

Slash commands instruct an AI **how** to reason, structure, and critique—such as requesting blunt feedback, edge cases, or skeptical deal checks. They do **not** guarantee real-time factual pricing or stock availability: when evaluating screenshots of online sales, always verify variant specs (RAM/storage/color), bank card or coupon fine print, historical launch price, and seller return policies directly on the store page before paying.
