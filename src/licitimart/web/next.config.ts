import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (pdfjs-dist) resolve o worker via caminho relativo em
  // tempo de execucao -- empacotado pelo bundler do Next (Turbopack),
  // esse caminho quebra ("Cannot find module .../pdf.worker.mjs").
  // serverExternalPackages faz o Next exigir o pacote direto do
  // node_modules em vez de empacotar, preservando a resolucao interna.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Badge circular "N" do dev tools do Next.js no canto da tela --
  // some em producao de qualquer forma, mas so atrapalha a conferencia
  // visual de layout durante o desenvolvimento.
  devIndicators: false,
};

export default nextConfig;
