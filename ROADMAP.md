# Mood Journal Creative Roadmap

Use this private local file to capture future ideas before deciding what should become public documentation or app features.

## Near-Term Polish

- Calendar archive polish: keep the month view readable, add soft day markers for saved entries, and keep selected-day details friendly.
- Theme consistency pass: make Cozy Cafe, Sunset/Sunrise, Garden, Seafoam, and Night Sky feel distinct while keeping forms readable.
- Image asset cleanup: keep only active theme assets plus protected game/sticker assets; compress large PNG/JPG files before commits.
- Mobile visual check: verify that theme artwork, sticky action bars, and card layouts do not overlap or crowd small screens.
- Shared button polish: improve primary, secondary, icon, pill, toolbar, card action, and navigation buttons so they feel consistent across all themes, with clear hover, focus, disabled, and mobile states.
- Weekly Summary history: keep previous-week navigation clear, and later consider month/season summary views once there is enough data.
- Journal tagging: explore turning a trailing `#tag` in an entry into a searchable tag, without making users fill out a separate Tags field. Decide later whether the marker stays in the writing and how multiword tags should work.
- Monthly Journal History: show previous months as individual solid-color journal covers labeled with the month and year. Opening a cover should reveal that month's saved entries.
- Monthly Journal covers can display stickers collected or placed during that month. Keep cover color and sticker placement decorative and user-controlled rather than tied to emotional performance.
- Inside a monthly journal, tint each dated page using that day's primary saved mood color. Keep text contrast accessible, and use a calm neutral page when a day has no mood or contains only a free write without a selected mood.
- Performance pass: code-split heavier routes such as Summary charts and Games so Recharts/game assets do not all land in the first app bundle.
- Legacy cleanup pass: review the old `legacy/` canvas prototypes before deleting or archiving anything useful.

## Sticker Book Ideas

- Sticker Book: collect simple theme-matching stickers users can earn, place, or use as decorative journal rewards later.
- Add an `Add sticker` tool to new and editable journal pages once the sticker collection is functional. It should open the user's unlocked stickers without leaving the page.
- Let users place, move, resize, rotate, and remove stickers on the notebook page. Keep stickers away from writing by default, but allow intentional overlap after placement.
- Save sticker ID, position, size, rotation, and layer order with the journal entry so the decorated page looks the same in Entries, Calendar, and monthly history.
- Add a dedicated Sticker Book view for browsing unlocked, undiscovered, seasonal, theme, frog, bird, and achievement stickers.
- Show locked stickers as gentle silhouettes or empty collection spaces without emotionally demanding unlock instructions.
- Keep journal stickers decorative and optional. They must never affect mood summaries, streaks, achievements, or access to writing tools.
- Protect synced sticker ownership and entry placement data with Supabase Row Level Security tied to `auth.uid()`.
- Night Sky purple flame sticker: moonlight-fire palette with deep violet outer flame, lavender middle flame, pale moon-white center, and tiny muted-gold sparks.
- Night Sky beginner stickers: crescent moon with sleepy face, lavender star, twinkle cluster, cloud with moon, potion bottle with stars, ringed planet, shooting star, mini constellation, sleepy candle flame, and open journal with stars.
- Sticker creation workflow: trace the outer shape first, close the outline, bucket-fill it, then add middle/inner shapes and sparkles on separate layers.
- Keep stickers beginner-friendly: simple silhouettes, thick outlines, 2-4 colors, transparent backgrounds, and small reusable accent shapes.
- Future sticker sets should match each theme: Cozy Cafe mugs/leaves/pumpkins, Garden flowers/leaves, Seafoam shells/bubbles/starfish, Sunrise suns/clouds/waves, Night Sky moons/stars/flames.

## Sticker Creation Checklist

Export each finished sticker as transparent PNG in both 512px and 256px versions when possible. Use the same palette structure for each sticker: outline, main fill, shadow, highlight, accent/details, and sticker border when needed.

### Night Sky

