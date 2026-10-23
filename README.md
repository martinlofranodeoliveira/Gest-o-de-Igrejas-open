# Gestão de Igrejas Open

Aplicação React com modo web local e desktop Electron/SQLite para cadastro e gestão de membros e contribuições. Esta edição mantém a aplicação, esquema, repositórios, autenticação e testes úteis; não contém banco, membros, mídias ou histórico da operação anterior.

## Uso local

Requer Node.js compatível com as dependências do projeto. Instale as dependências e use `npm run dev` para a interface web local ou `npm run dev:desktop` para Electron. O armazenamento começa vazio. Cadastre dados próprios ou inteiramente sintéticos; nenhum cadastro real é distribuído.

A edição aberta não requer compra, chave de ativação comercial ou vínculo com uma máquina. O login e as regras de acesso da aplicação permanecem existentes; a remoção da ativação comercial não remove autenticação. Utilitários criptográficos legados permanecem para preservar código/testes, mas não são necessários para iniciar esta edição. A chave pública operacional e scripts de emissão de licenças foram excluídos.

## Validação

Com Node.js 22, `npm test` passou os oito comandos originais, a verificação da edição sem ativação, quatro casos de primeira conta SQLite e o teste de primeira conta no navegador. A checagem TypeScript (`npm run lint`) e `npm run build:web` também passaram; o Vite transformou 1.685 módulos. Uma revisão independente passou outros 13 casos de primeiro acesso, com dados e armazenamento inteiramente sintéticos.

O workflow executa os testes, TypeScript e build web com `scripts/checks-offline.py`, em namespace sem rede, com fonte e dependências somente leitura e sem credenciais. No runner efêmero hospedado pelo GitHub, o launcher usa `sudo -n` para a configuração dos namespaces exigida pelo Ubuntu; os testes executam sem capacidades efetivas e sem possibilidade de adquirir novos privilégios. O helper interrompe a execução se essas condições não forem confirmadas, sem desativar AppArmor ou alterar políticas do host.

O empacotamento Electron e a execução do aplicativo desktop nativo não foram validados. `npm run build` inclui esse empacotamento; para repetir apenas o build validado, use `npm run build:web`. O módulo nativo SQLite deve corresponder à versão de Node/Electron usada. Não há promessa de instaladores prontos para todos os sistemas, nem validação com dados reais ou serviços externos.

## Escopo e licença

Inclui fonte da aplicação web/desktop e testes. Exclui dados, uploads reais, automações de publicação/metrics, chave pública e scripts de ativação da operação anterior. Não distribui configuração de implantação nem histórico privado. Código de titularidade autorizada sob MIT; dependências e respectivos metadados/licenças são preservados nos lockfiles.

## Primeiro acesso

Não há conta nem senha padrão. Abra o aplicativo, informe seu nome e e-mail,
escolha uma senha de 12 a 128 caracteres e confirme-a. Depois do cadastro inicial,
o formulário passa a exigir essa conta. Uma segunda configuração não substitui
quem criou a primeira conta. A edição Open tem identidade própria de aplicativo;
não copie os dados do produto anterior para ela automaticamente.

No desktop, a senha recebe um derivado scrypt com salt; o banco SQLite não é
criptografado. No navegador, o modo de demonstração usa Web Crypto (PBKDF2) e Web
Locks em localhost ou HTTPS, com armazenamento separado do produto anterior.
O perfil do navegador e o acesso ao computador continuam sob controle do usuário:
este modo não é uma fronteira de segurança para dados reais ou publicação na internet.
Nenhum banco, cadastro real, chave comercial ou histórico privado é distribuído.

Para validar apenas a interface, use `npm run build:web`; `npm run build` também
empacota o aplicativo desktop. Os novos testes de primeira conta usam Node 22 e
dados sintéticos em memória. Os testes originais são preservados.

## Pré-visualização de importação JSON de membros (núcleo em memória)

Novo núcleo reutilizável e puramente em memória em `src/services/memberImportPreview.ts`:
`previewMemberImportJson(text)` valida um texto JSON sem escrever nada. O `DataImporter`,
a aplicação web/desktop e o armazenamento continuam inalterados. Não há CSV,
aplicação de importação, confirmação UI, persistência, rollback, importação atômica
ou deduplicação neste núcleo; esses são trabalhos futuros revisados separadamente.
Quem chamar decide confirmação e adapta os rascunhos aceitos ao integrar.

