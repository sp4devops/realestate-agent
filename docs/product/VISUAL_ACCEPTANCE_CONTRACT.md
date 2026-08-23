# Approved Visual Acceptance Contract

This file turns the approved HTML/CSS prototype into a stable implementation/testing contract. Production code may use a different framework, but changing these experience decisions requires an explicit product decision.

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
4. Speak & Save
5. Type & Save
6. AI extraction Review
7. After-call capture prompt/recap
8. Requirements
9. Properties
10. Contacts / People
11. Person detail
12. Property detail
13. Ask / Search
14. Search result cards
15. Matches
16. Match detail/actions
17. Poster capture
18. Poster extraction review
19. Poster lead detail
20. Follow-ups / Action Brain
21. Language / Personalize
22. Settings / Backup

## Home contract

Home is the default Assistant surface and must emphasize capture and action, not dashboard complexity. One prominent natural-language composer accepts voice or typing without requiring a form first. The user should quickly see the extracted meaning, useful matches, recent memory, follow-ups, price/status changes, or unfinished leads.

## Memory contract

- Requirements, properties, contacts, interactions, preferences, rejection reasons and follow-ups are connected business memory, not isolated CRM rows.
- Requirements and Properties provide focused browsable views without displacing Assistant as the default workflow.
- Original capture text/transcript remains available as evidence while normalized fields power search and matching.
- Person and property details expose useful related context: what was requested/offered, prior conversations, learned preferences, rejection reasons, next actions and suitable matches.
- Automatic matching runs from persisted local records and explains why a result is relevant.

## Capture contract

### Voice

- A large, obvious microphone action.
- Clear listening/processing state.
- Transcript/recognized content visible before irreversible save when appropriate.
- Permission/failure states understandable.

### Type

- Natural-language composer, not a CRM form as the primary experience.
- Smart suggestions may help but must not increase friction.
- Type & Save remains available if voice/STT is unavailable.

## Review contract

AI extraction is never treated as unquestionable truth. Structured fields are shown in a confirmation/review card and can be corrected, especially when confidence is uncertain.

## Ask/Search contract

Voice or typing may express the question. The answer should normally be operational cards/lists with relevant people/properties, match information, and actions—not a long chatbot transcript.

## Match contract

Match cards/details should show an understandable match score/reason and obvious next actions such as Call, WhatsApp, Follow up, Share, Save for later, or reject/not-good-match depending on context.

## Poster contract

- Camera/poster scan entry is obvious.
- Phone-number extraction has priority.
- Review extracted information before saving.
- Preserve the original image with lead metadata.
- Keep `Poster says` property/location information separate from `Photo taken at` GPS/capture location.
- GPS absence is a normal handled state.

## Language contract

The approved prototype treats app display language independently from voice/typing understanding.

Changing UI language changes menus, buttons, labels, confirmations, and guidance. It must **not** rewrite or corrupt language-neutral stored business data. A Property Advisor may use Tamil UI while speaking Tamil, Tanglish, or English.

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
- language switch updates interface copy without mutating seeded domain data;
- no placeholder button remains dead in a phase marked complete.

Playwright visual snapshots may be added for representative desktop/mobile viewports, but behavioral assertions are mandatory.
