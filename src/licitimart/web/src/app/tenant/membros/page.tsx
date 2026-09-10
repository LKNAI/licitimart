import { criarClienteSupabaseServer } from "@/lib/supabase/server";
import ConvidarForm from "./ConvidarForm";
import PapelSelect from "./PapelSelect";

export default async function MembrosPage() {
  const supabase = await criarClienteSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // middleware já bloqueia isto antes de chegar aqui

  const { data: minhaMembresia } = await supabase
    .from("tenant_membros")
    .select("tenant_id, papel")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!minhaMembresia) return null; // middleware manda pra /onboarding

  const tenantId = minhaMembresia.tenant_id as number;
  const souAdmin = minhaMembresia.papel === "admin_tenant";

  if (!souAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Membros do Tenant</h1>
        <div className="mt-4 border-l-2 border-seal-amber bg-seal-amber-bg px-4 py-3 text-[13.5px] text-seal-amber">
          Só administradores do tenant gerenciam membros. Seu papel atual é{" "}
          <strong>{minhaMembresia.papel}</strong>.
        </div>
      </div>
    );
  }

  const { data: membros, error } = await supabase.rpc("listar_membros_tenant", {
    p_tenant_id: tenantId,
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Membros do Tenant</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
        Gestão de acesso por papel — analista, gestor comercial, jurídico/compliance ou
        administrador.
      </p>

      {error && <p className="mt-4 text-[13px] text-seal-red">{error.message}</p>}

      <div className="mt-8 overflow-x-auto border-y border-line">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-ink-faint">
              <th scope="col" className="py-2.5 font-medium">E-mail</th>
              <th scope="col" className="py-2.5 font-medium">Papel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {membros?.map((m: { user_id: string; email: string; papel: string }) => (
              <tr key={m.user_id}>
                <td className="py-2.5 text-ink">
                  {m.email} {m.user_id === user.id && <span className="text-[12px] text-ink-faint">(você)</span>}
                </td>
                <td className="py-2.5">
                  <PapelSelect
                    tenantId={tenantId}
                    userId={m.user_id}
                    papelAtual={m.papel}
                    ehVoceMesmo={m.user_id === user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConvidarForm tenantId={tenantId} />
    </div>
  );
}