Limites: texto primitivo `string` até 200000 unidades UTF-16 `String.length`
(verificado antes de `JSON.parse`) e até 250 linhas. Ultrapassar gera
`RangeError("MEMBER_IMPORT_LIMIT")`. Tipo errado gera
`TypeError("INVALID_MEMBER_IMPORT_INPUT")`, sintaxe inválida gera
`TypeError("INVALID_MEMBER_IMPORT_JSON")` e raiz não-array gera
`TypeError("INVALID_MEMBER_IMPORT_ROOT")`. Array vazio é prévia válida com
`canImport: false`. Semântica final de `JSON.parse` vale; BOM não é removido
manualmente. Nenhum erro bruto é exposto.

Esquema fechado por linha: `fullName,email,phone,address,birthDate,baptismDate,status,isTither,notes`.
`id` e `createdAt` são metadados legados aceitos mas totalmente ignorados: nunca
copiados, usados ou regenerados. Nenhum payload `Member` completo ou salvamento
automático é prometido. Qualquer outra chave própria gera uma única issue inicial
`{field:null,code:"UNKNOWN_FIELD"}` sem nomear a chave. Linha não-objeto gera só
`{field:null,code:"ROW_TYPE"}`. Campos conhecidos seguem ordem fixa após a issue
opcional desconhecida, no máximo uma issue por campo.

Texto: `fullName` obrigatório; demais textos default `""` quando ausentes.
Máximos UTF-16 antes de `trim`: `fullName`120, `email`254, `phone`40,
`address`500, `birthDate`32, `baptismDate`32, `notes`2000. Acima gera `LENGTH`;
NUL (`\u0000`) gera `VALUE`. `fullName,email,phone,address,birthDate,baptismDate`
usam `trim()`; `notes` é literal com espaços/quebras/markup preservados.
`fullName` vazio após trim ou ausente gera `REQUIRED`. Sem validação de
entregabilidade, identidade única ou semântica de e-mail/telefone/endereço.
Datas não vazias devem ser exatamente `YYYY-MM-DD` com ano 0100..9999 e
`normalizeDateValue(valor) === valor`, senão `DATE`; datas vazias ficam `""`.
`status` ausente default `"Ativo"`, só aceita exatamente
`Ativo|Inativo|Visitante` senão `VALUE` (`TYPE` se não-string). `isTither`
ausente default `false`, só booleano senão `TYPE`, sem coerção. Valores válidos
não são anônimos: são retornados para revisão local e consumidores de texto
precisam escapar ao renderizar.

Retorno novo e compatível com JSON com exatamente
`rowCount,validCount,invalidCount,canImport,rows`. `canImport` é `true` só com
`rowCount>0` e `invalidCount===0`. Linha válida tem exatamente
`index,status:"valid",data` com os 9 campos em ordem fixa e valores
normalizados. Linha inválida tem exatamente `index,status:"invalid",issues`
ordenadas e não vazias, sem ecoar valores inválidos ou exceções. Tudo alocado de
novo por chamada, sem IDs/timestamps/contadores globais ou mutações. Descartar a
prévia é cancelamento: nenhuma escrita ocorreu.

Exemplo executável apenas sintético (nenhum membro/dado/serviço real):

```mjs
import { previewMemberImportJson } from "./src/services/memberImportPreview.ts";

const validText = JSON.stringify([
  { fullName: "Maria Sintética", email: "  maria@exemplo.test  ", status: "Ativo" },
  { fullName: "João Sintético", email: "", birthDate: "0100-01-01", isTither: true, notes: "  <b>rascunho</b>\nlinha2  " }
]);
const ok = previewMemberImportJson(validText);
console.log(ok.rowCount, ok.validCount, ok.invalidCount, ok.canImport);
console.log(ok.rows[0].data);

const invalidText = JSON.stringify([
  { fullName: "  ", email: "x", id: "deve-ser-ignorado", extra: 1 },
  { fullName: "Ana", birthDate: "2023-02-30" }
]);
const bad = previewMemberImportJson(invalidText);
console.log(bad.canImport, bad.rows[1].issues);
// Descartar `ok`/`bad` cancela: nada foi persistido.
```

Sem conta ou senha padrão: o primeiro acesso exige cadastro próprio. O modo
demonstração no navegador não é fronteira de segurança para dados reais ou
publicação na internet.


<!-- community-core:member-email-duplicate-groups-core -->
### Member Email Duplicate Groups In-Memory Core

