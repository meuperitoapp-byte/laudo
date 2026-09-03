# Módulo Pós-Laudo

Esclarecimentos / retificação / complementação **depois do laudo entregue**. Vale para
Perícia Judicial e Assistência Técnica. Plano completo: `docs/plano-modulo-pos-laudo.md`.
Schema: `supabase/migrations/20260905120000_pos_laudo_schema.sql`.

## Estado atual — fatia 1

O que já existe:

- **Gate**: a aba "Pós-laudo" (em `processos/[id]/page.tsx`) só aparece quando há um
  `laudos_gerados` com `tipo = 'laudo'` e `protocolado = true`. Antes disso, um rótulo
  desabilitado.
- **Marcar laudo como protocolado**: `marcarLaudoProtocolado` em
  `src/features/geracao-laudo/actions.ts` + diálogo de confirmação em
  `gerar-laudo-panel.tsx` (ação irreversível — o trigger `trg_laudos_gerados_congela`
  congela o conteúdo daquela versão). Recebe o nº do protocolo (opcional).
- **`/processos/[id]/pos-laudo`** — índice de ciclos + botão "Abrir novo ciclo".
- **`abrirCicloPosLaudo`** (`actions.ts`): cria `pos_laudo_ciclos` com
  `numero_ciclo = max+1`, `fluxo` **derivado de `processos.tipo_trabalho`** (nunca
  escolha do usuário), `laudo_base_id` = a **maior `versao` entre `tipo='laudo'` e
  `protocolado=true`** (filtro de tipo explícito). Dedup: se já há um ciclo `aberto` com
  o Registro da Demanda em branco, redireciona pra ele em vez de criar outro.
- **`/processos/[id]/pos-laudo/[cicloId]`** — só a etapa **"Registro da demanda"**:
  data da intimação, prazo, origem, natureza (multi), documento da intimação (escolhe um
  já anexado ao processo; opcional, com selo "Pendente" quando vazio). Autosave.
  `salvarRegistroDemanda` **não** mexe no `status` do ciclo.

Inerte, esperando as próximas fatias: triagem / matriz de pontos, documentos
supervenientes, quesitos do ciclo, geração de documento, conclusão vigente,
encerramento do ciclo, mudança da situação do processo.

## Arquivos

- `actions.ts` — `abrirCicloPosLaudo`, `salvarRegistroDemanda`.
- `abrir-ciclo-button.tsx` — client, botão do índice.
- `registro-demanda-form.tsx` — client, form da etapa Registro da Demanda (autosave).
- `rotulos.ts` — rótulos pt-BR das colunas `text` + CHECK do módulo.
