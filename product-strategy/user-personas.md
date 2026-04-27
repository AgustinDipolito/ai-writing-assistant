# User Personas
## AI Writing Assistant — Target User Profiles

**Document Version:** 1.0  
**Last Updated:** April 27, 2026

---

## Overview

These personas represent our core user segments based on research, competitive analysis, and early user feedback. Each persona drives specific product decisions and go-to-market strategies.

---

## Persona 1: Sarah — The Content Creator

<table>
<tr><td><strong>Demographics</strong></td><td>29 years old, Freelance content writer & blogger, Remote worker, Lives in Austin, TX</td></tr>
<tr><td><strong>Tech Savviness</strong></td><td>High — Early adopter of productivity tools, comfortable with APIs and AI</td></tr>
<tr><td><strong>Income</strong></td><td>$60K-80K/year from freelance writing, content marketing, ghostwriting</td></tr>
</table>

### Goals & Motivations
- **Productivity:** Needs to produce 10-15 blog posts per week across multiple clients
- **Quality:** Wants content that's engaging, error-free, and SEO-optimized
- **Efficiency:** Constantly looking for tools that save time without sacrificing quality
- **Differentiation:** Uses AI to enhance her work, not replace it — wants to maintain her unique voice

### Pain Points
- **Context switching:** Constantly copying text from client briefs/CMS into ChatGPT, then back
- **Provider lock-in:** Uses both ChatGPT Plus ($20/mo) and Claude Pro ($20/mo) depending on task — paying $40/mo total
- **Inconsistent quality:** Generic AI outputs need heavy editing to match client brand voice
- **No workflow automation:** Manual copy-paste for multi-step tasks (research → outline → draft → refine)

### Current Workflow
1. Research topic in browser (Google, competitor articles, client brief)
2. Copy research notes into ChatGPT to generate outline
3. Copy outline into Google Docs
4. Write draft in Docs, copy sections back to ChatGPT for style improvements
5. Copy final text into client CMS (WordPress, Medium, etc.)
6. Use Grammarly to catch any errors

**Total time per article:** 2-3 hours

### How AI Writing Assistant Helps
- **Page-aware context:** Can say "Summarize these 3 competitor articles" without copy-pasting URLs
- **In-page editing:** Refine text directly in Google Docs, WordPress, Medium — no context switching
- **Custom actions:** Created 12 custom prompts for different client brand voices ("Write like HubSpot blog," "Explain in casual tone," etc.)
- **Multi-provider:** Uses Gemini for quick drafts (free tier), Claude for complex arguments (premium)
- **Agent workflows:** Chains actions: "Extract key points → Generate outline → Expand into draft"

**Time saved:** 30-45 minutes per article = 5-8 hours/week = $150-250/week in billable time

### Preferred Features (Priority)
1. **Agent Mode (chains)** — Automate her 5-step workflow
2. **Page-aware context** — Read entire articles without copy-paste
3. **Custom actions** — Already has 12, wants unlimited (premium tier)
4. **Keyboard shortcuts** — Trigger common actions with hotkeys
5. **Session history** — Revisit earlier drafts/variations

### Willingness to Pay
**High** — Already paying $40/mo for ChatGPT + Claude. Would switch to AI Writing Assistant Premium ($9.99/mo) + bring own API keys ($10-15/mo usage) = **$20-25/mo total** (saves $15-20/mo + gains browser integration)

### Acquisition Channel
- Content marketing ("Best AI writing tools for freelancers")
- YouTube tutorials ("How I write 15 blog posts per week with AI")
- Product Hunt ("Finally, ChatGPT that works on every website")

### Quote
> "I love ChatGPT, but constantly switching tabs breaks my flow. I need AI where I'm actually writing — not in a separate app."

---

## Persona 2: Marcus — The Enterprise Knowledge Worker

<table>
<tr><td><strong>Demographics</strong></td><td>34 years old, Senior Product Manager at SaaS company (500 employees), Remote-first team, Lives in San Francisco, CA</td></tr>
<tr><td><strong>Tech Savviness</strong></td><td>Medium — Comfortable with standard productivity tools, less familiar with AI/APIs</td></tr>
<tr><td><strong>Income</strong></td><td>$140K/year + equity, Company pays for all software subscriptions</td></tr>
</table>

### Goals & Motivations
- **Efficiency:** Writes product specs, emails, Slack messages, Jira tickets — wants AI to help with all of them
- **Consistency:** Needs to maintain professional tone across different communication channels
- **Collaboration:** Works with engineers, designers, executives — needs to adapt language for each audience
- **Compliance:** Company policy requires using approved tools, can't share data with unauthorized AI services

