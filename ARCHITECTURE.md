# Arquitetura Base do Sistema e Padrão de Comunicação

Este documento descreve a arquitetura base do sistema Gestão de Igrejas (ZelloLife) e o padrão de comunicação estabelecido entre seus serviços e camadas.

## 1. Visão Geral da Arquitetura

O sistema adota uma arquitetura de aplicação **Híbrida Web/Desktop** baseada em **Electron** e **React** (com TypeScript), projetada para rodar localmente com alta performance, garantindo persistência de dados em diferentes ambientes de execução.

### 1.1. Camadas Principais

1. **Apresentação (UI - Renderer Process)**: Construída com React, TypeScript e Tailwind CSS. É responsável pela renderização da interface e interação com o usuário.
2. **Serviços de Domínio (Frontend Services)**: Abstrações que gerenciam a lógica de negócios e as operações de dados.
3. **Ponte de Comunicação (IPC - Preload)**: O `contextBridge` isolado e seguro que expõe a API do Electron para o ambiente Web.
4. **Infraestrutura/Backend Local (Main Process)**: Processo principal do Electron responsável por acessar recursos nativos do sistema operacional, como o File System (armazenamento de arquivos locais) e o banco de dados (SQLite).

### 1.2. Padrão de Persistência (Dependency Inversion)

Para garantir que o código de front-end seja agnóstico ao meio de persistência de dados, o sistema adota o princípio de Inversão de Dependência através de interfaces abstratas.

- **`IDataRepository<T>`**: Interface genérica para as operações CRUD das coleções do sistema (membros, finanças, eventos, etc.).
- **`IAuthService`**: Interface para as operações de autenticação.

O sistema utiliza os Factory Patterns (`repositoryFactory.ts` e `authFactory.ts`) para injetar dinamicamente a implementação apropriada com base no ambiente de execução:
- **Ambiente Desktop (Electron)**: Utiliza as implementações em SQLite (`sqliteRepository.ts`, `sqliteAuthService.ts`) que delegam operações para o Main Process do Electron via IPC.
- **Ambiente Web/Navegador**: Utiliza implementações de fallback baseadas no navegador (`localStorageRepository.ts`, `localStorageAuthService.ts`).

## 2. Padrão de Comunicação (IPC - Inter-Process Communication)

No ambiente desktop, a comunicação entre o front-end (Renderer Process) e a persistência/sistema nativo (Main Process) se dá inteiramente através do padrão de mensagens IPC assíncronas do Electron (`invoke/handle`).

### 2.1. O Contrato de API (`electronAPI`)

O arquivo `electron/preload.cjs` atua como o contrato e a única ponte de acesso do React para o ambiente nativo. A exposição é feita através da chave `window.electronAPI`.

#### Operações de Banco de Dados:
- `sqliteGetAll(tableName)`
- `sqliteAdd(tableName, item)`
- `sqliteUpdate(tableName, id, item)`
- `sqliteDelete(tableName, id)`

#### Operações de Arquivos e Mídia:
- `readFile(fileName)`
- `saveFile(fileName, base64Data)`
- `deleteFile(fileName)`

#### Autenticação e Licenciamento:
- `authLogin(email, password)`
- `authRegister(email, password, displayName)`
- `verifyLicense(licenseKey)`

### 2.2. Fluxo de Execução

1. **Invocação (Renderer)**: Um serviço front-end (ex: `SqliteRepository`) chama a função exposta na API: `window.electronAPI.sqliteAdd('members', item)`.
2. **Transporte (Preload)**: O método no preload invoca o comando IPC correspondente: `ipcRenderer.invoke('sqlite-add', tableName, item)`.
3. **Tratamento (Main)**: No arquivo `electron/main.cjs`, um listener intercepta o canal correspondente usando `ipcMain.handle('sqlite-add', async (event, tableName, item) => { ... })`.
4. **Execução Nativa**: O Main process executa a query SQL no banco de dados SQLite físico.
5. **Retorno**: O Main process retorna a promessa, que é devolvida em cadeia pelo IPC de volta à camada React no Renderer process.

### 2.3. Diretrizes e Regras de Segurança

1. **Context Isolation**: O `contextIsolation` do Electron **deve** estar ativado, e o front-end não tem acesso direto a módulos do Node.js, garantindo a segurança do sistema.
2. **Geração de IDs (Client-side)**: A geração de identificadores (UUIDs) é feita no serviço de front-end (ex: `sqliteRepository.ts`) antes de a mensagem ser enviada pela ponte IPC, garantindo consistência atômica no front-end sem depender de retornos assíncronos de inserção para identificar instâncias recém-criadas.
3. **Sanitização**: Dados de entrada devem ser tratados através de *Prepared Statements* (parâmetros tipados do driver SQLite no processo principal) para prevenir injeção de SQL.
