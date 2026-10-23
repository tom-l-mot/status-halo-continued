# Changelog

## 0.2.0-dev.1 - Foundry 14 development build

Community continuation of mxzf's Status Halo, maintained at [tom-l-mot/status-halo-continued](https://github.com/tom-l-mot/status-halo-continued).

- Use Foundry's token refresh hook instead of replacing effect drawing methods.
- Preserve core overlay handling, effect tints, and icon visibility selection.
- Arrange rendered icons without counting actor or token effect documents.
- Center the halo on rectangular tokens and release masks when icons are destroyed.
- Add regression checks and local ZIP packaging.

Live verification against Foundry 14.369 with Pathfinder 2e 8.5.1 is pending. This is not a stable release.

## 0.1.2 - Small bugfixes

Tweaks to the way overlay tokens are handled in order to resolve some issues with the rendering of overlay statuses.  

## 0.1.1 - V11 support

Fixed issue caused by PIXI library update in V11 that caused icons to fail to render

## 0.1.0 - Initial Release

Override status icon rendering to render status icons in a circle around the token.

Currently a very rough version, which may not play nicely with other things that tweak token status rendering and so on.  

##