### Pain Points
- **Fragmented tools:** Uses Grammarly for emails, ChatGPT for drafts, Notion AI for docs — no unified experience
- **Data concerns:** Can't paste proprietary product info into ChatGPT (security policy)
- **No team sharing:** Spends time writing the same prompts as his colleagues — no way to share
- **Limited to one provider:** Company might approve Google Workspace AI or Microsoft Copilot, but not both

### Current Workflow
1. Draft product spec in Notion
2. Copy into Grammarly to fix grammar
3. Manually rewrite for clarity/tone
4. Email to team for feedback
5. Revise based on comments
6. Copy into Confluence for documentation

**Total time per spec:** 4-6 hours

### How AI Writing Assistant Helps
- **Team Workspace:** Shares custom actions with PM team ("Convert spec to exec summary," "Rewrite for engineering audience")
- **Provider flexibility:** Company approves Google AI (Gemini) → he can use AI Writing Assistant with company-approved provider
- **No data leaves browser:** All API calls direct to Google — satisfies security team
- **Works everywhere:** Notion, Gmail, Slack, Jira, Confluence — one tool for all writing
- **Centralized billing:** IT buys 50 licenses for Product team at $15/user/mo

**Time saved:** 1-2 hours per spec = 4-8 hours/week across team = $200K+ in productivity value annually for 50-person team

### Preferred Features (Priority)
1. **Team Workspace** — Share actions, workflows, usage analytics
2. **Enterprise SSO** — Okta/SAML login
3. **Admin controls** — IT can manage licenses, monitor usage, enforce policies
4. **Compliance** — SOC 2, GDPR audit logs
5. **Bring Your Own API Key** — Use company's Google Cloud account (no 3rd party data sharing)

### Willingness to Pay
**Medium** (personally), **High** (company budget) — Personally wouldn't pay out-of-pocket, but company will approve $15/user/mo for 50-person team = **$9K/year** if IT/security approve.

### Acquisition Channel
- Direct sales outreach to VPs of Product/Engineering
- G2/Capterra reviews
- Case studies showing productivity gains at similar companies
- Free trial for team leads → convert to enterprise contract

### Decision Criteria
1. **Security/Compliance** — Must pass InfoSec review (SOC 2, data residency, no data retention)
2. **ROI** — Clear productivity metrics (time saved, quality improvements)
3. **Ease of deployment** — Chrome extension = no IT setup vs. Copilot requires M365 migration
4. **Vendor stability** — Backed by reputable investors, clear roadmap

### Quote
> "We need AI that works with our approved tools and doesn't send our data to OpenAI's servers. If you can do that, we'll buy licenses for the whole team."

---

## Persona 3: Priya — The Student / Academic

<table>
<tr><td><strong>Demographics</strong></td><td>21 years old, Graduate student (Computer Science, MS program), Lives in Boston, MA, International student (India)</td></tr>
<tr><td><strong>Tech Savviness</strong></td><td>High — CS background, familiar with APIs, runs local LLMs on laptop</td></tr>
<tr><td><strong>Income</strong></td><td>$25K/year (TA stipend), Price-sensitive but will pay for high-value tools</td></tr>
</table>

### Goals & Motivations
- **Academic excellence:** Writing research papers, literature reviews, thesis — needs perfect grammar and clear arguments
- **Language barrier:** English is second language — AI helps refine phrasing and tone
- **Research efficiency:** Reads 10-20 papers per week — needs AI to summarize, extract key points, compare findings
- **Learning:** Uses AI to understand complex concepts, not just to generate content

### Pain Points
- **Cost:** Can't afford ChatGPT Plus ($20/mo) on student budget
- **Academic integrity:** Worried about plagiarism detection if using AI — needs citations and original phrasing
- **Context limits:** ChatGPT free tier often cuts off mid-response when analyzing long papers
- **No integration with tools:** Writes in Overleaf (LaTeX), Google Docs, Notion — constant copy-paste

### Current Workflow
1. Download research paper PDFs (10-20 per paper she writes)
2. Read and take notes manually
3. Copy notes into ChatGPT (free): "Summarize these findings"
4. Response cuts off → regenerate → cuts off again
5. Copy AI output into Notion for organizing
6. Write draft in Google Docs
7. Copy sections back to ChatGPT for refinement
8. Convert to LaTeX in Overleaf for submission

**Total time per paper:** 20-30 hours