Complements the existing member import preview which leaves deduplication to future work by grouping in-memory member drafts that share the exact same non-empty email string before manual review. Returns only index groups with no persistence confirmation validation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/member_email_duplicate_groups_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_MEMBER_EMAIL_DUPLICATE_ROOT. If array length exceeds 1000 throw RangeError with message MEMBER_EMAIL_DUPLICATE_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 groupCount 0 duplicateRowCount 0 groups empty. Iterate payload with for-of and a local index counter starting at 0; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for grouping. Each object row increments validRowCount once and is observed only via for-of over Object.entries for key email by comparing entry key with triple equals against email without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id createdAt fullName phone address birthDate baptismDate status isTither notes. If no email entry exists or its value typeof not string or its length equals 0 then ignore row for grouping with no trim coercion folding translation validation or escaping. Otherwise use exact string value as Map key with Map get and Map set and arrays built with array literals and push: if Map get returns undefined then build fresh array with index pushed then Map set; else push index onto retrieved array. Values never copied except as Map keys held locally during call. After iteration build groups array with push of fresh arrays each holding indexes in ascending iteration order with length at least 2; groups ordered by first index ascending which equals first-seen order. Set groupCount to groups length and duplicateRowCount to sum of lengths of grouped arrays. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount groupCount duplicateRowCount groups where rowCount equals validRowCount plus invalidRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Grouping only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "email": "a@exemplo.test"
    },
    {
      "email": "b@exemplo.test"
    },
    {
      "email": "a@exemplo.test"
    }
  ],
  "output": {
    "duplicateRowCount": 2,
    "groupCount": 1,
    "groups": [
      [
        0,
        2
      ]
    ],
    "invalidRowCount": 0,
    "rowCount": 3,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {
      "email": ""
    },
    {
      "email": "x@exemplo.test"
    },
    {
      "fullName": "Sintetico"
    }
  ],
  "output": {
    "duplicateRowCount": 0,
    "groupCount": 0,
    "groups": [],
    "invalidRowCount": 1,
    "rowCount": 4,
    "validRowCount": 3
  }
}
```

Public regression tests: `lab_tests/community_member_email_duplicate_groups_core.test.mjs`.


<!-- community-core:tithe-amount-totals-core -->
### Tithe Amount Totals In-Memory Core

Complements the existing member import preview and Tithe amount and status shapes by totalling contribution draft amounts already held in memory before manual review. Gives bounded valid missing invalid amount counts with exact totals overall and for Confirmado and Pendente with no persistence confirmation validation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/tithe_amount_totals_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_TITHE_AMOUNT_TOTALS_ROOT. If array length exceeds 1000 throw RangeError with message TITHE_AMOUNT_TOTALS_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 amountValidCount 0 amountMissingCount 0 amountInvalidCount 0 amountTotal 0 confirmadoCount 0 pendenteCount 0 statusEmptyCount 0 statusUnknownCount 0 confirmadoTotal 0 pendenteTotal 0. Iterate payload with for-of and local counters and totals; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for amount and status counts. Each object row increments validRowCount once and is observed only via for-of over Object.entries with entry[0] and entry[1] for keys amount and status by comparing entry[0] with triple equals against amount and status without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id memberId memberName paymentMethod contributionDate notes createdAt. If no amount entry exists increment amountMissingCount once. Else if entry[1] typeof not number or entry[1] !== entry[1] or entry[1] < 0 or entry[1] > 1000000000 increment amountInvalidCount once with no trim coercion folding translation validation or escaping. Else increment amountValidCount once and add entry[1] to amountTotal. If no status entry exists increment statusEmptyCount once. Else if entry[1] exactly Confirmado increment confirmadoCount once and if amount was valid add same amount to confirmadoTotal, else if exactly Pendente increment pendenteCount once and if amount was valid add same amount to pendenteTotal, else increment statusUnknownCount once with no trim coercion folding translation validation or escaping and typeof non-string counts as unknown. Values never copied except numeric addition to local totals. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount amountValidCount amountMissingCount amountInvalidCount amountTotal confirmadoCount pendenteCount statusEmptyCount statusUnknownCount confirmadoTotal pendenteTotal where rowCount equals validRowCount plus invalidRowCount and amountValidCount plus amountMissingCount plus amountInvalidCount equals validRowCount and confirmadoCount plus pendenteCount plus statusEmptyCount plus statusUnknownCount equals validRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Totalling only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "amount": 100,
      "status": "Confirmado"
    },
    {
      "amount": 50.5,
      "status": "Pendente"
    },
    {
      "amount": 20,
      "status": "Confirmado"
    }
  ],
  "output": {
    "amountInvalidCount": 0,
    "amountMissingCount": 0,
    "amountTotal": 170.5,
    "amountValidCount": 3,
    "confirmadoCount": 2,
    "confirmadoTotal": 120,
    "invalidRowCount": 0,
    "pendenteCount": 1,
    "pendenteTotal": 50.5,
    "rowCount": 3,
    "statusEmptyCount": 0,
    "statusUnknownCount": 0,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {},
    {
      "amount": "10",
      "status": "X"
    },
    {
      "amount": -5,
      "status": "Confirmado"
    }
  ],
  "output": {
    "amountInvalidCount": 2,
    "amountMissingCount": 1,
    "amountTotal": 0,
    "amountValidCount": 0,
    "confirmadoCount": 1,
    "confirmadoTotal": 0,
    "invalidRowCount": 1,
    "pendenteCount": 0,
    "pendenteTotal": 0,
    "rowCount": 4,
    "statusEmptyCount": 1,
    "statusUnknownCount": 1,
    "validRowCount": 3
  }
}
```

