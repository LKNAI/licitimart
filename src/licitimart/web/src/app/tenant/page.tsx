import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import ItemCatalogoForm from "./ItemCatalogoForm";
import RemoverItemBotao from "./RemoverItemBotao";
import CertidaoForm from "./CertidaoForm";
import RemoverCertidaoBotao from "./RemoverCertidaoBotao";
import AtestadoUploadForm from "./AtestadoUploadForm";
import RemoverAtestadoBotao from "./RemoverAtestadoBotao";
import { SeloCompacto } from "@/components/Selo";

export default async function TenantPage() {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // middleware já bloqueia isto antes de chegar aqui

  const { data: minhaMembresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!minhaMembresia) return null; // middleware manda pra /onboarding

  const tenantId = minhaMembresia.tenant_id as number;

  const { data: itens, error } = await supabase
    .from("tenant_catalogo_itens")
    .select("id, descricao, cnae, ncm")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: true });

  const { data: certidoes } = await supabase
    .from("tenant_certidoes")
    .select("id, tipo, numero, validade")
    .eq("tenant_id", tenantId)
    .order("validade", { ascending: true });

  const { data: atestados } = await supabase
    .from("tenant_atestados")
    .select("id, titulo, storage_path, criado_em")
    .eq("tenant_id", tenantId)
    .order("criado_em", { ascending: false });

  // URL assinada pra cada atestado -- bucket privado, sem link publico.
  const atestadosComUrl = await Promise.all(
    (atestados ?? []).map(async (a) => {
      const { data: assinada } = await supabase.storage
        .from("tenant-atestados")
        .createSignedUrl(a.storage_path, 60 * 10);
      return { ...a, url: assinada?.signedUrl ?? null };
    })
  );

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Perfil do Tenant</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
        Catálogo, CNAEs/NCMs de interesse, certidões e atestados de capacidade técnica —
        persistido no Supabase real.
      </p>

      {error && <p className="mt-4 text-[13px] text-seal-red">{error.message}</p>}

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">Catálogo de itens</h2>
      <div className="mt-3 overflow-x-auto border-y border-line">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-ink-faint">
              <th scope="col" className="py-2.5 font-medium">Descrição</th>
              <th scope="col" className="py-2.5 font-medium">CNAE</th>
              <th scope="col" className="py-2.5 font-medium">NCM</th>
              <th scope="col" className="py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens?.length ? (
              itens.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 text-ink">{item.descricao}</td>
                  <td className="py-2.5 font-mono text-[12.5px] text-ink-soft">{item.cnae ?? "—"}</td>
                  <td className="py-2.5 font-mono text-[12.5px] text-ink-soft">{item.ncm ?? "—"}</td>
                  <td className="py-2.5 text-right">
                    <RemoverItemBotao itemId={item.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-4 italic text-ink-faint">
                  Nenhum item de catálogo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ItemCatalogoForm tenantId={tenantId} />

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Certidões</h2>
      <p className="mt-1 text-[12.5px] text-ink-faint">
        Status calculado a partir da data de validade, nunca marcado à mão — não fica defasado sozinho.
      </p>
      <div className="mt-3 overflow-x-auto border-y border-line">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-ink-faint">
              <th scope="col" className="py-2.5 font-medium">Tipo</th>
              <th scope="col" className="py-2.5 font-medium">Número</th>
              <th scope="col" className="py-2.5 font-medium">Validade</th>
              <th scope="col" className="py-2.5 font-medium">Status</th>
              <th scope="col" className="py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {certidoes?.length ? (
              certidoes.map((c) => {
                const ativa = c.validade >= hoje;
                return (
                  <tr key={c.id}>
                    <td className="py-2.5 text-ink">{c.tipo}</td>
                    <td className="py-2.5 font-mono text-[12.5px] text-ink-soft">{c.numero ?? "—"}</td>
                    <td className="py-2.5 font-mono text-[12.5px] text-ink-soft">
                      {new Date(c.validade + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2.5">
                      <SeloCompacto tom={ativa ? "green" : "red"}>{ativa ? "Ativa" : "Vencida"}</SeloCompacto>
                    </td>
                    <td className="py-2.5 text-right">
                      <RemoverCertidaoBotao certidaoId={c.id} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-4 italic text-ink-faint">
                  Nenhuma certidão cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <CertidaoForm tenantId={tenantId} />

      <h2 className="mt-10 font-display text-lg font-semibold text-ink">Atestados de capacidade técnica</h2>
      <p className="mt-1 text-[12.5px] text-ink-faint">
        Upload próprio do tenant — bucket privado, nunca visível a outro tenant.
      </p>
      <div className="mt-3 divide-y divide-line border-y border-line">
        {atestadosComUrl.length ? (
          atestadosComUrl.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-[13.5px] font-medium text-ink hover:text-seal-green">
                    {a.titulo}
                  </a>
                ) : (
                  <span className="text-[13.5px] font-medium text-ink">{a.titulo}</span>
                )}
                <div className="text-[12px] text-ink-faint">
                  enviado em {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <RemoverAtestadoBotao atestadoId={a.id} storagePath={a.storage_path} />
            </div>
          ))
        ) : (
          <p className="py-4 italic text-[13.5px] text-ink-faint">Nenhum atestado enviado ainda.</p>
        )}
      </div>
      <AtestadoUploadForm tenantId={tenantId} />
    </div>
  );
}
