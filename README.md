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
