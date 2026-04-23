import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
});

export default withSerwist({
  // Tes autres configs Next.js ici
});
