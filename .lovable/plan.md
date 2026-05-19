Antes de codar, quero confirmar o escopo. A ideia é só **complementar** o que já está vivo (n8n, webhook, realtime do WhatsApp) e fazer cada aba do painel virar 100% funcional. Sem trocar visual a esmo, sem quebrar comandos humanos existentes.

## 1. Dashboard (`/`)
- Hoje mostra dados mockados → diverge do `/whatsapp` (5 vs 6).
- Trocar todas as métricas por queries reais em `gs_whatsapp_conversations` / `gs_whatsapp_messages` / `gs_whatsapp_contacts`:
  - total de conversas, abertas, precisando humano, IA pausada
  - mensagens últimas 24h (inbound/outbound)
  - últimos contatos
- Realtime: invalidar contadores quando `gs_whatsapp_*` mudar (reusar `useGsRealtime`).

## 2. IA não está respondendo
- Auditar: ver últimas `gs_whatsapp_messages` e `conversation_events` para entender se o n8n está realmente chamando IA ou só ecoando.
- Verificar `N8N_AI_CONTROL_URL` / `N8N_REQUEST_DRAFT_URL` / `N8N_HUMAN_OUTBOUND_URL` ainda apontam pro srv942445 certo.
- Testar `request_ai_draft` via `gsPanelCommand` e ver resposta real do n8n.
- Reportar exatamente onde parou (painel, n8n, ou OpenAI) — corrigir só do lado do painel; se for nó do n8n, devolver instrução clara.

## 3. WhatsApp `/whatsapp` — organização visual
- Manter cores e estrutura; só reorganizar:
  - lista de conversas com hierarquia clara (nome, prévia, hora, badges de status / IA / humano)
  - header da conversa enxuto (contato, telefone, vendedor atual, ações)
  - área de mensagens com agrupamento por dia + estado vazio decente
  - composer humano sempre visível quando IA pausada
- Sem refatorar lógica, só layout/spacing/tipografia.

## 4. CRM (`/crm`)
- Card de contato vira clicável → abre Sheet/Dialog com detalhes + conversas vinculadas + edição inline (nome, cidade, bairro, tags, stage, responsável).
- Botão **Novo contato** abre dialog real → `insert` em `gs_whatsapp_contacts`.

## 5. Conhecimento (`/conhecimento`)
- Hoje é mock estático. Migrar para `knowledge_items` (tabela já existe).
- Botão **Novo item**: dialog com categoria, título, conteúdo → insert.
- Cada card: editar inline / desativar / excluir-soft (`active=false`).
- Garantir que o n8n já lê dessa tabela (é o que ele consulta hoje); só confirmar no relatório.

## 6. Objeções (`/objecoes`)
- Hoje mock. Migrar para tabela `objections`.
- Botão **Nova objeção**: dialog (título, categoria, resposta recomendada, quando usar, risco, precisa humano, ativo) → insert.
- Editar linha + toggle ativo já gravando no banco.
- Confirmar que workflow do n8n consulta `objections` (caso não, deixar nota explícita pro lado n8n).

## 7. Aprendizados (`/aprendizados`)
- Migrar para `ai_learning_suggestions`.
- Permitir **editar** a sugestão antes de aprovar.
- Aprovar / Rejeitar grava status + chama `sendLearningFeedbackToN8n` (já existe).

## 8. Usuários (`/usuarios`)
- Botão **Convidar usuário** ativo: dialog com email + função → server fn `inviteUser` usando `supabaseAdmin.auth.admin.inviteUserByEmail` + insert em `user_roles`. Só admin pode.
- Permitir alterar função (admin/gestor/atendente) com `user_roles` upsert.

## 9. Configurações (`/configuracoes`)
- Listar o que tem hoje, ativar cada toggle/form para realmente persistir (provavelmente em `gs_commercial_facts` ou nova tabela `app_settings` se faltar — preferir reaproveitar `gs_commercial_facts` com `fact_type='setting'`).
- Salvar com toast + reload.

## Técnico
- Tudo client-side com `supabase` (RLS já permissiva pra authenticated).
- Server fn nova só pra **convidar usuário** (precisa service role).
- Realtime: estender `useGsRealtime` para incluir `knowledge_items`, `objections`, `ai_learning_suggestions` se ainda não cobre.
- Nada de mexer em `client.ts`, `types.ts`, webhook n8n, ou comandos humanos existentes.

## Entrega
Por aba: o que virou real, como testar, e — quando o gargalo for n8n — qual nó/url precisa ajuste do lado deles.

---

**Pergunta antes de começar:** posso atacar tudo isso de uma vez num PR grande, ou prefere por ordem de prioridade (sugestão minha: 2 IA → 1 Dashboard → 5 Conhecimento → 6 Objeções → 7 Aprendizados → 4 CRM → 8 Usuários → 9 Config → 3 visual WhatsApp)?