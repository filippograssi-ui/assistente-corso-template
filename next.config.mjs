/** @type {import('next').NextConfig} */
const nextConfig = {
  // Il seed dei dati viene letto a runtime con fs: va incluso esplicitamente
  // nel pacchetto che finisce online (altrimenti su Vercel non si trova).
  outputFileTracingIncludes: {
    "/**": ["./data/seed.json"],
  },
};

export default nextConfig;
