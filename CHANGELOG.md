# Changelog

## 0.2.0 - 2026-10-23

- Support Foundry VTT 14, verified on build 14.369 with Pathfinder 2e 8.6.1.
- Place compact, circular status icons so their backgrounds touch the rendered token edge and adjacent backgrounds when they fit.
- Size the halo from rendered dimensions, including Small token texture scaling and dynamic ring padding.
- Scale icons gently across token sizes, with lower and upper bounds.
- Verify the six reference sizes from Tiny through Gargantuan after a normal world reload, and check dynamic ring sizing live.
- Add automated coverage for compact spacing, rendered sizing, dynamic rings, and core effect behavior.

## 0.2.0-dev.1 - Historical Foundry 14 development build

Community continuation of mxzf's Status Halo, maintained at [tom-l-mot/status-halo-continued](https://github.com/tom-l-mot/status-halo-continued).

- Use Foundry's token refresh hook instead of replacing effect drawing methods.
- Preserve core overlay handling, effect tints, and icon visibility selection.
- Arrange rendered icons without counting actor or token effect documents.
- Center the halo on rectangular tokens and release masks when icons are destroyed.
- Add regression checks and local ZIP packaging.

At this development stage, live verification against Foundry 14.369 with Pathfinder 2e 8.5.1 was pending. This entry records the earlier development build, not the stable release above.

## 0.1.2 - Small bugfixes

Tweaks to the way overlay tokens are handled in order to resolve some issues with the rendering of overlay statuses.  

## 0.1.1 - V11 support

Fixed issue caused by PIXI library update in V11 that caused icons to fail to render

## 0.1.0 - Initial Release

Override status icon rendering to render status icons in a circle around the token.

Currently a very rough version, which may not play nicely with other things that tweak token status rendering and so on.  

##