Public regression tests: `lab_tests/community_tithe_amount_totals_core.test.mjs`.


<!-- community-core:tithe-payment-method-summary-core -->
### Tithe Payment Method Summary In-Memory Core

Complements the existing member import preview, email duplicate groups and tithe amount totals which validate rows, group emails and total amounts but do not show PIX Especie Cartao Transferencia distribution by counting in-memory contribution drafts per exact payment method versus missing versus unknown before manual review. Returns only bounded counts with no persistence, confirmation, validation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/tithe_payment_method_summary_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_TITHE_PAYMENT_METHOD_SUMMARY_ROOT. If array length exceeds 1000 throw RangeError with message TITHE_PAYMENT_METHOD_SUMMARY_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 pixCount 0 especieCount 0 cartaoCount 0 transferenciaCount 0 paymentMissingCount 0 paymentUnknownCount 0. Iterate payload with for-of and local counters; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for payment counts. Each object row increments validRowCount once and is observed only via for-of over Object.entries for key paymentMethod by comparing entry[0] with triple equals against paymentMethod without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id memberId memberName amount contributionDate status notes createdAt. Access entry value only via literal indices entry[0] and entry[1]. If no paymentMethod entry exists increment paymentMissingCount once. Else if entry[1] triple equals PIX increment pixCount once else if triple equals Especie-accented form increment especieCount once else if triple equals Cartao-accented form increment cartaoCount once else if triple equals Transferencia-accented form increment transferenciaCount once else increment paymentUnknownCount once with no trim coercion folding translation validation or escaping and typeof non-string counts as unknown including empty string numbers booleans null objects and arrays. Values never copied. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount pixCount especieCount cartaoCount transferenciaCount paymentMissingCount paymentUnknownCount where rowCount equals validRowCount plus invalidRowCount and pixCount plus especieCount plus cartaoCount plus transferenciaCount plus paymentMissingCount plus paymentUnknownCount equals validRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Counting only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "paymentMethod": "PIX"
    },
    {
      "paymentMethod": "Espécie"
    },
    {
      "paymentMethod": "PIX"
    }
  ],
  "output": {
    "cartaoCount": 0,
    "especieCount": 1,
    "invalidRowCount": 0,
    "paymentMissingCount": 0,
    "paymentUnknownCount": 0,
    "pixCount": 2,
    "rowCount": 3,
    "transferenciaCount": 0,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {},
    {
      "paymentMethod": "Boleto"
    },
    {
      "paymentMethod": 123
    }
  ],
  "output": {
    "cartaoCount": 0,
    "especieCount": 0,
    "invalidRowCount": 1,
    "paymentMissingCount": 1,
    "paymentUnknownCount": 2,
    "pixCount": 0,
    "rowCount": 4,
    "transferenciaCount": 0,
    "validRowCount": 3
  }
}
```

Public regression tests: `lab_tests/community_tithe_payment_method_summary_core.test.mjs`.


<!-- community-core:member-tither-summary-core -->
### Member Tither Summary In-Memory Core

Complements the existing member import preview, email duplicate groups, tithe amount totals and payment method summary which validate rows, group duplicate emails, total amounts and summarize payment methods but do not show dizimista flag distribution by counting in-memory member drafts per exact true versus false versus missing versus unknown isTither before manual review. Returns only bounded counts with no persistence, confirmation, validation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/member_tither_summary_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_MEMBER_TITHER_SUMMARY_ROOT. If array length exceeds 1000 throw RangeError with message MEMBER_TITHER_SUMMARY_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 titherTrueCount 0 titherFalseCount 0 titherMissingCount 0 titherUnknownCount 0. Iterate payload with for-of and local counters; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for tither counts. Each object row increments validRowCount once and is observed only via for-of over Object.entries with entry[0] and entry[1] for key isTither by comparing entry[0] with triple equals against isTither without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id fullName email phone address birthDate baptismDate status notes createdAt. Access entry value only via literal indices entry[0] and entry[1]. If no isTither entry exists increment titherMissingCount once. Else if entry[1] triple equals true increment titherTrueCount once else if entry[1] triple equals false increment titherFalseCount once else increment titherUnknownCount once with no trim coercion folding translation validation or escaping and typeof non-boolean counts as unknown including empty string numbers null objects and arrays. Values never copied. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount titherTrueCount titherFalseCount titherMissingCount titherUnknownCount where rowCount equals validRowCount plus invalidRowCount and titherTrueCount plus titherFalseCount plus titherMissingCount plus titherUnknownCount equals validRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Counting only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "isTither": true
    },
    {
      "isTither": false
    },
    {
      "fullName": "Sintetico"
    }
  ],
  "output": {
    "invalidRowCount": 0,
    "rowCount": 3,
    "titherFalseCount": 1,
    "titherMissingCount": 1,
    "titherTrueCount": 1,
    "titherUnknownCount": 0,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {
      "isTither": 1
    },
    {
      "isTither": true
    },
    []
  ],
  "output": {
    "invalidRowCount": 2,
    "rowCount": 4,
    "titherFalseCount": 0,
    "titherMissingCount": 0,
    "titherTrueCount": 1,
    "titherUnknownCount": 1,
    "validRowCount": 2
  }
}
```

