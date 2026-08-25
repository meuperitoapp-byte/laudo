# CLAUDE.md — Sistema de Laudos Periciais (Dra. Fernanda)

Este arquivo dá contexto ao Claude Code sobre o projeto. Leia antes de gerar qualquer código.

## Visão geral

Sistema SaaS web sob encomenda para a **Dra. Fernanda**, médica perita judicial. O sistema
gera **laudos médico-periciais** para diferentes tipos de processo, a partir de formulários
estruturados por marcação de opções — não digitação livre de laudo inteiro.

Cliente final: Dra. Fernanda (perita) e sua secretária. Apenas 2 perfis de usuário, sem
outros peritos ou assistentes técnicos usando o sistema.

## Fluxo aprovado pela cliente

1. Escolha inicial: **Perícia Judicial** ou **Assistência Técnica**
   - Perícia Judicial → cadastro completo do processo (vara, comarca, partes, etc.) — fluxo já
     100% desenhado
   - Assistência Técnica → pode não haver processo judicial formal ainda. Fluxo próprio: o
     usuário seleciona quais etapas foram contratadas (análise de viabilidade, parecer
     técnico, assistência técnica fase 1, assistência técnica fase 2, quesitos, declaração e
     atestados)
2. Cadastro do processo (partes, vara/comarca, número do processo, etc.)
3. Escolha da **natureza do processo** → define o **template do laudo** a ser usado
4. Cabeçalho do laudo é preenchido automaticamente a partir dos dados do processo
5. Preenchimento do laudo por **seções**, cada seção com campos de marcação de opções
   (seleção única ou múltipla, conforme o campo) — **todo campo também aceita texto livre**
   para individualização/detalhamento
6. **Texto automático**: a partir das marcações, o sistema gera o texto narrativo daquela
   seção. Esse texto é sempre editável pelo perito antes da finalização.
7. **Respostas reutilizáveis**: respostas já dadas em laudos anteriores podem ser
   reaproveitadas
8. **Quesitos**: campo aberto — cola a pergunta do juízo/partes e responde (não é uma lista
   fixa de perguntas)
9. Upload de imagens da perícia e documentos, mantendo ordem
10. Assinatura: **imagem da assinatura** da perita inserida no documento final (sem
    integração com assinatura digital externa tipo ICP-Brasil/gov.br)
11. Geração do laudo final em dois formatos: **Word e PDF**, com a **logomarca da cliente**
    na folha

### Regra de exibição crítica
A tela de preenchimento mostra **todas as opções possíveis** de cada campo. O **laudo final
só exibe o que foi efetivamente marcado**, já convertido em texto narrativo — nunca mostra
checkboxes/opções não marcadas no documento final.

### Regra do cabeçalho formal
O laudo final **sempre** começa com o endereçamento formal ao juízo, no topo do documento
(antes de qualquer outro conteúdo, sem título de "modelo" ou nome do padrão antecedendo):

```
EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) [FEDERAL/DE DIREITO/DO TRABALHO] DA ___ VARA
[...] DA [SUBSEÇÃO JUDICIÁRIA/COMARCA] DE _______________ - ___

Processo nº: [...]
Parte autora / Reclamante: [...]
Parte ré / Reclamada(s): [...]
```

seguido da seção "APRESENTAÇÃO" com texto padrão de identificação do perito e metodologia.
Esse cabeçalho **não** aparece nas telas de preenchimento por seção — só no documento
compilado final.

## Tipos de laudo suportados (10 no total)

A cliente definiu 10 tipos de laudo que o sistema precisa suportar. Modelos completos já
recebidos e mapeados (estrutura seção a seção, campos, textos automáticos):

1. **Curatela / capacidade civil** — 19 seções
2. **Previdenciário** (INSS, benefício por incapacidade) — 26 páginas, XXVI seções
3. **Trabalhista** (doença ocupacional, acidente de trabalho, nexo causal) — 27 páginas,
   XXXIII seções + 3 anexos

Ainda não recebidos (aguardando a cliente enviar):
4. Medicamentos de alto custo / tratamentos médicos
5. Cirurgia plástica / estética
6. Erro médico
7. Criminal
8. Deficiência física
9. Securitária
10. Atestados médicos / licenças médicas

**Importante:** o schema do banco deve ser **genérico e template-driven** desde o início,
para não exigir remodelagem quando os outros 7 modelos chegarem.

## Estrutura comum identificada nos 3 modelos recebidos

Apesar de variarem em campos específicos, os 3 laudos já mapeados (Curatela, Previdenciário,
Trabalhista) compartilham o mesmo "esqueleto" de seções:

1. Endereçamento formal ao juízo
2. Apresentação
3. Identificação do perito
4. Identificação do periciando
5. Objeto da perícia / pontos controvertidos (importado do despacho judicial)
6. Metodologia médico-pericial
7. Síntese das alegações das partes (quando aplicável)
8. Matriz/lista de documentos analisados
9. História clínica da condição em análise
10. Antecedentes e fatores extralaborais/individuais
11. História ocupacional (quando aplicável ao tipo)
12. Observação pericial espontânea
13. Exame clínico geral
14. **Exame físico por sistemas/aparelhos** — ver regra de interface abaixo
15. Exames complementares
16. Diagnóstico nosológico (com CID)
17. Análise etiológica
18. Análise de nexo causal (matriz de critérios, quando aplicável ao tipo)
19. Análise de concausalidade (quando aplicável)
20. Avaliação de danos temporários
21. Avaliação de danos permanentes (referência à Tabela ABMLPM quando aplicável)
22. Avaliação da capacidade (laborativa/civil, conforme o tipo)
23. Avaliação funcional — **tabela com escala 0-4/NA** por função avaliada (~20-25 funções,
    variando por tipo de laudo)
