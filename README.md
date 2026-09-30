# span

An interactive picture of a 2x2 matrix. The two columns are the places the
basis vectors land, so you drag them, and the whole plane follows: the grid
warps, the unit square turns into a parallelogram, and its signed area is the
determinant.

I wanted this while learning linear algebra. Most of the subject is geometry
that gets taught as arithmetic, and a matrix stops being an array of numbers
once you can push on it and see where everything goes.

<!-- screenshot: add docs/screenshot.png (default view, det > 0) and link it here -->

## Run it

```
pnpm install
pnpm dev
```

`pnpm test` runs the math tests, `pnpm build` type-checks and bundles to
`dist/`.

## Using it

- Drag the red ring (the image of î) or the blue ring (the image of ĵ). Tips
  snap to half-integers when you get close; hold Alt to move freely.
- Tab to a ring and use the arrow keys: 0.1 per press, 1.0 with Shift.
- Reset glides back to the identity.
- A hatched region means the determinant is negative: the plane has been
  mirrored, and the arc from î to ĵ runs clockwise.

## What is in here

`src/math/mat2.ts` holds the linear algebra, written from scratch: determinant,
inverse, eigenvalues and eigenvectors from the characteristic polynomial (real,
repeated and complex cases), and a closed-form SVD. The tests check against
hand-computed values and against the defining identities on a fixed set of
pseudo-random matrices.

The plane is SVG, the rest is plain TypeScript on Vite. KaTeX is the only
runtime dependency. Colours, type and spacing are custom properties at the top
of `src/style.css`. Fonts (Barlow Condensed, IBM Plex Mono) come from Google
Fonts and fall back to local ones offline.

Planned next: eigenvector overlay, the SVD as rotate, scale, rotate, and
composing two matrices step by step.

## License

MIT
