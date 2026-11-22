import React, { useMemo } from 'react';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { Ctx2D } from './ctx2d';
import { previewPoints, snake } from './garden';

/** A small realistic drawing of one snake species on a patch of lawn. */
export function SnakePreview({ species, width, height }: { species: number; width: number; height: number }) {
  const picture = useMemo(
    () =>
      createPicture((canvas) => {
        const ctx = new Ctx2D(Skia, canvas);
        const g = ctx.createLinearGradient(0, 0, 0, height);
        g.addColorStop(0, '#5a9a33');
        g.addColorStop(1, '#3f7a24');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        const c = Math.min(width / 5.2, height / 3);
        ctx.save();
        ctx.translate((width - 5.2 * c) / 2, (height - 3 * c) / 2);
        snake(ctx, previewPoints(), species, c, 0.2);
        ctx.restore();
      }, Skia.XYWHRect(0, 0, width, height)),
    [species, width, height],
  );
  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
