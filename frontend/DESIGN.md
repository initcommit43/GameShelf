# Design System Specification: The Digital Obsidian

## 1. Overview & Creative North Star: "The Midnight Archivist"
This design system is built to transform a standard utility into a premium editorial experience. Moving away from the "grid-of-boxes" aesthetic common in mobile apps, we adopt the North Star of **The Midnight Archivist**. 

The goal is to evoke the feeling of a high-end, dimly lit private library. We achieve this through "The Glow"—using the vibrant blue primary accent as a light source that cuts through deep, layered blacks. We prioritize cinematic immersion by using large, high-contrast typography and overlapping 3:4 imagery that breaks the rigid verticality of mobile screens.

## 2. Colors & Surface Architecture
The palette is rooted in absolute depth. We do not use color to decorate; we use it to define space and importance.

### The "No-Line" Rule
To maintain a high-end editorial feel, **1px solid borders for sectioning are strictly prohibited.** Do not use lines to separate content. Instead, define boundaries through:
*   **Tonal Shifts:** Placing a `surface_container_low` card against a `surface` background.
*   **Negative Space:** Using generous padding (refer to Spacing Scale) to imply grouping.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. 
*   **Base:** `background` (#0e0e0e) is the floor.
*   **Sections:** Use `surface_container_low` (#131313) for secondary content blocks.
*   **Active Elements:** Use `surface_container_high` (#201f1f) for interactive cards or modals to bring them "closer" to the user.

### The "Glass & Gradient" Rule
Flat buttons are for utilities; "The Midnight Archivist" uses light. 
*   **Primary CTAs:** Apply a linear gradient from `primary` (#7aafff) to `primary_container` (#5ea2ff) at a 135-degree angle.
*   **Floating Elements:** For navigation bars or top headers, use `surface_container` at 80% opacity with a `backdrop-blur` of 12px to create a "frosted obsidian" effect.

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with readability.

*   **Headlines (Manrope):** Use `display-lg` and `headline-md` for game titles and section headers. These should be high-contrast (color: `on_surface`). Use tight letter spacing (-0.02em) on display sizes to create a "locked-in" editorial look.
*   **Utility & Body (Inter):** Use `body-md` for descriptions and `label-sm` for metadata. Metadata should always use `on_surface_variant` (#adaaaa) to recede visually, ensuring the game titles remain the hero.
*   **Visual Hierarchy:** A `display-sm` headline should often be paired directly with a `label-md` uppercase tag to create an intentional "Big/Small" typographic tension.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows look "web-kit" and dated. We use **Ambient Depth**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface_container_highest` (#262626) element sitting on `surface` creates an immediate 3D relationship without a single pixel of shadow.
*   **Ambient Shadows:** If a card must float (e.g., a game trailer modal), use a shadow color tinted with `primary` at 5% opacity. The blur should be 32px or higher to mimic soft, ambient room light.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similar background, use a 1px border of `outline_variant` (#484847) at **15% opacity**. It should be felt, not seen.

## 5. Components

### 3:4 Game Covers (The Hero)
*   **Rounding:** Always use `lg` (0.5rem/8px). 
*   **Treatment:** Covers should have a subtle inner-glow (1px inset stroke, `on_surface` at 10% opacity) to prevent them from "melting" into the black background.

### Buttons
*   **Primary:** Gradient (`primary` to `primary_container`), `on_primary` text, `full` rounding for a pill shape.
*   **Secondary:** No fill. `Ghost Border` (outline-variant at 20%) with `primary` text.
*   **Interaction:** On press, the element should scale down to 0.98 for a tactile, "physical" click feel.

### Lists & Collections
*   **The Divider Ban:** Never use a horizontal rule `<hr>`. Use a background shift (e.g., alternating `surface` and `surface_container_low`) or 24px of vertical whitespace.
*   **Micro-interactions:** List items should highlight using `surface_container_highest` on touch.

### Input Fields
*   **Form Factor:** Use `surface_container_lowest` (#000000) for the field background to create a "punched-out" effect in the UI. 
*   **Focus State:** Instead of a thick border, use a subtle 1px `primary` glow and shift the label color to `primary`.

### Navigation (Mobile-First)
*   **Bottom Bar:** Use the Glassmorphism rule. Use `label-sm` for active states. Avoid heavy icons; use thin-stroke (1.5pt) iconography to match the "clean" vibe.

## 6. Do's and Don'ts

### Do:
*   **Do** embrace the dark. Ensure `on_surface_variant` text meets a 4.5:1 contrast ratio against `surface`, but keep it muted enough that it doesn't compete with the game art.
*   **Do** use asymmetrical layouts. For example, left-align a `display-md` title but right-align the "View All" `label-md` link to create visual movement.
*   **Do** use `xl` (0.75rem) rounding for large containers like modals, but keep internal components at `lg` or `md`.

### Don't:
*   **Don't** use pure white (#FFFFFF) for long-form body text; use `secondary` (#e4e2e1) to reduce eye strain in a dark environment.
*   **Don't** use "Default" blue (#0000FF). Only use the `primary` (#7aafff) token, which is tuned for dark-mode vibrance.
*   **Don't** crowd the screen. This system relies on "The Void" (negative space) to feel premium. If it feels busy, remove a container or increase the margin.