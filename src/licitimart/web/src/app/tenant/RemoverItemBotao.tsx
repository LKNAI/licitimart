"use client";

import { useTransition } from "react";
import { removerItem } from "./actions";

export default function RemoverItemBotao({ itemId }: { itemId: number }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciar(async () => { await removerItem(itemId); })}
      className="text-[12.5px] text-seal-red hover:underline disabled:opacity-50"
    >
      remover
    </button>
  );
}