Public regression tests: `lab_tests/community_member_tither_summary_core.test.mjs`.


<!-- community-core:tithe-member-groups-core -->
### Tithe Member Groups In-Memory Core

Complements the existing member import preview, email duplicate groups, tithe amount totals and payment method summaries which validate rows, group emails and total amounts but do not reveal repeat contributions by grouping in-memory contribution drafts sharing the exact memberId before manual review. Returns only index groups with no persistence, confirmation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/tithe_member_groups_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_TITHE_MEMBER_GROUPS_ROOT. If array length exceeds 1000 throw RangeError with message TITHE_MEMBER_GROUPS_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 groupCount 0 groupedRowCount 0 groups empty. Iterate payload with for-of and a local index counter starting at 0; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for grouping. Each object row increments validRowCount once and is observed only via for-of over Object.entries for key memberId by comparing entry[0] with triple equals against memberId without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id memberName amount paymentMethod contributionDate status notes createdAt. Access entry value only via literal indices entry[0] and entry[1]. If no memberId entry exists or its value typeof not string or its length equals 0 then ignore row for grouping with no trim coercion folding translation validation or escaping. Otherwise use exact string value as Map key with Map get and Map set and arrays built with array literals and push: if Map get returns undefined then build fresh array with index pushed then Map set; else push index onto retrieved array. Values never copied except as Map keys held locally during call. After iteration build groups array with push of fresh arrays each holding indexes in ascending iteration order with length at least 2; groups ordered by first index ascending which equals first-seen order. Set groupCount to groups length and groupedRowCount to sum of lengths of grouped arrays. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount groupCount groupedRowCount groups where rowCount equals validRowCount plus invalidRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Grouping only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "memberId": "m-1"
    },
    {
      "memberId": "m-2"
    },
    {
      "memberId": "m-1"
    }
  ],
  "output": {
    "groupCount": 1,
    "groupedRowCount": 2,
    "groups": [
      [
        0,
        2
      ]
    ],
    "invalidRowCount": 0,
    "rowCount": 3,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {
      "memberId": ""
    },
    {
      "memberId": "m-9"
    },
    {
      "fullName": "Sintetico"
    }
  ],
  "output": {
    "groupCount": 0,
    "groupedRowCount": 0,
    "groups": [],
    "invalidRowCount": 1,
    "rowCount": 4,
    "validRowCount": 3
  }
}
```

Public regression tests: `lab_tests/community_tithe_member_groups_core.test.mjs`.


<!-- community-core:member-status-summary-core -->
### Member Status Summary In-Memory Core

Complements the existing member import preview, email duplicate groups, tithe amount totals, tithe member groups, payment method and tither summaries which validate rows, group duplicates and total amounts but do not show Ativo Inativo Visitante distribution by counting in-memory member drafts per exact status versus missing versus unknown before manual review. Returns only bounded counts with no persistence, confirmation, validation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/member_status_summary_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_MEMBER_STATUS_SUMMARY_ROOT. If array length exceeds 1000 throw RangeError with message MEMBER_STATUS_SUMMARY_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 ativoCount 0 inativoCount 0 visitanteCount 0 statusMissingCount 0 statusUnknownCount 0. Iterate payload with for-of and local counters; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for status counts. Each object row increments validRowCount once and is observed only via for-of over Object.entries for key status by comparing entry[0] with triple equals against status without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id fullName email phone address birthDate baptismDate isTither notes createdAt. Access entry value only via literal indices entry[0] and entry[1]. If no status entry exists increment statusMissingCount once. Else if entry[1] triple equals Ativo increment ativoCount once else if triple equals Inativo increment inativoCount once else if triple equals Visitante increment visitanteCount once else increment statusUnknownCount once with no trim coercion folding translation validation or escaping and typeof non-string counts as unknown including empty string numbers booleans null objects and arrays. Values never copied. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount ativoCount inativoCount visitanteCount statusMissingCount statusUnknownCount where rowCount equals validRowCount plus invalidRowCount and ativoCount plus inativoCount plus visitanteCount plus statusMissingCount plus statusUnknownCount equals validRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Counting only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "status": "Ativo"
    },
    {
      "status": "Inativo"
    },
    {
      "status": "Visitante"
    }
  ],
  "output": {
    "ativoCount": 1,
    "inativoCount": 1,
    "invalidRowCount": 0,
    "rowCount": 3,
    "statusMissingCount": 0,
    "statusUnknownCount": 0,
    "validRowCount": 3,
    "visitanteCount": 1
  }
}
```

