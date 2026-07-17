// Animation strips are horizontal, square-framed sheets where frame size ==
// image height. That convention lets us slice frames without hardcoding a
// frame count per animation. Currently unused (the active sprite set is all
// static single-frame images via StaticSprite below) but kept for reuse if
// an animated pack is swapped in again.
export class AnimSheet {
  constructor(image, fps = 10) {
    this.image = image;
    this.frameSize = image.height;
    this.frameCount = Math.max(1, Math.round(image.width / image.height));
    this.fps = fps;
  }

  draw(ctx, elapsedSeconds, dx, dy, dw, dh, flip = false) {
    const frame = Math.floor(elapsedSeconds * this.fps) % this.frameCount;
    const sx = frame * this.frameSize;
    if (!flip) {
      ctx.drawImage(this.image, sx, 0, this.frameSize, this.frameSize, dx, dy, dw, dh);
    } else {
      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, sx, 0, this.frameSize, this.frameSize, 0, 0, dw, dh);
      ctx.restore();
    }
  }
}

export class StaticSprite {
  constructor(image) {
    this.image = image;
  }

  draw(ctx, dx, dy, dw, dh, flip = false) {
    if (!flip) {
      ctx.drawImage(this.image, dx, dy, dw, dh);
    } else {
      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, 0, 0, dw, dh);
      ctx.restore();
    }
  }
}
