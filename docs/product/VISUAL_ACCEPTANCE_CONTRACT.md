# Approved Visual Acceptance Contract

This file turns the approved HTML/CSS prototype into a stable implementation/testing contract. Production code may use a different framework, but changing these experience decisions requires an explicit product decision.

## Current pilot scope override

The current explicit product decision is **English + typing only**. Voice and multilingual controls are deferred while Capture → Understand → Remember → Match → Act is validated. Their future return must use the same review, language-neutral memory, search, matching, and action contracts; the current pilot must not show dead voice/language controls or request microphone permission.

## Brand and interaction direction

- Product name: **Property Assistant**.
- User-facing role: **Property Advisor**.
- Light background and surfaces.
- Deep green primary brand family.
- Restrained warm-gold accent.
- Dark readable text, strong contrast.
- Rounded cards and controls.
- Generous spacing and large tap targets.
- Primary actions visually obvious.
- Mobile-first interaction with a useful larger desktop layout.

Prototype token references include deep greens around `#0A2922` / `#10382F`, warm gold around `#C99C4C`, white surfaces, and a light neutral background. Production tokens may be tuned only if the visual character and accessibility remain consistent.

## Required screen/flow inventory

The implementation must preserve an understandable path through:

1. Splash
2. Onboarding
3. Home / Assistant capture
4. Type & Save
5. AI extraction Review
6. After-call capture prompt/recap
7. Requirements
8. Properties
9. Contacts / People
10. Person detail
11. Property detail
12. Ask / Search
13. Search result cards
14. Matches
15. Match detail/actions
16. Poster capture
17. Poster extraction review
18. Poster lead detail
19. Follow-ups / Action Brain
20. Settings / Backup

Deferred screen references: Speak & Save and Language / Personalize.

## Home contract

Home is the default Assistant surface and must emphasize capture and action, not dashboard complexity. One prominent natural-language composer accepts English typing without requiring a form first. The user should quickly see the extracted meaning, useful matches, recent memory, follow-ups, price/status changes, or unfinished leads.

## Memory contract

- Requirements, properties, contacts, interactions, preferences, rejection reasons and follow-ups are connected business memory, not isolated CRM rows.
- Requirements and Properties provide focused browsable views without displacing Assistant as the default workflow.
- Original capture text/transcript remains available as evidence while normalized fields power search and matching.
- Person and property details expose useful related context: what was requested/offered, prior conversations, learned preferences, rejection reasons, next actions and suitable matches.
- Automatic matching runs from persisted local records and explains why a result is relevant.

## Capture contract

### Voice — deferred

Do not expose a microphone action or request microphone permission in the current pilot. A future voice adapter must hand text into the same review-before-save contract and degrade cleanly to typing.

### Type

- Natural-language composer, not a CRM form as the primary experience.
- Smart suggestions may help but must not increase friction.
- Type & Save remains available if voice/STT is unavailable.

## Review contract

AI extraction is never treated as unquestionable truth. Structured fields are shown in a confirmation/review card and can be corrected, especially when confidence is uncertain.

## Ask/Search contract

The current pilot accepts typed English questions. The answer should normally be operational cards/lists with relevant people/properties, match information, and actions—not a long chatbot transcript. Future voice input must reuse this query/result contract.

## Match contract

Match cards/details should show an understandable match score/reason and obvious next actions such as Call, WhatsApp, Follow up, Share, Save for later, or reject/not-good-match depending on context.

## Poster contract

- Camera/poster scan entry is obvious.
- Phone-number extraction has priority.
- Review extracted information before saving.
- Preserve the original image with lead metadata.
- Keep `Poster says` property/location information separate from `Photo taken at` GPS/capture location.
- GPS absence is a normal handled state.

## Language contract — deferred UI

The current pilot renders English only. Legacy language preferences must not change the UI or mutate stored business data.

When language selection returns, changing UI language must change menus, buttons, labels, confirmations, and guidance without rewriting or corrupting language-neutral stored business data.

## Navigation contract

Navigation stays minimal. The primary mobile navigation is Home, Requirements, Properties, Matches and Follow-ups. Home is the Assistant and primary capture surface. Ask/Search is reachable from the persistent header; Contacts, poster capture, after-call recap, language and settings remain reachable as contextual or quick actions. Desktop may use a side navigation while preserving the same information architecture.

## Automated acceptance expectations

For each implemented screen:

- page/screen loads;
- main heading/semantic identity is present;
- primary action is enabled when prerequisites are met;
- navigation to/from the screen works;
- mobile viewport has no unintended horizontal overflow;
- critical actions have semantic labels/stable selectors;
- the current pilot stays English even when legacy language preferences exist, without mutating seeded domain data;
- no placeholder button remains dead in a phase marked complete.

Playwright visual snapshots may be added for representative desktop/mobile viewports, but behavioral assertions are mandatory.
