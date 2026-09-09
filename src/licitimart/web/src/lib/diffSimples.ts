// Diff de palavras por LCS (Longest Common Subsequence) -- simples e
// deliberadamente pequeno, o bastante para o exemplo de RF-018. Um diff
// de verdade sobre edital real entraria como parte do coletor (comparar
// duas coletas da mesma numeroControlePNCP), nao aqui.
export type TrechoDiff = { tipo: "igual" | "removido" | "adicionado"; texto: string };

export function diffPalavras(antes: string, depois: string): TrechoDiff[] {
  const a = antes.split(/(\s+)/);
  const b = depois.split(/(\s+)/);

  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const resultado: TrechoDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      resultado.push({ tipo: "igual", texto: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      resultado.push({ tipo: "removido", texto: a[i] });
      i++;
    } else {
      resultado.push({ tipo: "adicionado", texto: b[j] });
      j++;
    }
  }
  while (i < a.length) resultado.push({ tipo: "removido", texto: a[i++] });
  while (j < b.length) resultado.push({ tipo: "adicionado", texto: b[j++] });

  return resultado;
}
