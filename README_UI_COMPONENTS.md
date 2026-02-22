# README UI Components

## Component Catalog
1. **ReadmeIntroBlock**
   - Purpose: concise orientation and value proposition.
   - Data: long description.
2. **QuickStartPanel**
   - Purpose: step-by-step usage flow.
   - Data: ordered steps.
3. **ExampleCardGrid**
   - Purpose: scan-friendly examples with input/output.
   - Data: example title + input + output.
4. **UseCaseWorkflowGrid**
   - Purpose: practical workflows by scenario.
   - Data: use-case strings rendered as cards.
5. **TipHighlightBox**
   - Purpose: troubleshooting and operator guidance.
   - Data: curated evergreen tip.
6. **FAQAccordion**
   - Purpose: reduce scroll while preserving SEO indexability.
   - Data: Q/A pairs with FAQ schema attributes.
7. **RelatedToolsGrid**
   - Purpose: next-step discovery and ecosystem navigation.
   - Data: merged related/same-category/next tools.

## Token Alignment
- Uses existing panel surfaces, border tokens, radius tokens, and spacing tokens.
- No runtime-mount contract changes.
- Grids use responsive 3/2/1 column behavior for examples and use cases.