```json
{
  "input": [
    null,
    {
      "fullName": "Sintetico"
    },
    {
      "status": ""
    },
    {
      "status": "Ativo"
    },
    {
      "status": "Desligado"
    }
  ],
  "output": {
    "ativoCount": 1,
    "inativoCount": 0,
    "invalidRowCount": 1,
    "rowCount": 5,
    "statusMissingCount": 1,
    "statusUnknownCount": 2,
    "validRowCount": 4,
    "visitanteCount": 0
  }
}
```

```json
{
  "input": [
    {
      "status": "Ativo"
    },
    {
      "status": "ativo"
    },
    {
      "status": "Inativo "
    },
    {
      "status": null
    }
  ],
  "output": {
    "ativoCount": 1,
    "inativoCount": 0,
    "invalidRowCount": 0,
    "rowCount": 4,
    "statusMissingCount": 0,
    "statusUnknownCount": 3,
    "validRowCount": 4,
    "visitanteCount": 0
  }
}
```

Public regression tests: `lab_tests/community_member_status_summary_core.test.mjs`.


<!-- community-core:tithe-date-groups-core -->
### Tithe Contribution Date Groups In-Memory Core

Complements the existing member import preview, email duplicate groups, tithe amount totals, member groups, payment method, status and tither summaries which validate rows, group emails and members and total amounts but do not reveal same-day batches by grouping in-memory contribution drafts sharing the exact contributionDate string before manual review. Returns only index groups with no persistence, confirmation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/tithe_date_groups_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_TITHE_DATE_GROUPS_ROOT. If array length exceeds 1000 throw RangeError with message TITHE_DATE_GROUPS_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 groupCount 0 groupedRowCount 0 groups empty. Iterate payload with for-of and a local index counter starting at 0; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for grouping. Each object row increments validRowCount once and is observed only via for-of over Object.entries for key contributionDate by comparing entry[0] with triple equals against contributionDate without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id memberId memberName amount paymentMethod status notes createdAt. Access entry value only via literal indices entry[0] and entry[1]. If no contributionDate entry exists or its value typeof not string or its length equals 0 then ignore row for grouping with no trim coercion folding translation parsing validation or escaping and never using Date. Otherwise use exact string value as Map key with Map get and Map set and arrays built with array literals and push: if Map get returns undefined then build fresh array with index pushed then Map set; else push index onto retrieved array. Values never copied except as Map keys held locally during call. After iteration build groups array with push of fresh arrays each holding indexes in ascending iteration order with length at least 2; groups ordered by first index ascending which equals first-seen order. Set groupCount to groups length and groupedRowCount to sum of lengths of grouped arrays. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount groupCount groupedRowCount groups where rowCount equals validRowCount plus invalidRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Grouping only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "contributionDate": "2024-01-07"
    },
    {
      "contributionDate": "2024-01-08"
    },
    {
      "contributionDate": "2024-01-07"
    }
  ],
  "output": {
    "groupCount": 1,
    "groupedRowCount": 2,
    "groups": [
      [
        0,
        2
      ]
    ],
    "invalidRowCount": 0,
    "rowCount": 3,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {
      "contributionDate": ""
    },
    {
      "contributionDate": "2024-02-01"
    },
    {
      "memberId": "m1"
    }
  ],
  "output": {
    "groupCount": 0,
    "groupedRowCount": 0,
    "groups": [],
    "invalidRowCount": 1,
    "rowCount": 4,
    "validRowCount": 3
  }
}
```

Public regression tests: `lab_tests/community_tithe_date_groups_core.test.mjs`.


<!-- community-core:member-date-presence-summary-core -->
### Member Date Presence Summary In-Memory Core

Complements the existing member import preview, email duplicate groups, member status/tither summaries and tithe amount/member/date/payment cores which validate rows, group repeats and total amounts but do not reveal birthDate/baptismDate completeness by counting in-memory member drafts as missing/empty/present/unknown before manual review. Returns only bounded counts with no persistence, confirmation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/member_date_presence_summary_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_MEMBER_DATE_PRESENCE_ROOT. If array length exceeds 1000 throw RangeError with message MEMBER_DATE_PRESENCE_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 birthMissingCount 0 birthEmptyCount 0 birthPresentCount 0 birthUnknownCount 0 baptismMissingCount 0 baptismEmptyCount 0 baptismPresentCount 0 baptismUnknownCount 0. Iterate payload with for-of and local counters; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for presence counts. Each object row increments validRowCount once and is observed only via for-of over Object.entries for keys birthDate and baptismDate by comparing entry[0] with triple equals against birthDate and baptismDate without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id fullName email phone address status isTither notes createdAt. Access entry value only via literal indices entry[0] and entry[1]. For birthDate if no entry exists increment birthMissingCount once; else if entry[1] typeof not string increment birthUnknownCount once; else if entry[1] length equals 0 increment birthEmptyCount once; else increment birthPresentCount once with no trim coercion folding parsing translation validation or escaping and never using Date. For baptismDate apply same rule to baptismMissingCount baptismUnknownCount baptismEmptyCount baptismPresentCount. Values never copied. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount birthMissingCount birthEmptyCount birthPresentCount birthUnknownCount baptismMissingCount baptismEmptyCount baptismPresentCount baptismUnknownCount where rowCount equals validRowCount plus invalidRowCount and birthMissingCount plus birthEmptyCount plus birthPresentCount plus birthUnknownCount equals validRowCount and baptismMissingCount plus baptismEmptyCount plus baptismPresentCount plus baptismUnknownCount equals validRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Counting only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "baptismDate": "2010-05-06",
      "birthDate": "1990-01-01"
    },
    {
      "baptismDate": "",
      "birthDate": ""
    },
    {
      "fullName": "Sintetico"
    }
  ],
  "output": {
    "baptismEmptyCount": 1,
    "baptismMissingCount": 1,
    "baptismPresentCount": 1,
    "baptismUnknownCount": 0,
    "birthEmptyCount": 1,
    "birthMissingCount": 1,
    "birthPresentCount": 1,
    "birthUnknownCount": 0,
    "invalidRowCount": 0,
    "rowCount": 3,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {
      "baptismDate": "2020-02-02",
      "birthDate": 123
    },
    {
      "baptismDate": null,
      "birthDate": ""
    },
    []
  ],
  "output": {
    "baptismEmptyCount": 0,
    "baptismMissingCount": 0,
    "baptismPresentCount": 1,
    "baptismUnknownCount": 1,
    "birthEmptyCount": 1,
    "birthMissingCount": 0,
    "birthPresentCount": 0,
    "birthUnknownCount": 1,
    "invalidRowCount": 2,
    "rowCount": 4,
    "validRowCount": 2
  }
}
```

