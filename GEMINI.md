# LumiStream Project Coding & Design Rules

## 🎨 Visual Aesthetics & UI Guidelines
* **No Gradient Effects**: Never use gradients (`bg-gradient-to-...`, text gradients, or radial glow backdrops) anywhere in the application. They make the UI look cluttered and cheap.
* **Monochromatic/Flat Aesthetic**: Always use a clean, high-contrast, flat monochromatic design system (inspired by Vercel/Linear). Use solid zinc/neutral colors (`bg-zinc-900`, `bg-zinc-950`), clean flat borders (`border-zinc-800`), and solid flat primary colors (like the theme's solid green `bg-primary` for action buttons).
* **Strict Theme Variable Adherence**: Use ONLY the custom colors and design tokens defined in the `@theme` block of [index.css](file:///home/mohit/Desktop/lumistream/frontend/src/index.css) (Tailwind v4 theme variables). Never use random ad-hoc colors or custom hex codes not declared in the design tokens:
  * **Main Background**: `bg-bg-main` (`#09090b`)
  * **Surfaces**: `bg-bg-surface` (`#18181b`)
  * **Cards**: `bg-bg-card` (`#202024`)
  * **Borders**: `border-border-main` (`#27272a`), `border-border-active` (`#3f3f46`)
  * **Primary (Green)**: `bg-primary` (`#10b981`), `hover:bg-primary-hover` (`#34d399`), `bg-primary-light` (`rgba(16, 185, 129, 0.15)`)
  * **Accent (Cyan)**: `bg-accent` (`#06b6d4`), `hover:bg-accent-hover` (`#22d3ee`)
  * **Text**: `text-text-main` (`#f4f4f5`), `text-text-muted` (`#a1a1aa`)
* **Grid & Layout Alignment**: Ensure section containers and cards are aligned, and utilize fixed-height scrollable areas (`overflow-y-auto`) instead of allowing lists to expand pages vertically.
