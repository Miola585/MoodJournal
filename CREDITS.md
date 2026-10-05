# Artwork Credits

The editable credit list is [src/data/artCredits.json](src/data/artCredits.json). It records creators, local assets, source links, license status, and evidence. The About page displays names and source links directly from that file, so new entries do not need a second public list.

This is a work in progress, not a complete artwork or license audit. Creator details supplied by the project owner are recorded as such. A profile link or credit is not proof of a license.

## Adding Artwork

1. Add a credit entry before using a new asset. Record every local filename, the creator's preferred name, their profile link, and the exact original download or post URL.
2. Record the license name, download date, required attribution wording, and any edits or recolors. Leave unknown values as `null` or clearly pending; do not guess.
3. Keep the download-time license, receipt, or written permission in private records. Use `licenseEvidence` for a non-sensitive reference, not private correspondence or credentials. This JSON is bundled with the app and is public.
4. Confirm the intended use is covered: website, game, mobile app, monetization, editing, and distribution of raw files can have different limits. Save the terms that applied when you downloaded the asset.
5. Check the public **Art credits** section, then run `npm test`. A passing test checks the records, not legal permission or completeness.

For your own drawings, record yourself as creator, list the source and exported files, and note any third-party references or elements. Keep the original creator's credit when recoloring someone else's work.

## Pending Checks

- Library: the [pack's terms](https://sparksandpixels.itch.io/indoor-library-assetpack) allow game use and modifications, require credit for publication or commercial game use, and prohibit redistribution of the pack. The raw `img/libassetpack-tiled.png` is not being added to this commit. Confirm any use outside a game within the journaling app. The [owner-supplied license screenshot](docs/licenses/library-license-2026-10-04.png) is recorded; the original download date is not known.
- Seashells: all three filenames are confirmed by the project owner. Add each individual download URL and its license record.
- Coffee: the [supplied Vecteezy page](https://www.vecteezy.com/png/24781338-coffee-emoji-cup-with-eyes-kawaii-cup-element-for-menu-emoji-icon) lists Moch. Imam Lutfi and requires attribution, but describes a cup with eyes. Confirm that it is the source of the local cup-and-saucer artwork.
- Crescent: the Instagram creator handle is recorded. The original asset page and permission or license evidence are still needed. The source PNG is about 14 MB; a smaller export would improve loading without changing the drawing.
- Garden flowers, daisy, leaves, and ocean bubbles: creator profiles supplied by the project owner are recorded. Add individual asset URLs and download-time licenses. These credits do not cover the separate pixel-art game plants.
- Red sun and cloud: creator profiles are recorded. The red sun file is not currently imported; the yellow sun and cloud stickers need separate credits.
- Pixel planets and sun: [ImDaniell's download page](https://imdaniell.itch.io/planets-pixels) confirms the pack and filenames, but does not state reuse terms. Record an included license or obtain permission before treating the assets as cleared for release.
- Other artwork: review the remaining theme images, stickers, planets, stars, plants, logo, and illustrations. A filename, marketplace, or visual style does not establish human authorship. Follow the project's no-AI-generated-art preference when verifying sources.

The former dark moon, `img/Theme Img/night-celestial-accent.png`, is no longer referenced by the app. The original file has not been deleted. Light-mode artwork is unchanged and still needs its own source review.

Run `npm run credits:audit` to list image references without a credit record. It scans the app's static `new URL(...)` and CSS `url(...)` references; it does not prove every referenced catalog item is displayed, inspect unused downloads, or verify licenses. Keep checking those separately.

## Attribution And Permission

The intended journal is free to use, with any future proceeds intended for charity. That does not waive attribution, modification, app-use, or redistribution restrictions. Recheck licenses before adding donations, ads, paid access, or downloadable artwork. For a license marked noncommercial, confirm that the actual use qualifies; even [Creative Commons notes that charitable status alone is not decisive](https://creativecommons.org/faq/#does-my-use-violate-the-noncommercial-clause-of-the-licenses). CC's definition applies to CC licenses, not automatically to marketplace or artist-specific terms.

Vecteezy Free content requires attribution; use the wording and links supplied with each download and retain the applicable license record. Check the [Vecteezy license agreement](https://www.vecteezy.com/licensing-agreement) for use and redistribution restrictions. Do not assume that permission to display an image also permits publishing its raw source file in a public repository.

For assets obtained through social media, locate the original license or ask the rights holder for permission covering your intended use. Credit is separate from permission. See the [U.S. Copyright Office's visual-art guidance](https://www.copyright.gov/engage/visual-artists/).