- [x] Flame: source finished `flame_512.png` and `flame_256.png`. Palette: outline `#4F4A96`, main fill `#B7B0FF`, shadow `#7772C8`, highlight `#F5F1FF`, accent/details `#F3C969`, sticker border optional `#FFFFFF`.
- [x] Twinkle: source finished `twinkle_512.png` and `twinkle_256.png`. Palette: outline `#4F4A96`, main fill `#F5F1FF`, shadow `#D8D1FF`, highlight `#FFFFFF`, accent/details `#F3C969`, extra dashes `#B7B0FF`.
- [x] Shooting star: source finished `shooting_star_512.png` and `shooting_star_256.png`. Palette: outline `#4F4A96`, main fill `#FFF4CF`, shadow `#F3C969`, highlight `#F5F1FF`, accent/details `#D8D1FF`, tail main `#B7B0FF`, tail shadow `#7772C8`.
- [x] Sleepy moon: source finished `sleepy_moon_512.png` and `sleepy_moon_256.png`. Palette: outline `#25243D`, main fill `#F5F1FF`, shadow `#D8D1FF`, highlight `#FFFFFF`, accent/details `#F3C969`, cheek `#E8B8C7`, sticker border `#FFFFFF`.
- [x] Planet: source finished `planet_512.png` and `planet_256.png`. Palette: outline `#4F4A96`, main fill `#B7B0FF`, shadow `#7772C8`, highlight `#D8D1FF`, accent/details `#F5F1FF`, ring main `#FFF4CF`, ring shadow `#F3C969`.


### Cozy Cafe

- [x] Coffee mug: source `coffee.png`. Palette: outline `#3A2620`, main fill `#FFF7EF`, shadow `#F0C7B6`, highlight `#F5E9DF`, accent/details `#A85E3B`, coffee `#6B4A3A`, steam `#D8A47F`.
- [x] Pumpkin: source `pumpkin.webp`. Palette: outline `#6B2B1F`, main fill `#E0A07A`, shadow `#A85E3B`, highlight `#FFF1C9`, accent/details `#F4A261`, stem `#7C8A3D`, vine `#6B4A3A`.
- [x] Cookie: source `cookies.jpg`. Palette: outline `#6B4A3A`, main fill `#D8A47F`, shadow `#A85E3B`, highlight `#FFF1C9`, accent/details `#3A2620`, crumb detail `#E0A07A`.
- [ ] Pinned note: source `pinned_note.webp`. Palette: outline `#6B4A3A`, main fill `#FFF7EF`, shadow `#E0A07A`, highlight `#F5E9DF`, accent/details `#A85E3B`, ruled lines `#8EA0AE`, tape `#FFFFFF`.
- [x] Fall leaf: source `lwaf_variety.webp`; choose one simple oval or maple leaf. Palette: outline `#3A2620`, main fill `#D9A45F`, shadow `#A85E3B`, highlight `#FFF1C9`, accent/details `#E0A07A`, stem `#6B4A3A`.

### Sunset/Sunrise

- [x] Sun doodle: source `sun_doodle.webp`. Palette: outline `#BF5F6B`, main fill `#F3C969`, shadow `#E88672`, highlight `#FFF8ED`, accent/details `#FFD28A`.
- [ ] Simple sun: source `sun_variety.webp`; choose one face or clean ray shape. Palette: outline `#6B3B46`, main fill `#F3C969`, shadow `#F4A261`, highlight `#FFF1C9`, accent/details `#E88672`, face `#3F302A`.
- [x] Soft cloud sticker: completed transparent exports `cloud_sticker.png` and `cloud_sticker_256.png` in `img/Sticker_book/sunset_inProg/`.
- [ ] Sun and cloud: source `sun_and_clud.webp`; simplify the rainbow if needed. Palette: outline `#6B3B46`, main fill `#FFF8ED`, shadow `#D8D1FF`, highlight `#FFFFFF`, accent/details `#F3C969`, rainbow peach `#E88672`, rainbow gold `#FFD28A`, rainbow aqua `#98DCE0`.
- [ ] Wave or horizon badge: source existing sunrise wave/horizon assets. Palette: outline `#6B3B46`, main fill `#FFE0D3`, shadow `#BF5F6B`, highlight `#FFF8ED`, accent/details `#F3C969`, coral band `#E88672`.

### Garden

