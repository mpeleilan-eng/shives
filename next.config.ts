import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pas de cacheComponents / partialPrefetching : l'appli dépend presque partout
  // du patron connecté, le rendu dynamique classique est plus simple.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
