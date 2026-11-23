# Opinions

Ten decisions every UI Polish component shares. Each one is a token or a
rule, so a project that disagrees changes one value and every component
that uses it follows.

- **Leave fast, arrive slower.** Things leave in 120ms and arrive in 160 to 200ms, on an ease-out curve. Nothing eases on linear, and no transition takes longer than 380ms.
- **Springs only where something moves.** The highlight sliding between tabs or a panel changing size overshoots a little, then settles. Opacity and color never bounce.
- **Busy waits 300ms before it shows.** A fast answer never flashes a spinner. Once a spinner appears, it stays at least 400ms so it can be read.
- **Every async action has four states.** Idle, busy, done and failed, each designed, with the failure saying what to do next.
- **One line for every edge.** A card, a field, a button and a divider share one solid neutral at one 1px weight, so no line reads darker, lighter or thicker than the one beside it.
- **Focus is for keyboards.** A thin ring inside the control's edge on `:focus-visible`, never a halo on click.
- **Nothing shifts.** Labels that change hold their width, numbers use tabular figures, and content that loads in has its space reserved.
- **One shape per job.** Controls are 32, 40 or 48px tall, whatever they are, and everything you click or type in shares one rounded-rectangle edge, 12px; every corner is on one 4px scale: 4 for inline marks, 8 for tags and small buttons, 12 for controls, fields and rows, 16 for boxes. Pills are only for things round by nature: a switch, a slider, a progress bar, an avatar. An icon-only button is square.
- **Native and accessible first.** Every control works from the keyboard, announces what changed, and has a 24px target for a mouse and 40px for a finger.
- **Reduced motion keeps the meaning.** Movement becomes a fade; nothing that carries meaning disappears.