- [ ] Cherry blossom: source `cherry-blossom.png`. Palette: outline `#263726`, main fill `#E8B8C7`, shadow `#EF7C82`, highlight `#FBF7E7`, accent/details `#49653F`, center `#FFFFFF`.
- [ ] Butterfly: source `butterfly.jpg`. Palette: outline `#49653F`, main fill `#EF7C82`, shadow `#C95C6C`, highlight `#E8B8C7`, accent/details `#263726`, sticker border `#F8FFF0`.
- [ ] Daisy: source `ducklings-daisy-discovery.png`; use the daisy, not the duck, for the starter set. Palette: outline `#49653F`, main fill `#F8FFF0`, shadow `#D8E7CD`, highlight `#FFFFFF`, accent/details `#F3C969`, stem/leaves `#7C9B68`.
- [ ] Mushroom: source `mushroom.jpg`. Palette: outline `#263726`, main fill `#EF7C82`, shadow `#A85E3B`, highlight `#FBF7E7`, accent/details `#F0C7B6`, ground `#D9A45F`.
- [ ] Watering can: source `watering_can.png`. Palette: outline `#49653F`, main fill `#E8B8C7`, shadow `#EF7C82`, highlight `#F8FFF0`, accent/details `#5DAEB2`, water drops `#98DCE0`.
- [ ] Special later: frog from `frog.png`. Palette: outline `#263726`, main fill `#B9D49B`, shadow `#7C9B68`, highlight `#FBF7E7`, accent/details `#E8B8C7`, eyes `#111111`.

### Seafoam

- [ ] Bubbles: source `bubbles.jpg`. Palette: outline `#327076`, main fill `#EFFFFE`, shadow `#98DCE0`, highlight `#FFFFFF`, accent/details `#23393D`.
- [ ] Coral: source `coral.webp`. Palette: outline `#327076`, main fill `#F0A7A0`, shadow `#5DAEB2`, highlight `#EFFFFE`, accent/details `#98DCE0`, optional lavender branch `#B7B0FF`.
- [ ] Starfish: source `starfish.webp`. Palette: outline `#327076`, main fill `#F3A673`, shadow `#F0A7A0`, highlight `#FFD28A`, accent/details `#FFF8ED`, sticker border `#EFFFFE`.
- [ ] Fish: source `goldfish.jpg` or `pufferfish.jpg`; choose whichever feels easier. Palette: outline `#23393D`, main fill `#CDE6E4`, shadow `#98DCE0`, highlight `#EFFFFE`, accent/details `#5DAEB2`, cheek `#F0A7A0`.
- [ ] Ocean plants: source `ocean_plants.avif` or `corals.jpg`. Palette: outline `#327076`, main fill `#5DAEB2`, shadow `#23393D`, highlight `#EFFFFE`, accent/details `#98DCE0`.
- [ ] Special later: whale from `whale.png`. Palette: outline `#23393D`, main fill `#98DCE0`, shadow `#5DAEB2`, highlight `#EFFFFE`, accent/details `#F0A7A0`.

## Future Mini Games

- Daily Constellation Builder: users tap stars, connect them, name the constellation, assign a mood, and save it to the journal.
- Night Sky Reflection: each journal day adds a star to a personal emotional galaxy, with brightness based on mood, intensity, streak, or meaning.
- Mood Garden: journal entries grow flowers, trees, mushrooms, stars, or crystals based on mood, color, growth, and weather.
- Memory Jar: positive moments become glowing notes in a jar that users can revisit later by day or month.
- Orbit Simulator: users place planets for emotions, goals, thoughts, fears, and relationships into a calming orbit.
- Enhanced Emotional Match: match emotions with coping strategies, affirmations, and calming symbols.

## Mood Garden Expansion

- Turn Mood Garden into a calm side-view 2D garden while keeping check-ins as the core interaction.
- Use the curated working assets in `img/1111x_PixelPlants/MoodGarden_Selected/` and keep final original artwork organized by flower family, growth stage, and intensity.
- Separate each plant's meaning into three parts: mood controls petal color, intensity controls the fullness of the final bloom, and elapsed time controls growth.
- Grow each planted flower across 24 hours using `plantedAt`: sprout, leafy sprout, stalk, buds, then final bloom. Calculate elapsed time so growth continues while the app is closed.
- Keep four detailed flower families for the initial system: cream wildflower, rose, sunflower, and daisy. Add lily and blue-flower families when matching growth stages are ready.
- Archive each completed month as a read-only garden using saved flower data and positions. Render the archive as a scene first; add downloadable image snapshots later.
- Upgrade the building through cumulative active days: simple cottage, larger shed, then detailed workshop. Missing a day must not reset progress.
- Build the environment in layers: sky, distant scenery, building, ground, garden bed, plants, creatures, weather, and lighting.
- Use the completed clouds in `img/Sticker_book/Game_Inprog/`: two wind variants for weather, the moving cloud for the sky layer, and the wide background cloud behind the building layer. Normalize the background-cloud filenames when integrated.
- Add dawn, day, sunset, and night states. Keep the cottage transparent and separate from the sky so the scene can change with local time.
- Add seasonal scenery much later using layered backgrounds rather than redrawing every building combination. Keep spring, summer, autumn, and winter scenery behind the transparent cottage/shed/workshop layer.
- Keep seasonal ground layers separate from distant scenery so snow patches, fallen leaves, blossoms, the garden bed, plants, and creatures can overlap correctly.
- Reuse the same time-of-day sky system across all seasons to avoid creating separate dawn/day/sunset/night artwork for every season.
- Support automatic seasons with a manual override later so users in different hemispheres or climates are not forced into the wrong season.
- Before creating seasonal assets, review the gathered reference images together and mark each one as keep, adapt, or scrap based on perspective, pixel scale, palette, and compatibility with the layered scene.
- Use current `Garden Birds_Download/Spritesheets` files as ambient visitors. The selected sheets are 64x64 atlases with 4x4 grids of 16x16 frames; do not use `Spritesheets_Old`.
- Keep birds as temporary atmosphere and frogs as rarer discoveries that can unlock permanent stickers.