24. Prognóstico, tratamento e reabilitação
25. Discussão médico-pericial (texto corrido integrando todos os achados)
26. Respostas aos quesitos (campo aberto: cola pergunta + responde)
27. Conclusão médico-pericial — com **textos automáticos pré-prontos** para os cenários mais
    comuns daquele tipo de laudo (ex: nexo causal / sem nexo / concausalidade / incapacidade
    temporária / incapacidade permanente)
28. Encerramento e assinatura

### Regra de interface: exame físico por sistemas
Cada sistema do exame físico (musculoesquelético, neurológico, cardiovascular, respiratório,
psiquiátrico, etc. — variam entre 16 e 17 sistemas conforme o tipo de laudo) deve iniciar
**fechado**, mostrando apenas 4 opções:

- Sem alterações médico-periciais relevantes
- Alterado → abre o detalhamento daquele sistema
- Não avaliado
- Avaliação prejudicada

Só quando "Alterado" é selecionado, os campos detalhados daquele sistema específico se
expandem na tela.

### Regra: campos condicionais
Seções inteiras só devem abrir quando aplicável ao caso (ex: seção de Acidente de Trabalho
só abre se marcado como aplicável; seção de Dano Estético só abre se fizer parte do objeto
da perícia).

### Regra: seleção única vs. múltipla
- **Seleção única**: situações mutuamente excludentes (ex: conclusão sobre nexo causal,
  estado final da capacidade laborativa)
- **Seleção múltipla**: sintomas, exposições, tarefas, fatores etiológicos, tratamentos,
  achados de exame

### Regra: rastreabilidade
Cada conclusão do laudo (nexo, dano, capacidade) deve permitir vincular aos elementos
documentais, clínicos e ocupacionais que a sustentam.

### Regra crítica: o sistema NÃO decide, o perito decide
O sistema pode organizar critérios e sugerir texto, mas **a conclusão sobre nexo causal ou
concausalidade nunca deve ser automática** — deve sempre exigir validação/confirmação
expressa da médica perita antes de ser incorporada ao laudo final.

### Alertas lógicos sugeridos (dos anexos do modelo trabalhista, aplicável de forma geral)
Ideias de validação que fazem sentido no sistema como um todo:
- Diagnóstico marcado sem base documental ou clínica selecionada
- Nexo causal marcado sem exposição ocupacional demonstrada
- Nexo marcado com temporalidade incompatível
- Incapacidade marcada sem limitação funcional correspondente
- Dano permanente quantificado com condição marcada como "não consolidada"
- Quesito sem resposta
- Documento marcado como ilegível/insuficiente sem observação justificando

## Stack técnico

- **Frontend/Framework**: Next.js (App Router) + TypeScript + Tailwind
- **Banco de dados e auth**: Supabase — projeto já criado (`mmcmdvllaodgwpbmvbqp`), usar
  esse, não criar um novo
- **Auth**: OTP por e-mail via Supabase Auth (link mágico, e-mail padrão embutido do
  Supabase — sem SMTP customizado por enquanto) — apenas 2 perfis (perita e secretária),
  sem necessidade de sistema de papéis complexo. Resend/SMTP customizado fica como upgrade
  futuro opcional (ex.: se o limite de envio do e-mail padrão incomodar), não é bloqueante
  hoje — a troca não exige mudança no código do app, só configuração no painel do Supabase.
- **Deploy**: Vercel + GitHub — **deliberadamente adiado** para o final do projeto, só
  conectar quando já houver código funcional pra mostrar
- **Pagamento**: não aplicável a este projeto (sistema interno da cliente, não SaaS
  multi-tenant público)
- **Repositório**: `github.com/meuperitoapp-byte/laudo`

## Modelo de dados (ponto de partida sugerido)

Desenhar o schema no Supabase **antes** de qualquer UI, de forma genérica o suficiente para
suportar novos tipos de laudo sem alterar estrutura:

- `processos` — dados do processo (tipo de trabalho: perícia judicial ou assistência
  técnica; vara/comarca; partes; número do processo; etc.)
- `tipos_laudo` — catálogo dos 10 tipos de laudo (template)
- `secoes` — seções de cada tipo de laudo (ordem, título, condicional ou não)
- `campos_secao` — campos de cada seção (tipo: seleção única / seleção múltipla / texto
  livre / tabela; opções possíveis; texto automático associado)
- `respostas_processo` — respostas dadas a cada campo, por processo
- `respostas_reutilizaveis` — biblioteca de respostas que a perita pode reaproveitar entre
  processos
- `quesitos` — perguntas coladas + respostas, por processo
- `documentos` — documentos e imagens anexados, com ordem
- `laudos_gerados` — versões finais geradas (PDF/Word) por processo

## Financeiro (contexto, não é requisito técnico)

Contrato de R$3.000, entrada de R$1.000 já paga, R$2.000 restantes na entrega.

## Status atual

- Fase 0.5 (setup técnico) concluída: contrato assinado, repositório GitHub criado, projeto
  Supabase criado, arquivos da cliente organizados localmente
- 3 de 10 modelos de laudo recebidos e mapeados (Curatela, Previdenciário, Trabalhista) —
  aguardando os 7 restantes da cliente
- Próximo passo técnico: modelar o schema do banco de forma genérica, depois construir o
  fluxo de cadastro de processo → seleção de tipo → preenchimento por seção
