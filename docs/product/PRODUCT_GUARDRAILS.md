# Property Assistant — Product Guardrails

This file is the concise in-repository decision filter derived from the approved core product charter. It does not replace the full charter; it protects its locked decisions during implementation.

## Product definition

Property Assistant is a **private, local-first AI memory and deal assistant for Property Advisors**. It captures natural voice/text input, turns it into structured business memory, automatically connects demand and supply, and surfaces useful next actions.

It is **not** a generic CRM.

## Core loop

1. Capture
2. Understand
3. Remember
4. Match
5. Act
6. Learn later from broker behavior without making MVP dependent on heavy models

Everything built for the MVP must strengthen at least one of the first five steps without making the product harder to use.

## MVP capture paths

- Speak & Save
- Type & Save
- After-call recap prompt
- Scan Poster

The MVP must not depend on unrestricted cellular-call recording/transcription.

## Core data

Structured, language-neutral records should represent people, roles, requirements, properties, contact numbers, locations, budget/price, size, urgency, negotiability, follow-ups, source, and relevant poster metadata.

Primary and alternate phone numbers are first-class business fields.

## Matching

Automatic matching is central. It must consider hard requirements, preferences, nearby alternatives, acceptable price variation, negotiability, urgency, and eventually learned Property Advisor preferences.

Core deterministic matching must remain available without an AI model.

## Action-oriented output

The system must lead to useful actions such as Call, WhatsApp, Follow up, Share, Save for later, or Not a good match. Natural language is an input/query interface; cards, lists, matches, and actions are normally the answer interface.

## Simplicity test

A non-technical older Property Advisor who can use calls, WhatsApp, a camera, and basic phone functions should be able to use the app without training.

Avoid exposing CRM, pipeline, workflow, database, automation, or technical AI terminology to users unless strictly necessary.

## Native-language rule

Launch-quality priority:

1. Tamil
2. English
3. Tanglish

Architecture should allow later expansion, but do not market a language before real-world quality is good enough.

**UI display language and input/speech language are independent settings.** Translated UI is not the same as native-language intelligence.

## Local-first rule

Core capabilities should work without permanent internet access: capture, storage, search, lookup, matching, reminders, and basic AI understanding where practical.

Optional cloud features may come later with explicit consent and strong privacy protection.

## AI architecture rule

Use existing replaceable local/open models and deterministic logic. Do not train a foundation model for the MVP. The application must still perform core storage, lookup, matching, reminders, and navigation when model inference is unavailable.

Optimize extraction for correct business meaning, including Tamil/English/Tanglish, local place names, real-estate vocabulary, numbers/currencies, land units, role, sale/rent intent, and negotiability.

## Device/platform rule

Build now:

- Android
- Desktop

Build later:

- iOS

Android target class includes approximately 4 GB RAM phones. Avoid architecture that causes excessive memory use, heat, startup latency, battery drain, or application size.

## Trust/privacy rule

- User business data belongs to the user.
- Private by default.
- No secret inventory sharing.
- Do not sell client/property data.
- Avoid unnecessary server transmission.
- Explain when data leaves the device.
- Backup/export and restore are mandatory capabilities before pilot readiness.

## MVP must-have capabilities

1. Speak and save
2. Type and save
3. After-call recap
4. People/contact memory
5. Property memory
6. Automatic matching
7. Follow-ups/next actions
8. Natural-language ask/search with visual results
9. Poster scan into actionable lead
10. Poster photo/timestamp/GPS metadata when permitted
11. Local backup/export and restore
12. Tamil + English + Tanglish real-world quality
13. Replaceable AI-assisted extraction with deterministic fallbacks

## Explicitly out of MVP

Do not let these delay validation:

- generic CRM expansion
- accounting/ERP
- property portal/marketplace
- social network
- advanced team management
- broker network
- advanced cloud sync
- iOS
- international launch
- all languages at once
- complex subscription tiers
- legal/loan/commission systems
- full WhatsApp automation
- paid APIs unless explicitly justified later

## Commercial guardrails

Initial subscription: ₹499/month.

Trial: 7 days.

First commercial validation: 21 paying Property Advisors.

Until at least ₹10,000 in customer revenue, cash build-cost target is ₹0: prefer existing hardware, open-source software, local storage/models, free tooling, and direct pilot testing.

## Visual contract

The approved prototype defines the expected hierarchy and interaction style for:

Splash, Onboarding, Home, Speak, Type, Review, Ask/Search, People, Person detail, Property detail, Matches, Match detail, Poster capture/review/lead, Follow-ups, Language, and Settings/Backup.

Visual direction: light surfaces, deep green primary, restrained warm gold, readable typography, rounded cards, generous spacing, strong contrast, large tap targets, minimal navigation, obvious primary actions.

## Decision filter

Before adding a feature, ask whether it improves capture, memory, matching, next action, simplicity, or trust/reliability. If it improves none of these, postpone or reject it.
