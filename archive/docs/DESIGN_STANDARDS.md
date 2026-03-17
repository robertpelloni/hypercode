# Design & UX Standards

## Visual Aesthetic
**"Mission Control / Cybernetic"**
- **Palette**: Dark mode primary. Zinc-900 backgrounds.
    - Accents: Electric Blue (`blue-400`), Neon Purple (`purple-400`), Signal Green (`green-400`), Alert Red (`red-400`).
    - Use gradients for headers and key actions, but keep data readouts high-contrast.
- **Typography**: Monospace (JetBrains Mono/Fira Code) for data/code. Sans-serif (Inter/Geist) for UI labels.
- **Components**:
    - **Cards**: `bg-zinc-900/50` with subtle borders `border-white/10`.
    - **Borders**: Sharp or slightly rounded (`rounded-lg`), not pill-shaped.
    - **Density**: High data density is good, but maintain whitespace hierarchy.

## Interaction Principles
1.  **Non-Blocking**: The system never freezes the UI for a background task. Use specific loading states (`Skeleton`).
2.  **Opt-In Interruptions**: The system **never** steals focus or pops up modals without user trigger.
    - *Bad*: Auto-opening a dialogue when an error occurs.
    - *Good*: Showing a passive "toast" or activity indicator that the user can click.
3.  **State Transparency**: The user must always know *what* the Autopilot is doing.
    - "Thinking...", "Writing to file...", "Waiting for approval".
4.  **Feedback**: Every action (save, config change) provides immediate visual feedback.

## Dashboard Layout ("Mission Control")
- **Header**: Global Status & Navigation.
- **Left Panel (Command)**: Input, Quick Actions, Active Session Control.
- **Center/Right (Intelligence)**: Visualize the "Brain" (Roadmap, Thoughts, Council).
- **Bottom/Peripheral (System)**: Hardware stats, Submodule status (Passive monitoring).

## Code Style (Frontend)
- **Tailwind**: Use utility classes for layout/spacing.
- **Lucide React**: Standard icon set.
- **Framer Motion**: Use for *subtle* entry animations and layout transitions (no "bouncy" or slow animations).