### How AI Writing Assistant Helps
- **Page-aware context:** Reads web-based papers (arXiv, PMC) directly without PDF → text conversion
- **Local LLM support (Ollama):** Uses free local models for research reading (unlimited), saves Gemini free tier for writing
- **Custom actions:** Created actions for "Summarize research paper methodology," "Extract key contributions," "Compare 2 papers"
- **Works in Google Docs:** Refines writing in-place without copy-paste
- **Student discount:** Considering premium ($4.99/mo student rate) for thesis work

**Time saved:** 5-8 hours per paper = 15-25 hours/month during thesis writing

### Preferred Features (Priority)
1. **Ollama integration** — Use free local models for reading/research
2. **PDF support** — Upload paper PDF and ask questions
3. **Citation extraction** — Auto-generate bibliography from analyzed papers
4. **Multi-document comparison** — "Compare findings across these 5 papers"
5. **Latex export** — Generate formatted citations for Overleaf

### Willingness to Pay
**Low to Medium** — Free tier is sufficient for most tasks. Would pay $4.99/mo (student discount) during thesis crunch time (3-4 months) = **$15-20 total** for degree program.

### Acquisition Channel
- Reddit (r/GradSchool, r/AskAcademia, r/PhD)
- University subreddits (r/BU, r/MIT, etc.)
- Academic Twitter/X
- YouTube: "How I use AI for my CS thesis"
- Word-of-mouth in lab/study groups

### Quote
> "I can't afford $20/month for ChatGPT, but I'd pay $5/month for something that works with my research papers and doesn't require me to copy-paste everything."

---

## Persona 4: David — The Non-Technical Professional

<table>
<tr><td><strong>Demographics</strong></td><td>42 years old, Sales Director at mid-market B2B company, Manages team of 8 sales reps, Lives in Chicago, IL</td></tr>
<tr><td><strong>Tech Savviness</strong></td><td>Low — Uses Salesforce, email, LinkedIn. Has heard of ChatGPT but never used it</td></tr>
<tr><td><strong>Income</strong></td><td>$110K base + $40K commission, Budget-conscious but will pay for proven ROI</td></tr>
</table>

### Goals & Motivations
- **Sales performance:** Needs to send 20-30 personalized emails per day to prospects
- **Time management:** Spends 2-3 hours/day writing emails, proposals, follow-ups — wants to cut this in half
- **Professionalism:** Wants polished, error-free communication that builds trust with enterprise buyers
- **Competitive edge:** Peers are using AI to scale outreach — doesn't want to fall behind

### Pain Points
- **No AI experience:** Heard about ChatGPT on LinkedIn, but doesn't know how to use it or where to start
- **Writing takes too long:** Each personalized email takes 10-15 minutes — can't keep up with pipeline
- **Generic templates don't work:** Buyers ignore mass emails — needs personalization at scale
- **Tools are complex:** Tried ChatGPT once, got overwhelmed by blank prompt box — gave up

### Current Workflow
1. Research prospect on LinkedIn/company website
2. Open Gmail, write email from scratch
3. Re-read 2-3 times to check for errors
4. Manually personalize with company name, role, pain points
5. Send via Gmail or Outreach.io
6. Repeat 20-30x per day

**Total time per email:** 10-15 minutes × 25 emails = 4-6 hours/day just writing emails

### How AI Writing Assistant Helps
- **Right-click context menu:** Sees "AI Writing Assistant" in right-click menu while drafting Gmail — clicks "Improve Style"
- **Instant improvement:** AI rewrites draft in 3 seconds — he reviews, clicks "Apply," done
- **No learning curve:** Doesn't need to know what a "prompt" is — just select text, click button
- **Personalization action:** Uses custom action "Personalize for [company]" — AI reads prospect's LinkedIn (page-aware) and adjusts tone
- **Prebuilt library:** Discovers Web Actions Library — installs "Write sales follow-up," "Shorten email," "Make more confident"

**Time saved:** 5-8 minutes per email × 25 emails = 2-3 hours/day = $15-25K in annual productivity value

### Preferred Features (Priority)
1. **Web Actions Library** — Prebuilt actions so he doesn't need to write prompts
2. **Right-click integration** — Doesn't want to learn keyboard shortcuts
3. **Simple onboarding** — 3-step setup: choose provider → paste API key → test first action
4. **Email-specific actions** — "Write cold outreach," "Write follow-up," "Shorten to 50 words"
5. **LinkedIn integration** — Read prospect profile and auto-personalize

### Willingness to Pay
**Medium** — Wouldn't pay $20/mo for ChatGPT (too complex), but would pay $9.99/mo for AI Writing Assistant Premium because it "just works" in Gmail. ROI is clear: saves 10 hours/week = **$500+ in value per month**.

