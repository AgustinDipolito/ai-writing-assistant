# Experimental Built-in Actions
## High-Value Use Cases for AI Writing Assistant

**Document Version:** 1.0  
**Last Updated:** April 27, 2026  
**Purpose:** Define next-generation built-in actions to expand TAM and increase engagement

---

## Overview

The current built-in actions (Grammar, Style, Synonyms, Generate Image) serve basic text improvement needs. To drive 10x user engagement and unlock new user segments, we need **vertical-specific** and **workflow-centric** actions that solve complete user problems, not just text polishing.

**Design Principles:**
1. **Job-to-be-done focus** — Each action solves a specific user workflow (e.g., "Research this topic" vs. generic "Improve text")
2. **Page-aware by default** — Use visible page content as context automatically
3. **Multi-step workflows** — Chain multiple LLM calls to deliver complete solutions
4. **Vertical-specific** — Optimize for high-value segments (content creators, students, sales, developers)
5. **Differentiated from ChatGPT** — Leverage browser integration, not just prompting

---

## Category 1: Content Research & Analysis (Target: Sarah — Content Creator)

### 1.1 — 🔍 Research & Summarize Topic

**Icon:** `🔍` (magnifying glass)

**User Story:**  
As a content creator, I want to quickly understand a topic by reading multiple sources, so I can write informed articles without spending hours on research.

**Workflow:**
1. User selects topic keyword (e.g., "AI agent frameworks")
2. Extension searches top 5 results (via Google Custom Search API or page-aware reading of current SERP)
3. Extracts key points from each article (page-aware context)
4. Synthesizes findings into structured summary:
   - **Overview** (3-4 sentences)
   - **Key Concepts** (bullet list)
   - **Common Arguments** (pros/cons)
   - **Emerging Trends**
   - **Citations** (title + URL for each source)

**Prompt Template:**
```
You are a research analyst. I'm writing an article about "{{TOPIC}}".

Based on the current page content and the following sources, provide:
1. A concise overview (3-4 sentences)
2. 5-7 key concepts or findings
3. Common arguments (pros and cons)
4. Emerging trends or debates
5. Citations (article titles + URLs)

Sources:
{{PAGE_CONTENT}}

Format as structured markdown with clear sections.
```

**Success Metrics:**
- Saves 30-60 minutes per article research phase
- Increases retention among content creators by 40%
- Premium feature (requires unlimited requests)

**Technical Requirements:**
- Page-aware context injection (read visible article)
- Multi-page support (read 3-5 tabs simultaneously)
- Citation extraction from URLs

---

### 1.2 — 📊 Extract Structured Data

**Icon:** `📊` (bar chart)

**User Story:**  
As a researcher/analyst, I want to convert unstructured text (articles, PDFs) into structured data (tables, JSON), so I can analyze trends and compare findings.

**Workflow:**
1. User selects text or entire page
2. AI identifies entities, dates, numbers, categories
3. Outputs as markdown table, CSV, or JSON

**Example Use Cases:**
- Extract product pricing from competitor websites → comparison table
- Extract event details (date, time, location, speaker) from conference page → calendar import
- Extract financial metrics from earnings report → spreadsheet

**Prompt Template:**
```
You are a data extraction specialist. Extract structured information from the following text and format as a markdown table.

Identify:
- Key entities (companies, people, products)
- Metrics (numbers, percentages, dates)
- Categories (product names, features, pricing tiers)

Text:
"""
{{TEXT}}
"""

Output format:
| Entity | Metric | Value | Source |
|--------|--------|-------|--------|
| ...    | ...    | ...   | ...    |

If the text contains pricing, create a comparison table. If it contains events, create a calendar-style table.
```

**Success Metrics:**
- Saves 1-2 hours per competitive analysis task
- Drives adoption among analysts, researchers, product managers
- Marketplace opportunity: sell vertical-specific extractors (legal, finance, e-commerce)

---

### 1.3 — 🎯 Generate Content Outline

