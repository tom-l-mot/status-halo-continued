let circularMaskTexture = null;

/**
 * Count effects for halo
 * @param {object} token The token
 * @returns {number}     The number of effects to include in the halo
 */
function countEffects(token) {
    if (!token) {
      return 0;
    }

    const tokenEffectsLen = token.document.effects?.length || 0;
    const actorEffectsLen = token?.actor?.temporaryEffects.length || 0;
    const overlay = token?.actor?.temporaryEffects.some(effect => !!effect.getFlag("core", "overlay"));
   
    // Only exclude one overlay as the rest go into the halo
    return tokenEffectsLen + actorEffectsLen - ((overlay) ? 1 : 0);
}

function sortIcons(e1, e2) {
    if (e1.position.x === e2.position.x) {
      return e1.position.y - e2.position.y;
    }
    return e1.position.x - e2.position.x;
}

function updateIconSize(effectIcon, size) {
    effectIcon.width = size;
    effectIcon.height = size;
}

function polar_to_cartesian(r, theta) {
    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
    };
}

function updateIconPosition(effectIcon, i, effectIcons, token) {
    const actorSize = token?.actor?.size;
    /* let max = 20;
    if (actorSize == "tiny") max = 10;
    if (actorSize == "sm") max = 14;
    if (actorSize == "med") max = 16;*/
    let max = Math.max(Math.min(Math.ceil(Math.min(token?.document?.height, token?.document?.width)*15),40), effectIcons.length)
    //console.log(token.document, max)
    let ratio = i / max;
    // const angularOffset = i < max ? 0 : ratio / 2;
    const gridSize = token?.scene?.grid?.size ?? 100;
    const tokenTileFactor = token?.document?.width ?? 1;
    let sizeOffset = sizeToOffset(Math.min(token?.document?.height, token?.document?.width));
    //if (token?.document?.height <= 0.75 & i > 6 & effectIcons.length > 12) { sizeOffset = 2.2; ratio = i/(max-7); }
    //if (token?.document?.height <= 0.75 & i <= 6 & effectIcons.length > 12) {sizeOffset = 1.3; ratio = i/6; }
    const offset = sizeOffset * tokenTileFactor * gridSize;
    const initialRotation = (0.5 + (1 / max) * Math.PI) * Math.PI;
    const { x, y } = polar_to_cartesian(offset, (ratio + 0) * 2 * Math.PI + initialRotation);
    // debugger;
    effectIcon.position.x = x / 2 + (gridSize * tokenTileFactor) / 2;
    effectIcon.position.y = (-1 * y) / 2 + (gridSize * tokenTileFactor) / 2;
}

  // Nudge icons to be on the token ring or slightly outside
function sizeToOffset(size) {
    if (size >= 2) return 0.925
    else if (size >= 1) return 1.2
    else return 1.4
    if (size == "tiny") {
        return 1.4;
    } else if (size == "sm") {
        return 1.0;
    } else if (size == "med") {
        return 1.2;
    } else if (size == "lg") {
        return 0.925;
    } else if (size == "huge") {
        return 0.925;
    } else if (size == "grg") {
        return 0.925;
    }
    return 1.0;
}

function sizeToIconScale(size) {
 /*    if (size >= 4) {return 2.2}
    else if (size >= 3) {return 1.55}
    else if (size >= 2) {return 1.25}
    return 1.4;
    if (size <= 3) {return 1.2}
    else if (size <= 1) {return 1.2} */

    // Maybe something like this
    if (size >= 2.5) return size/2
    else if (size >= 1.5) return size*0.7
    return 1.4

    if (size == "tiny") {
        return 1.4;
    } else if (size == "sm") {
        return 1.4;
    } else if (size == "med") {
        return 1.4;
    } else if (size == "lg") {
        return 1.25;
    } else if (size == "huge") {
        return 1.55;
    } else if (size == "grg") {
        return 2.2;
    }
    return 1.2;
}

function drawBG(effectIcon, background, gridScale) {
    const r = effectIcon.width / 2;
    background.lineStyle((1 * gridScale) / 2, 0x956d58, 1, 0);
    background.drawCircle(effectIcon.position.x, effectIcon.position.y, r + 1 * gridScale);
//    background.beginFill(0xe9d7a1);
    background.beginFill(0x333333);
    background.drawCircle(effectIcon.position.x, effectIcon.position.y, r + 1 * gridScale);
    background.endFill();
}

function updateEffectScales(token) {
    // if (token?.actor?.size == "sm") return;
    const numEffects = countEffects(token);
    // debugger;
    if (numEffects > 0 && token.effects.children.length > 0) {
        const background = token.effects.children[0];
        if (!(background instanceof PIXI.Graphics)) return;

        background.clear();

        // Exclude the background and overlay
        const effectIcons = token.effects.children.slice(1, 1 + numEffects);
        const tokenSize = token?.actor?.size;

        const gridSize = token?.scene?.grid?.size ?? 100;
        // Reposition and scale them
        effectIcons.forEach((effectIcon, i, effectIcons) => {
            if (!(effectIcon instanceof PIXI.Sprite)) return;
            // debugger;

            effectIcon.anchor.set(0.5);

            const iconScale = sizeToIconScale(Math.min(token?.document?.height, token?.document?.width));
            const gridScale = gridSize / 100;
            const scaledSize = 12 * iconScale * gridScale;
            updateIconSize(effectIcon, scaledSize);
            updateIconPosition(effectIcon, i, effectIcons, token);
            drawBG(effectIcon, background, gridScale);
        });
    }
};

Hooks.once("init", () => {
  const origRefreshEffects = Token.prototype._refreshEffects;
  Token.prototype._refreshEffects = function (...args) {
    if (this) {
      origRefreshEffects.apply(this, args);
      updateEffectScales(this);
    }
  };

  const origDrawEffect = Token.prototype._drawEffect;
  Token.prototype._drawEffect = async function (src, tint, overlay = false) {
    if (this) {
      // debugger;
      if (!src) return;
      
      let tex = await loadTexture(src, { fallback: "icons/svg/hazard.svg" });
      let icon = new PIXI.Sprite(tex);
    
      if (!overlay) {
        const minDimension = Math.min(icon.width, icon.height);
        // Use the blurred pre-made texture and create a new mask sprite for the specific icon
        const myMask = new PIXI.Graphics().beginFill(0xffffff).drawCircle(55, 55, 55).endFill();
        //const myMask = new PIXI.Sprite(circularMaskTexture);
        //myMask.anchor.set(0.5,0.5);
        myMask.width = minDimension;
        myMask.height = minDimension;
        myMask.x = -icon.width/2
        myMask.y = -icon.height/2
  
        icon.mask = myMask;
        icon.addChild(myMask);
      }
      
      // debugger;
      return this.effects.addChild(icon);
    }
  };

  // Overriden to add overlay parameter to _drawEffect
  const origDrawOverlay = Token.prototype._drawOverlay;
  Token.prototype._drawOverlay = async function (src, tint) {
    const icon = await this._drawEffect(src, tint, true);
    if ( icon ) icon.alpha = 0.8;
    return icon;
  }
});