### Acquisition Channel
- LinkedIn ads ("Write better sales emails in half the time")
- Sales influencers/podcasts (sponsor "The Sales Evangelist," "30 Minutes to President's Club")
- YouTube ads during sales tutorial videos
- Referral from colleague ("Hey, try this Chrome extension — it's like Grammarly but for AI")

### Decision Criteria
1. **Ease of use** — Must work with zero learning curve (right-click → select action → done)
2. **Email focus** — Must integrate with Gmail, Outlook, LinkedIn
3. **Trust** — Needs social proof (testimonials from other sales professionals)
4. **ROI** — Show time saved in minutes/hours, not abstract "productivity gains"

### Quote
> "I don't have time to learn ChatGPT. I need something that just works when I'm writing emails in Gmail. That's it."

---

## Persona Summary & Prioritization

| Persona | Segment Size | Willingness to Pay | Acquisition Cost | Priority |
|---------|--------------|-------------------|------------------|----------|
| **Sarah (Content Creator)** | 5M+ | High ($20-25/mo) | Medium ($50-100) | **P0** |
| **Marcus (Enterprise)** | 20M+ | High ($15/user/mo, team) | High ($500-2K per account) | **P0** |
| **Priya (Student)** | 50M+ | Low ($5/mo) | Low ($10-20) | **P1** |
| **David (Non-Tech Sales)** | 10M+ | Medium ($10/mo) | Medium ($75-150) | **P1** |

### Product Strategy per Persona

**Phase 1 (Months 1-6): Sarah + Priya**  
- Focus on individual power users who understand AI
- Build core features: page-aware context, custom actions, keyboard shortcuts
- Freemium conversion funnel
- Content marketing + Product Hunt

**Phase 2 (Months 7-12): Marcus**  
- Launch Team/Enterprise edition
- Add SSO, admin controls, team workspace
- Direct sales motion
- Case studies + G2 reviews

**Phase 3 (Months 13-18): David**  
- Polish Web Actions Library (prebuilt templates)
- Simplified onboarding for non-technical users
- LinkedIn ads + sales podcast sponsorships
- Email-specific integrations (Gmail, Outlook)

---

## User Journey Maps

### Sarah's Journey (Content Creator)

**Awareness:**  
Sees YouTube video: "How I 10x my content output with AI"

**Consideration:**  
Visits website, reads comparison vs. ChatGPT, clicks "Install Free"

**Activation:**  
Installs extension → 3-step onboarding → tests "Grammar" action on sample text → sees instant result → "This is amazing"

**Engagement:**  
Uses 5-10x per day over first week, creates 3 custom actions for client brand voices

**Monetization:**  
Hits free tier limit (50 requests/day) after 1 week → upgrades to Premium ($9.99/mo) → saves $20/mo by canceling ChatGPT Plus

**Retention:**  
Uses daily for next 6 months, creates 12 custom actions, shares on Twitter ("Best $10/month I spend")

**Advocacy:**  
Publishes blog post: "Why I switched from ChatGPT to AI Writing Assistant" → drives 500+ installs

---

### Marcus's Journey (Enterprise)

**Awareness:**  
Receives cold email from sales rep: "How [competitor] saved 200 hours/month with AI Writing Assistant"

**Consideration:**  
Clicks link → books demo → sees team workspace, SSO, admin controls

**Activation:**  
Starts free trial with 5-person team → IT reviews security (SOC 2, BYOK) → approves pilot

**Engagement:**  
Team uses for 2 weeks, creates 15 shared actions, reports 30% time savings in weekly sync

**Monetization:**  
Converts to Enterprise plan ($15/user/mo × 50 users = $750/mo = $9K/year)

**Retention:**  
Renews after year 1 at 90% retention rate, expands to 75 users in year 2

**Advocacy:**  
Writes G2 review: "Saved our team 200+ hours per month" → 5-star rating → drives 10+ enterprise leads

---

## Appendix: Research Methodology

**Sources:**  
- User interviews (n=25) conducted in Q4 2025  
- Competitive analysis (Grammarly, ChatGPT, Notion AI, Jasper)  
- Market research reports (Gartner, Forrester)  
- Extension analytics (anonymized usage patterns)  
- Support tickets / feature requests  

**Validation:**  
- Personas validated with 50+ user interviews in Q1 2026  
- Quantitative survey (n=500) confirmed pain points and willingness to pay  
- A/B tests on landing page messaging (higher conversion for persona-specific copy)

---

**Prepared by:** Product Strategy Team  
**Next Review:** Q3 2026 (update based on user feedback + market trends)