**Icon:** `🎯` (target)

**User Story:**  
As a content creator, I want to generate a structured outline for my article based on research, so I can start writing immediately without staring at a blank page.

**Workflow:**
1. User provides article topic + target audience (e.g., "AI agents for beginners")
2. AI generates:
   - SEO-optimized title (3 variations)
   - Introduction hook
   - 5-7 main sections with subsections
   - Conclusion/CTA
   - Keyword suggestions

**Prompt Template:**
```
You are an expert content strategist. Generate a comprehensive outline for an article on: "{{TOPIC}}"

Target audience: {{AUDIENCE}} (e.g., beginners, technical professionals, executives)
Word count target: {{WORD_COUNT}} (default: 1500-2000 words)

Provide:
1. **SEO-Optimized Title** (3 variations)
2. **Introduction Hook** (2-3 sentences to grab attention)
3. **Main Sections** (5-7 sections with 2-3 subsections each)
4. **Conclusion & CTA**
5. **Keyword Suggestions** (10 primary + secondary keywords)

Format as a clear, hierarchical markdown outline.
```

**Success Metrics:**
- Reduces time-to-first-draft by 50%
- Increases content quality (structured vs. stream-of-consciousness)
- Drives usage among bloggers, journalists, marketing teams

---

## Category 2: Learning & Education (Target: Priya — Student)

### 2.1 — 🎓 Explain Like I'm 5 (ELI5)

**Icon:** `🎓` (graduation cap)

**User Story:**  
As a student, I want to understand complex concepts in simple terms, so I can grasp fundamentals before diving into technical details.

**Workflow:**
1. User selects complex text (research paper, technical docs)
2. AI rewrites in simple language using analogies, examples, no jargon
3. Optionally: generate visual diagram (text-based ASCII or Mermaid diagram)

**Prompt Template:**
```
You are a patient teacher explaining complex topics to beginners.

Rewrite the following text in simple, clear language that a 10-year-old could understand. Use:
- Analogies and real-world examples
- Short sentences (< 15 words)
- Active voice
- No jargon (or define jargon when necessary)

Original text:
"""
{{TEXT}}
"""

Explain in 3 paragraphs, then provide a simple analogy.
```

**Success Metrics:**
- Drives adoption among students (50M+ addressable market)
- Reduces learning time by 30-40%
- Strong word-of-mouth in academic communities (Reddit, Discord)

---

### 2.2 — 📚 Summarize Research Paper

**Icon:** `📚` (books)

**User Story:**  
As a grad student, I want to quickly understand the key contributions of a research paper, so I can decide if it's relevant to my thesis without reading 30 pages.

**Workflow:**
1. User navigates to research paper (arXiv, PMC, PDF in browser)
2. AI extracts and summarizes:
   - **Problem Statement** (what gap does this paper address?)
   - **Methodology** (how did they approach it?)
   - **Key Findings** (what did they discover?)
   - **Limitations** (what are the caveats?)
   - **Relevance** (why does this matter?)

**Prompt Template:**
```
You are an academic research assistant. Summarize this research paper in a structured format.

Paper content:
"""
{{PAGE_CONTENT}}
"""

Provide:
1. **Problem Statement** (2-3 sentences: what gap does this address?)
2. **Methodology** (bullet points: how did they study this?)
3. **Key Findings** (3-5 main discoveries)
4. **Limitations** (what caveats or weaknesses exist?)
5. **Relevance** (why should I care? what's the impact?)
6. **Citation** (APA or MLA format)

Keep it concise but comprehensive (300-400 words total).
```

**Success Metrics:**
- Saves 20-30 minutes per paper review
- Increases retention among graduate students by 60%
- Student discount pricing drives volume

---

### 2.3 — 🔄 Compare & Contrast

**Icon:** `🔄` (arrows)

**User Story:**  
As a student writing a literature review, I want to compare findings across multiple papers, so I can identify consensus, gaps, and contradictions.

