# Compatibility record

Live checks ran on 2026-10-30 in Foundry VTT 14.369. The module renderer has no game-system branches. The checks below used dedicated test worlds with Status Halo Continued as the only enabled module.

| Game system | Version | Result |
| --- | --- | --- |
| Pathfinder 2e | 8.6.1 | Passed |
| D&D 5e | 6.0.6 | Passed |
| Starfinder 2e | 1.6.1 | Passed |

## Pathfinder 2e 8.6.1

Blinded, Frightened, and Prone produced four halo icons because PF2e also applied Off-Guard with Prone. Removing Prone removed both Prone and Off-Guard. Removing all tested conditions removed all icons and background shapes. A Dead overlay stayed centered, larger, and unmasked beside ordinary icons.

Tiny through Gargantuan, a rectangular token, and a dynamic ring passed rendered geometry checks. Texture scaling refreshed the halo size. Native actor-size linking and autoscaling refreshed sizes as the test NPC changed from Medium to Small, Large, and back. A normal reload restored all eight configured test halos. Switching scenes and changing Prone also passed.

The geometry fixture disabled PF2e actor-size linking on its own test tokens so one linked NPC could demonstrate multiple sizes at once. An early fixture setup ran before the canvas finished drawing and raised Foundry render and ruler errors. After the canvas settled, subsequent checks and a normal reload passed. No console errors were captured after the verified reload.

## D&D 5e 6.0.6

Blinded, Frightened, and Prone produced three masked halo icons. Removing Prone left two icons and four circle background shapes. Removing all three conditions removed all icons and background shapes. A Dead overlay stayed centered, larger, and unmasked beside ordinary icons.

Tiny through Gargantuan, a rectangular token, and a dynamic ring passed rendered geometry checks. Icon placement matched the ellipse defined by visible token dimensions and the background radius. Texture scaling refreshed halo size. A normal reload restored all eight configured test halos. Switching scenes and changing Prone also passed. The browser console error log was empty after the completed checks.

## Starfinder 2e 1.6.1

Blinded, Frightened, and Prone produced four masked halo icons, including the system's automatic Off-Guard icon. Removing Prone also removed Off-Guard. Removing all tested conditions removed all icons and background shapes. A Dead overlay stayed centered, larger, and unmasked beside the ordinary icons.

Tiny through Gargantuan, a rectangular token, and a dynamic ring passed rendered geometry checks. Texture scaling refreshed halo size. Native actor-size linking and autoscaling refreshed the halo as the test NPC changed from Medium to Small, Large, and back. A normal reload restored all eight halos. Switching scenes, then removing and restoring Prone, passed. The final browser console error log was empty.

The first scripted NPC lacked SF2e's current schema marker. It was replaced through native actor creation, and the eight test tokens were linked to the replacement. The replacement's schema matched the world's 0.959 schema. The final reload showed no migration warning. The existing party actor was not edited.

## Automated checks

The 0.2.2 source passed `node --check main.js`, `node --test` with 37 tests, and `py -3.12 -m unittest discover -s tests -p 'test_*.py'` with 2 tests. `git diff --check` also passed. The installed JavaScript used for live testing matches this source byte for byte.

## Limits

Other systems, other modules, transparent artwork margins, off-center anchors, and other Foundry versions are unverified. The live checks do not cover every system-specific effect type. Live geometry checks cover rendered integration and finite placement. Automated tests separately cover expected geometry. System IDs alone do not establish compatibility.
