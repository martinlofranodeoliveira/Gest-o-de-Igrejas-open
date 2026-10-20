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
