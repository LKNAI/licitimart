// Diagnostico rapido de conexao Supabase, fora do runtime do Next.js
// (roda com `node check-supabase.mjs`, nao com supabase-js completo,
// porque o cliente realtime exige WebSocket nativo -- so em Node 22+).
// Nao imprime nenhum segredo -- so status HTTP e corpo de erro do
// PostgREST, uteis para diferenciar "URL/chave erradas" de "tabela nao
// existe" (migration nao rodada) de "conexao ok".
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, ""); // remove barra(s) final(is)
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const resp = await fetch(`${url}/rest/v1/contratacoes?select=id&limit=1`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

const corpo = await resp.text();

if (resp.status === 200) {
  console.log(`CONEXAO OK e schema aplicado -- tabela 'contratacoes' existe. Resposta: ${corpo}`);
} else if (resp.status === 404 || corpo.includes("42P01") || corpo.includes("does not exist")) {
  console.log("CONEXAO OK, mas a tabela 'contratacoes' NAO EXISTE ainda -- a migration não foi rodada no SQL Editor.");
  console.log("Detalhe:", resp.status, corpo);
} else {
  console.log("Resposta inesperada:", resp.status, corpo);
}
