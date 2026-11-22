import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { makeHedge } from './garden';

let hedgeCache: ReturnType<typeof makeHedge> | undefined;

/** Leafy garden hedge behind every screen, darkened so text stays readable. */
export function HedgeBackground({ width, height }: { width: number; height: number }) {
  const picture = useMemo(() => {
    if (hedgeCache === undefined) hedgeCache = makeHedge(Skia);
    const hedge = hedgeCache;
    return createPicture((canvas) => {
      const paint = Skia.Paint();
      if (hedge) {
        // TileMode.Repeat = 1, FilterMode.Linear = 1, MipmapMode.None = 0
        paint.setShader(hedge.makeShaderOptions(1 as never, 1 as never, 1 as never, 0 as never));
      } else paint.setColor(Skia.Color('#1f3d17'));
      canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
      const shade = Skia.Paint();
      shade.setShader(
        Skia.Shader.MakeLinearGradient(
          Skia.Point(0, 0), Skia.Point(0, height),
          [Skia.Color('rgba(10,26,8,0.5)'), Skia.Color('rgba(10,26,8,0.75)')], null, 0 as never,
        ),
      );
      canvas.drawRect(Skia.XYWHRect(0, 0, width, height), shade);
    }, Skia.XYWHRect(0, 0, width, height));
  }, [width, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
}