## Mood Orbit Expansion

- Replace plain Mood Orbit circles with the six transparent 64x64 pixel planets in `img/Planets for orbit/` while preserving the existing drag, touch, keyboard, and ring-snap behavior.
- Suggested mapping: Neptune for Emotion, Uranus for Thought, Saturn for Goal, Jupiter for Habit, Venus for Relationship, and Earth for Body.
- Normalize visual size inside 56px hit areas, use `image-rendering: pixelated`, and keep selected/dragging states visible beyond color alone.
- Rename `Urinas 2.png` to `uranus.png` and `Neptunee.png` to `neptune.png` when the assets are integrated.

## Gentle Achievements

- Add an achievement system later as a quiet collection book, after the journal and game loops are stable. Keep it cosmetic, optional, and separate from emotional progress.
- Focus achievements on discoveries: find the first frog, find every frog, spot the first bird, spot every bird, grow every flower family, collect seasonal visitors, and complete a garden collection page.
- Do not create achievements for mood type, emotional intensity, journal streaks, entry count, or completing wellness activities. The user should never feel evaluated or pressured to write.
- Missing a day must never remove collection progress or an earned reward.
- Reward discoveries with matching stickers, small garden decorations, cottage details, or collection badges. Do not lock journaling or wellness tools behind achievements.
- Keep achievement notifications quiet and dismissible, with reduced-motion support and a separate collection view for revisiting earned rewards.

## Game And Reflection Spaces

- Give featured games their own standalone cards so they do not feel mixed into everyday activities.
- Doodle page: add a calm drawing space later with simple pen/eraser/color controls, optional mood-colored backgrounds, save-to-entry support, and export/download.
- Create a dedicated constellation gallery where saved constellations can be revisited in a clear sky view.
- Make the Memory Jar look like an actual glass jar, with theme-based overlays, lighting, particles, and sticker accents.
- Let memory tags spread naturally inside the jar rather than stacking directly on top of each other.
- Consider a Monthly Jar view for reviewing saved positive memories by month.
- Keep activity timer cards simple, stylized, and focused on one completion action.

## Theme And Atmosphere Ideas

- Cozy Cafe: espresso, cream, warm paper, steam, pumpkins, fall leaves, cafe notes, and soft rain or window details later.
- Sunset/Sunrise: peach, gold, cream, muted pink, sun/cloud/wave accents, and gentle light gradients.
- Garden: moss, sage, botanical leaves, flowers, soft paper, and optional firefly-style dark mode later.
- Seafoam: aqua, teal, shell, bubbles, starfish, coral, fish, wave motion, and moonlight water details.
- Night Sky: deep navy, indigo, lavender, moon-white, stars, constellations, celestial banners, and slow nebula-style gradients.
- Apply across all themes: subtle translucency, layered depth, soft gradients, tiny hover elevations, and reduced-motion support for particles.

## Possible Libraries Later

- Framer Motion: page transitions, card movement, game state transitions, and gentle microanimations.
- Howler.js: optional ambient soundscapes such as cafe rain, ocean waves, soft night ambience, or garden ambience.
- Lucide icons: continue using for lightweight UI controls and small symbolic accents.

## Notes

- Keep this file local and private.
- Move polished public-facing ideas into README only when ready.
- Avoid adding heavy animation, sound, or asset systems until the core journal experience feels stable.
