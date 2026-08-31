# Mood Journal Creative Roadmap

Use this private local file to dump raw ideas before deciding what should become public documentation or app features.

## Current Ideas

- Daily Constellation Builder: users tap stars, name the constellation, assign a mood, and save it to the journal.
- Mood Garden: journal entries grow flowers, trees, mushrooms, stars, or crystals based on mood, color, growth, and weather.
- Memory Jar: positive moments become glowing notes in a jar that users can revisit later.
- Orbit Simulator: users place planets for emotions, goals, and thoughts into a calming orbit.
- Enhanced Emotional Match: match emotions with coping strategies, affirmations, and calming symbols.
- Night Sky Reflection: each day adds a star to a personal emotional galaxy, with brightness based on mood, streak, or meaning.

## Implemented Direction

- Auth polish: app tabs should stay hidden until sign-in when Supabase is configured.
- Games tab: games should live in their own section instead of crowding Home or Activities.
- Night Sky Reflection: journal days can form a personal galaxy.
- Constellation Builder: users can save named constellation entries and view them later.
- Memory Jar: positive memories should collect in a more visual jar-style space.
- Theme system: start with CSS-only themes before adding sourced art, audio, or heavy animation libraries.
## Immediate Changes and Update

- Activities UI polish: make the page feel like an interactive reset checklist, not a row of large timer cards. Keep one active activity at a time, show Pause/Done/Reset only on the active card, make completed activities visibly checked off, and remove developer-facing text from the user interface.
- Check-In flow polish: convert the long form into a guided step-by-step check-in. Start with fewer main mood choices, reveal mood-specific feelings after a mood is chosen, keep journaling central, and move meals/water/sleep into optional body details.
- Homepage polish: keep the first screen centered on quick daily check-in, with gentle selected/saved/empty states and secondary stats that support the journal instead of dominating it.
- Homepage theme identity: add subtle theme-specific visuals so Cozy Cafe, Seafoam, Garden, Night, and Sunrise feel distinct without distracting from journaling. Use normal web assets such as JPG/PNG when they look better than hand-coded SVG line art.

## Later Theme Ideas

- Warm journal
- Night sky
- Garden
- Ocean calm

## Later Implementation ideas
1. Add theme system
    Theme Idea 1 — Forest Retreat 🌲

    Palette:

    deep forest green,
    moss,
    muted sage,
    warm bark browns.

    Effects:

    floating dust particles,
    soft ambient forest audio,
    tiny fireflies at night (dark mode).


2. Theme Idea 2 — Night Sky 🌌



    Palette:

    deep navy,
    indigo,
    muted violet,
    soft starlight cream.

    Effects:

    twinkling stars,
    drifting constellations,
    slow nebula gradients.



3. Theme Idea 3 — Rainy Café ☔

    Palette:

    espresso,
    amber,
    foggy gray,
    warm window light.

    Effects:

    rain streaks,
    window reflections,
    steam particles.

    Ambient:

    café sounds,
    soft jazz,
    rain loops.

4. Theme Idea 4 — Ocean Calm 🌊

    Palette:

    seafoam,
    muted blue,
    sand,
    moonlight teal.

    Effects:

    slow wave motion,
    floating particles,
    ripple animations.
5. Theme Idea 5 — Sunrise Minimal 🌅

    Cleaner:

    peach,
    soft gold,
    cream,
    muted pink.

6.
7. What I WOULD apply across all themes

    Use:

    subtle translucency,
    soft blur,
    layered depth,
    ambient glow,
    Example of GOOD frost usage

    Perfect areas for frost layering:

    Component	Frost?
    Activity cards	YES
    Floating widgets	YES
    Modals	YES
    Theme overlays	YES
    Music player	YES
    Navigation bar	LIGHT
    Main content background	NO
8
    
9. Ambient Shadows and Tiny hover elevations before heavy frost. 
- also add soft gradients
- Subtle animated particles that corresponds with the themes. Reduce motion should turn all particles off

    Especially:

    stars,
    dust,
    fireflies,
    rain.
# Libraries that can be considered
- framer motion for animations, effects card movements and so on
- Lucide or react icons
- Howler.js for when i want to add soundscapes
10. Let featured games be on their stand alone cards not on the same as the every day games.
- I sort of want them to be separate entities
- The memory jar should look like an actual jar when the users want to view it.
- create a section where they can view the constellations later on and it is sort of in its own place with like the sky and stars , nothing else obstructiong it.
- Let activity maps, the ones with timers be more stylized.
- add a subsection that reroutes to games instaed of all being jumbled up in activites

## Notes

- Keep this file local and private.
- Move polished ideas into README or a public roadmap only when ready.