Public regression tests: `lab_tests/community_member_date_presence_summary_core.test.mjs`.


<!-- community-core:member-contact-presence-summary-core -->
### Member Contact Presence Summary In-Memory Core

Complements the existing member import preview, email duplicate groups, status/tither/date-presence summaries and tithe amount/member/date/payment cores which validate rows, group repeats and total amounts but do not reveal email/phone completeness by counting in-memory member drafts as missing/empty/present/unknown before manual review. Returns only bounded counts with no persistence, confirmation or side effects, keeping storage and follow-up decisions with the caller.

Reusable deterministic JSON core: `src/lib/community/member_contact_presence_summary_core.mjs`, API `runFeature(payload)`. This module is independently tested; application/UI integration is outside this change.

Pure in-memory deterministic core exposing runFeature(payload) with no I/O, env, time, randomness, callbacks, dependencies, imports, classes, async, this, reflection or mutable module variables and never using Date. Payload must be an array of row values; otherwise throw TypeError with message INVALID_MEMBER_CONTACT_PRESENCE_ROOT. If array length exceeds 1000 throw RangeError with message MEMBER_CONTACT_PRESENCE_LIMIT. Empty array returns rowCount 0 invalidRowCount 0 validRowCount 0 emailMissingCount 0 emailEmptyCount 0 emailPresentCount 0 emailUnknownCount 0 phoneMissingCount 0 phoneEmptyCount 0 phonePresentCount 0 phoneUnknownCount 0. Iterate payload with for-of and local counters; never mutate or retain input. Each row that is null or typeof not object or Array.isArray true counts as invalid with invalidRowCount increment once and ignored for presence counts. Each object row increments validRowCount once and is observed only via for-of over Object.entries for keys email and phone by comparing entry[0] with triple equals against email and phone without computed variable access, aliasing builtins, passing builtins as callbacks, prototype or constructor access; every other own key is ignored without error and never copied including id fullName address birthDate baptismDate status isTither notes createdAt. Access entry value only via literal indices entry[0] and entry[1]. For email if no entry exists increment emailMissingCount once; else if entry[1] typeof not string increment emailUnknownCount once; else if entry[1] length equals 0 increment emailEmptyCount once; else increment emailPresentCount once with no trim coercion folding parsing translation validation or escaping and never using Date. For phone apply same rule to phoneMissingCount phoneUnknownCount phoneEmptyCount phonePresentCount. Values never copied. Return fresh JSON-compatible object built with an object literal holding exactly rowCount invalidRowCount validRowCount emailMissingCount emailEmptyCount emailPresentCount emailUnknownCount phoneMissingCount phoneEmptyCount phonePresentCount phoneUnknownCount where rowCount equals validRowCount plus invalidRowCount and emailMissingCount plus emailEmptyCount plus emailPresentCount plus emailUnknownCount equals validRowCount and phoneMissingCount plus phoneEmptyCount plus phonePresentCount plus phoneUnknownCount equals validRowCount. Fresh allocation per call with no IDs timestamps globals or mutation. Build objects with object literals, no variable computed access, no property assignment update delete or Object assign create, no reassignment of builtins, no aliasing or callback builtins. Discarding the result cancels with nothing written. Counting only with no persistence confirmation identity deliverability validation or authority; caller keeps storage and follow-up decisions and must escape text on render.