**Workflow:**
1. User opens 2-5 research papers in separate tabs
2. Selects "Compare & Contrast" action
3. AI reads all tabs (cross-tab context) and generates comparison table

**Example Output:**
| Paper | Methodology | Key Finding | Conclusion | Year |
|-------|-------------|-------------|------------|------|
| Smith et al. | Survey (n=500) | AI increases productivity 30% | Positive but limited to specific tasks | 2024 |
| Jones et al. | RCT (n=200) | AI increases productivity 15% | Mixed results, depends on user training | 2025 |
| Lee et al. | Case study | AI decreases productivity 10% | Negative due to over-reliance | 2025 |

**Success Metrics:**
- Unlocks unique cross-tab capability (not available in ChatGPT)
- Drives premium upgrades (requires cross-tab context feature)
- High perceived value for academic users

---

## Category 3: Professional Communication (Target: David — Sales)

### 3.1 — ✉️ Write Personalized Cold Email

**Icon:** `✉️` (envelope)

**User Story:**  
As a sales rep, I want to send personalized outreach emails at scale, so I can increase response rates without spending hours on each email.

**Workflow:**
1. User navigates to prospect's LinkedIn profile or company website
2. Selects "Write Personalized Cold Email" action
3. AI reads page (page-aware context) and generates email with:
   - Personalized opening (references prospect's role, company, recent news)
   - Value proposition (tailored to prospect's pain points)
   - Clear CTA
   - Professional tone

**Prompt Template:**
```
You are a sales email expert. Write a personalized cold outreach email to the person/company described on this page.

Page content (LinkedIn profile or company website):
"""
{{PAGE_CONTENT}}
"""

Email requirements:
- **Subject line** (compelling, personalized, < 50 characters)
- **Opening** (reference their role, company, or recent achievement)
- **Value proposition** (explain how our {{PRODUCT}} solves their pain point)
- **Social proof** (mention 1 similar customer)
- **CTA** (ask for 15-minute call)
- **Tone**: Professional but conversational, not salesy

Keep it under 150 words. No filler phrases like "I hope this email finds you well."
```

**Success Metrics:**
- Increases email response rate from 2% to 8-12% (industry benchmark)
- Saves 10 minutes per email = 4 hours/day for reps sending 25 emails/day
- Drives adoption among sales teams (10M+ addressable market)

---

### 3.2 — 📞 Write Follow-Up Email

**Icon:** `📞` (phone)

**User Story:**  
As a sales rep, I want to follow up with prospects who didn't respond to my initial email, so I can re-engage without sounding pushy.

**Workflow:**
1. User selects previous email thread in Gmail
2. AI reads thread context and generates follow-up with:
   - Reference to previous email
   - New value add (case study, resource, relevant news)
   - Soft CTA (no pressure)

**Prompt Template:**
```
You are a sales follow-up expert. Write a polite, non-pushy follow-up email to this thread.

Previous email thread:
"""
{{TEXT}}
"""

Follow-up requirements:
- **Subject line** (reference previous topic or add new value)
- **Opening** (acknowledge they're busy, no pressure)
- **New value** (share relevant case study, article, or insight)
- **Soft CTA** (ask if they'd like to discuss, or offer to send more info)
- **Tone**: Helpful, not desperate

Keep it under 100 words. Sound like a human, not a bot.
```

**Success Metrics:**
- Increases follow-up response rate by 3-5x
- Reduces sales rep burnout (no more "just checking in" anxiety)
- Strong word-of-mouth in sales communities

---

### 3.3 — 🎙️ Convert Meeting Notes to Action Items

**Icon:** `🎙️` (microphone)

**User Story:**  
As a product manager, I want to convert my messy meeting notes into clear action items, so my team knows what to do next.

**Workflow:**
1. User pastes meeting notes (Google Docs, Notion, raw text)
2. AI extracts:
   - **Decisions made**
   - **Action items** (owner + deadline)
   - **Open questions**
   - **Next steps**

**Prompt Template:**
```
You are a meeting facilitator. Convert these raw meeting notes into a clear action plan.

Raw notes:
"""
{{TEXT}}
"""

Provide:
1. **Decisions Made** (bullet list)
2. **Action Items** (format: [ ] Task (Owner, Deadline))
3. **Open Questions** (what still needs to be resolved?)
4. **Next Meeting** (suggested agenda topics)

Use clear, concise language. Make action items specific and assignable.
```

**Success Metrics:**
- Saves 15-20 minutes after every meeting
- Increases accountability and follow-through
- Drives adoption among managers, PMs, team leads

---

## Category 4: Developer Productivity (Target: Tech-Savvy Users)

### 4.1 — 💻 Explain This Code

**Icon:** `💻` (laptop)

**User Story:**  
As a developer, I want to understand what a code snippet does (in GitHub, Stack Overflow, docs), so I can learn from it or debug faster.

**Workflow:**
1. User selects code snippet on any webpage
2. AI explains:
   - **What it does** (plain English summary)
   - **How it works** (line-by-line breakdown)
   - **Use cases** (when to use this pattern)
   - **Potential issues** (edge cases, performance, security)

**Prompt Template:**
```
You are a senior software engineer teaching a junior developer. Explain this code clearly and concisely.

Code:
"""
{{TEXT}}
"""

Provide:
1. **Summary** (what does this code do in 1 sentence?)
2. **Step-by-step breakdown** (explain key lines)
3. **Use cases** (when would you use this?)
4. **Potential issues** (bugs, performance, security concerns)

Use plain English, avoid jargon unless necessary.
```

**Success Metrics:**
- Drives adoption among developers (5M+ active Stack Overflow users)
- Reduces time spent reading documentation by 40%
- Strong word-of-mouth in dev communities (HackerNews, Reddit)

---

### 4.2 — 🐛 Debug This Error

**Icon:** `🐛` (bug)

**User Story:**  
As a developer, I want to quickly understand what's causing an error message, so I can fix it without Googling for 30 minutes.

**Workflow:**
1. User selects error message (console, terminal, logs)
2. AI explains:
   - **Root cause** (what went wrong?)
   - **Common triggers** (what usually causes this?)
   - **Fix steps** (how to resolve it)
   - **Prevention** (how to avoid this in the future)

**Prompt Template:**
```
You are a debugging expert. Explain this error and how to fix it.

Error message:
"""
{{TEXT}}
"""

Provide:
1. **Root cause** (what does this error mean in plain English?)
2. **Common triggers** (what usually causes this error?)
3. **Fix steps** (how to resolve it, with code examples if applicable)
4. **Prevention** (how to avoid this in the future)

Be specific and actionable.
```

**Success Metrics:**
- Saves 15-30 minutes per debugging session
- Increases developer satisfaction (reduces frustration)
- Drives premium upgrades among dev users

---

### 4.3 — 📖 Generate Documentation

**Icon:** `📖` (open book)

**User Story:**  
As a developer, I want to auto-generate documentation for my code, so I can focus on building rather than writing docs.

**Workflow:**
1. User selects function/class in GitHub, VS Code (via page-aware reading), or pastes code
2. AI generates:
   - **Function signature**
   - **Description** (what it does)
   - **Parameters** (name, type, description)
   - **Return value** (type, description)
   - **Example usage**
   - **Edge cases**

**Prompt Template:**
```
You are a technical writer. Generate comprehensive documentation for this code.

Code:
"""
{{TEXT}}
"""

Provide:
1. **Function signature** (with types)
2. **Description** (what does this function do?)
3. **Parameters** (name, type, description for each)
4. **Return value** (type and description)
5. **Example usage** (show how to call it)
6. **Edge cases** (what happens with invalid input?)

Format as JSDoc, docstring, or markdown (match the language).
```

**Success Metrics:**
- Saves 20-30 minutes per function documented
- Increases code quality (better docs = easier maintenance)
- Drives adoption among open-source maintainers

---

## Category 5: Accessibility & Inclusion

### 5.1 — ♿ Make This Accessible

**Icon:** `♿` (wheelchair)

**User Story:**  
As a content creator, I want to make my text accessible to people with disabilities (screen readers, dyslexia), so I can reach a wider audience.

**Workflow:**
1. User selects text (blog post, tweet, email)
2. AI rewrites for:
   - **Plain language** (8th-grade reading level)
   - **Clear structure** (headings, bullet points)
   - **Alt text suggestions** (if images are present)
   - **Readability score** (Flesch-Kincaid)

**Prompt Template:**
```
You are an accessibility expert. Rewrite this text to be more accessible.

Original text:
"""
{{TEXT}}
"""

Improve:
1. **Reading level** (target 8th grade)
2. **Sentence length** (< 20 words)
3. **Structure** (add headings, bullet points if needed)
4. **Clarity** (remove jargon, define technical terms)

Provide the rewritten text + readability score (Flesch-Kincaid).
```

**Success Metrics:**
- Drives brand perception (inclusive, socially responsible)
- Unlocks government/education market (WCAG compliance required)
- Increases content reach (20% of population has some form of disability)

---

### 5.2 — 🌍 Translate & Localize

**Icon:** `🌍` (globe)

**User Story:**  
As a global business, I want to translate content while adapting cultural nuances, so my message resonates with international audiences.

**Workflow:**
1. User selects text in English
2. Chooses target language + region (e.g., "Spanish - Mexico" vs. "Spanish - Spain")
3. AI translates and localizes:
   - **Translation** (accurate, fluent)
   - **Cultural adaptation** (idioms, references, tone)
   - **Formatting** (date/number formats, currency)

**Prompt Template:**
```
You are a professional translator and localization expert. Translate this text to {{TARGET_LANGUAGE}} ({{REGION}}).

Original text (English):
"""
{{TEXT}}
"""

Requirements:
1. **Accurate translation** (preserve meaning)
2. **Cultural adaptation** (localize idioms, references, tone)
3. **Formatting** (use region-specific date/number formats)

Provide the translated text only (no explanations).
```

**Success Metrics:**
- Expands TAM to non-English markets (3B+ internet users)
- Drives adoption among global companies (e-commerce, SaaS, media)
- Opens international revenue streams (localized pricing)

---

## Action Prioritization Matrix

| Action | Impact | Effort | Priority | Target Persona |
|--------|--------|--------|----------|----------------|
| **Research & Summarize Topic** | High | Medium | **P0** | Sarah (Content Creator) |
| **Explain Like I'm 5** | High | Low | **P0** | Priya (Student) |
| **Write Personalized Cold Email** | High | Medium | **P0** | David (Sales) |
| **Explain This Code** | High | Low | **P0** | Developers |
| **Extract Structured Data** | Medium | Medium | **P1** | Marcus (Enterprise PM) |
| **Summarize Research Paper** | Medium | Low | **P1** | Priya (Student) |
| **Write Follow-Up Email** | Medium | Low | **P1** | David (Sales) |
| **Debug This Error** | Medium | Low | **P1** | Developers |
| **Generate Content Outline** | Medium | Medium | **P1** | Sarah (Content Creator) |
| **Compare & Contrast** | High | High | **P2** | Priya (Student) |
| **Convert Meeting Notes to Actions** | Medium | Low | **P2** | Marcus (Enterprise PM) |
| **Generate Documentation** | Low | Medium | **P2** | Developers |
| **Make This Accessible** | Low | Low | **P2** | All users |
| **Translate & Localize** | Medium | Medium | **P2** | Global businesses |

---

## Implementation Roadmap

### Phase 1 (Months 1-3): Quick Wins
**Goal:** Ship 4 high-impact, low-effort actions to increase engagement

1. ✅ Explain Like I'm 5 (1 week)
2. ✅ Write Personalized Cold Email (2 weeks — requires page-aware context)
3. ✅ Explain This Code (1 week)
4. ✅ Write Follow-Up Email (1 week)

**Launch Strategy:**  
- Announce on Product Hunt ("10 new AI actions for every website")
- YouTube tutorials for each action
- Email to existing users showcasing new features

---

### Phase 2 (Months 4-6): Workflow Actions
**Goal:** Ship multi-step actions that unlock new use cases

5. ✅ Research & Summarize Topic (3 weeks — requires multi-page context)
6. ✅ Summarize Research Paper (2 weeks — requires PDF support)
7. ✅ Extract Structured Data (3 weeks — requires output formatting)
8. ✅ Debug This Error (1 week)

**Launch Strategy:**  
- Partner with dev tools (Stack Overflow, GitHub) for integration
- Academic outreach (grad student communities, Reddit)

---

### Phase 3 (Months 7-9): Advanced Workflows
**Goal:** Ship complex, high-value actions that require cross-tab or agent mode

9. ✅ Compare & Contrast (4 weeks — requires cross-tab context)
10. ✅ Generate Content Outline (2 weeks)
11. ✅ Convert Meeting Notes to Actions (1 week)

**Launch Strategy:**  
- Marketplace launch (let users create/share similar workflows)
- Enterprise case studies ("How ProductCo saved 200 hours/month")

---

### Phase 4 (Months 10-12): Global & Inclusive
**Goal:** Expand to new markets and user segments

12. ✅ Translate & Localize (2 weeks)
13. ✅ Make This Accessible (1 week)
14. ✅ Generate Documentation (2 weeks)

**Launch Strategy:**  
- Localized marketing (Spanish, French, German, Chinese)
- Accessibility partnerships (WCAG compliance tools)

---

## Success Metrics by Action

| Action | Target Usage (per user/month) | Premium Conversion Lift | User Segment |
|--------|-------------------------------|-------------------------|--------------|
| **Research & Summarize Topic** | 10-15x | +8% | Content Creators |
| **Explain Like I'm 5** | 20-30x | +5% | Students |
| **Write Personalized Cold Email** | 50-100x | +12% | Sales Reps |
| **Explain This Code** | 15-25x | +6% | Developers |
| **Summarize Research Paper** | 30-50x | +10% | Grad Students |
| **Extract Structured Data** | 5-10x | +7% | Analysts, PMs |

**Overall Impact:**  
- **+40% increase in DAU** (more use cases = more daily engagement)
- **+15% premium conversion** (advanced actions require unlimited requests)
- **+25% retention** (users build workflows around these actions)

---

## User Testing Plan

### Alpha Testing (Internal, Week 1-2)
- Test with 10 internal users across all personas
- Collect feedback on prompt quality, output accuracy, UX

### Beta Testing (Public, Week 3-6)
- Invite 100 power users from waitlist
- A/B test prompt variations to optimize output quality
- Monitor usage analytics (which actions are most popular?)

### Public Launch (Week 7)
- Ship to all users (free + premium)
- Announce via email, Product Hunt, social media
- Monitor support tickets for edge cases

---

## Appendix: Technical Requirements

### Page-Aware Context (Required for 8/14 actions)
- Ability to read visible page content (DOM text extraction)
- HTML → clean text converter (strip ads, nav, footer)
- Token limit handling (truncate to fit model context window)

### Cross-Tab Context (Required for 1/14 actions)
- Permission to access multiple open tabs
- Tab selection UI (checkboxes: "Include Tab 1, Tab 2...")
- Content deduplication (don't send duplicate text)

### Output Formatting (Required for 3/14 actions)
- Markdown table rendering (already supported)
- CSV export option
- JSON export option

### Multi-Step Workflows (Required for 2/14 actions)
- Chain multiple LLM calls (e.g., extract → summarize → format)
- Progress indicator ("Step 1 of 3...")
- Error handling per step

---

**Prepared by:** Product Strategy Team  
**Next Review:** After beta testing (Month 3)
