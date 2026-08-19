# aisho-v3 Design QA

## Comparison target

- Source visual truth: `C:\Users\kogik\AppData\Local\Temp\codex-clipboard-932d1494-078f-4eee-a55f-87ca7dcc84aa.png`
- Implementation route: `http://127.0.0.1:4173/aisho-v3/`
- Desktop implementation screenshot: `C:\Users\kogik\AppData\Local\Temp\aisho-v3-desktop-1440.png`
- Mobile implementation screenshot: `C:\Users\kogik\AppData\Local\Temp\aisho-v3-mobile-390x844.png`
- Short mobile screenshot: `C:\Users\kogik\AppData\Local\Temp\aisho-v3-mobile-390x650.png`
- Normalized side-by-side comparison: `C:\Users\kogik\AppData\Local\Temp\aisho-v3-fv-side-by-side-normalized.png`
- Viewports: desktop 1440×900, mobile 390×844, short mobile 390×650
- State: initial page load; fixed CTA also checked after scrolling

## Full-view comparison evidence

The desktop and mobile captures retain the complete `/aisho/` shell, right rail, CTA, proof block, lower sections and fixed CTA. Only the FV job carousel is hidden and replaced by the selected photo. The FV CTA is fully visible at 390×844 and 390×650.

## Focused FV comparison evidence

The normalized side-by-side comparison aligns the source main column and the implementation main column. Heading position, three-line wrapping, pale teal heading surface, image height, image crop, subject position and body-copy start all match the selected source. A focused comparison was required because these details were too small in the full-page capture.

## Required fidelity surfaces

- Fonts and typography: existing Noto Sans JP weights and line heights are preserved. The heading remains three semantic lines at the checked widths and the CTA label does not clip.
- Spacing and layout rhythm: desktop image height is 280px and mobile image height is 180px, matching the reference composition. FV copy and CTA spacing follow the selected source variant.
- Colors and visual tokens: heading background `#F4FBFB`, heading text `#325151`, borders and existing CTA colors match the source and current LP.
- Image quality and asset fidelity: the exact supplied source photo asset is used at 1536×1024 with `object-fit: cover`; no placeholder, CSS illustration or regenerated substitute is used.
- Copy and content: FV copy, CTA wording, proof values and all content below the FV are unchanged. Normalized rendered HTML below the FV matches `/aisho/` (`4f4749a9`, 27,818 characters).

## Findings

- No actionable P0, P1 or P2 mismatch.
- P3: the normalized source main column is 749px while the local browser main column is 744px because of the browser shell scrollbar. The normalized comparison shows no meaningful composition drift, so no code change is required.
- Informational: the in-app desktop scrollbar makes the nominal 320px check report a 305px content viewport and the same inherited header-width overflow on both `/aisho/` and `/aisho-v3/`. This is not introduced by the FV variant.
- Informational: the inherited Tailwind CDN development warning remains; no page runtime errors or broken images were found.

## Interaction and regression checks

- CTA destination and `data-cta="aishou01_fv"` preserved.
- FAQ opens correctly.
- 80-type grid renders 80 cells.
- Three career stories remain.
- Fixed CTA is fully visible after scrolling at 390×650 and its label does not overflow.
- No broken images.
- FV-excluded rendered content and right rail are identical to `/aisho/` after route-prefix normalization.

## Comparison history

- Pass 1: no P0/P1/P2 mismatch was found in the normalized desktop comparison or mobile captures. No corrective iteration was required.

## Implementation checklist

- Selected photo is installed in the FV.
- Existing job carousel remains in the cloned markup but is hidden only in `aisho-v3`.
- All copied assets are byte-identical to `/aisho/`; only the selected FV photo and route-scoped FV stylesheet are additional.
- `/aisho/` and `/aisho-v2/` are unchanged.

final result: passed