Examples (JSON input and expected output):

```json
{
  "input": [
    {
      "email": "a@exemplo.test",
      "phone": "111"
    },
    {
      "email": "",
      "phone": ""
    },
    {
      "fullName": "Sintetico"
    }
  ],
  "output": {
    "emailEmptyCount": 1,
    "emailMissingCount": 1,
    "emailPresentCount": 1,
    "emailUnknownCount": 0,
    "invalidRowCount": 0,
    "phoneEmptyCount": 1,
    "phoneMissingCount": 1,
    "phonePresentCount": 1,
    "phoneUnknownCount": 0,
    "rowCount": 3,
    "validRowCount": 3
  }
}
```

```json
{
  "input": [
    null,
    {
      "email": 123,
      "phone": null
    },
    {
      "email": "x@exemplo.test"
    },
    {
      "phone": ""
    }
  ],
  "output": {
    "emailEmptyCount": 0,
    "emailMissingCount": 1,
    "emailPresentCount": 1,
    "emailUnknownCount": 1,
    "invalidRowCount": 1,
    "phoneEmptyCount": 1,
    "phoneMissingCount": 1,
    "phonePresentCount": 0,
    "phoneUnknownCount": 1,
    "rowCount": 4,
    "validRowCount": 3
  }
}
```

Public regression tests: `lab_tests/community_member_contact_presence_summary_core.test.mjs`.
