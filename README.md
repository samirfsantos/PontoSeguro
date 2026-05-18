# PontoSeguro

Sistema de registro de ponto com painel de colaborador e painel RH, com API em Node.js/Express + Sequelize e frontend estatico em HTML/CSS/JS.

## Estrutura do projeto

- `backend/`: API, regras de negocio, modelos Sequelize e rotas.
- `web/`: telas estaticas (`index.html`, `colaborador.html`, `rh.html`).
- `backend/uploads/`: arquivos enviados (atestados).

## Tecnologias principais

- Node.js + Express
- Sequelize (SQLite em desenvolvimento)
- JWT para autenticacao
- Multer para upload
- PDFKit para relatorios

## Como executar

### 1) Backend

1. Entrar na pasta do backend:
   - `cd backend`
2. Instalar dependencias:
   - `npm install`
3. Subir servidor:
   - `npm run dev`

A API sobe por padrao em `http://localhost:3001`.

Observacao: o frontend usa esse endereco por padrao via `API_URL` (`localStorage.ps_api_url` ou fallback para `http://localhost:3001`).

### 2) Frontend

Abrir os arquivos da pasta `web` via servidor estatico da sua preferencia, ou abrir `web/index.html` no navegador para ambiente local.

## Credencial inicial RH

- CPF: `12345678900`
- Senha: `12345`

Observacao: o bootstrap do backend atualiza/cria o usuario RH inicial com esse CPF ao iniciar a aplicacao.

## Regras importantes de CPF (login e cadastro)

### Login

- Se o campo `identifier` for e-mail (`contendo @`), login por e-mail.
- Se nao for e-mail, o sistema considera CPF e exige exatamente 11 numeros.
- Frontend aplica mascara e backend valida novamente.

### Cadastro de colaborador

- CPF obrigatorio com exatamente 11 numeros.
- Frontend valida e backend valida novamente.

### Cadastro RH -> Novo funcionario

- CPF obrigatorio com exatamente 11 numeros.
- Frontend valida e backend valida novamente.

## Regras de negocio atuais

### Perfil RH

- Nao registra ponto como colaborador.
- Nao aparece em listas/indicadores de ponto da equipe (ativos de ponto, dashboard e banco de horas).

### Perfil colaborador

- Registro de ponto com sequencia guiada de 8 etapas:
   - Entrada
   - Intervalo
   - Fim do intervalo
   - Saida para o almoco
   - Retorno do almoco
   - Intervalo
   - Fim do intervalo
   - Encerramento do expediente
- Envio de solicitacoes e atestados.
- Recebe notificacoes de retorno do RH no perfil.
- Possui botao de sair visivel no topo da tela.

### RH

- Central unificada para aprovar/reprovar solicitacoes e atestados em um unico fluxo.
- Pode adicionar/remover batida manual de colaborador no detalhe diario.
- Possui notificacoes com contadores (novas batidas, solicitacoes pendentes, atestados pendentes).
- Exibe sequencia do dia nos registros e no detalhe do colaborador.
- Exige justificativa no frontend para inclusao, edicao e exclusao de batidas (trilha de auditoria local na tela de detalhe).

## Pontos que voce pode precisar alterar no futuro

### 1) Validacao de CPF

Arquivo principal:
- `backend/src/controllers/SystemController.js`

Funcoes-chave:
- `onlyDigits`
- `isValidCpfDigits`
- `login`
- `registerColaborador`
- `rhCriarFuncionario`
- `rhAtualizarFuncionario`

Se quiser validar CPF com algoritmo oficial (digitos verificadores), altere `isValidCpfDigits`.

### 2) Credencial RH inicial

Arquivo:
- `backend/src/app.js`

Trecho de bootstrap apos `sequelize.sync(...)`:
- criacao/atualizacao do usuario RH padrao.

### 3) Regras de acesso RH sem ponto

Arquivo:
- `backend/src/controllers/SystemController.js`

Funcoes-chave:
- `isRhUser`
- `nonRhWhere`
- `registrarPonto`
- `meusPontos`
- `resumoMensalColaborador`
- `rhDashboard`
- `rhFuncionarios`
- `rhBancoHoras`
- `rhBancoHorasDetalhe`
- `rhPontosDiaFuncionario`

### 4) Notificacoes e badges RH

Arquivo:
- `web/rh.html`

Funcoes-chave:
- `getRegistroSeenKey`
- `getUnreadRegistrosCount`
- `markRegistrosAsVistos`
- `updateSideBadges`
- `renderNotificacoes`

### 5) Sequencia de batidas (colaborador)

Arquivo:
- `web/colaborador.html`

Funcoes-chave:
- `getRegistrosHojeOrdenados`
- `getProximoPassoHoje`
- `updatePunchBtn`
- `registrarEntrada`
- `registrarIntervalo`
- `registrarSaida`

### 6) Sync de perfil no colaborador

Arquivo:
- `web/colaborador.html`

Funcao-chave:
- `sincronizarPerfilColaborador`

## Rotas principais (resumo)

Autenticacao:
- `POST /login`
- `POST /colaboradores/register`
- `GET /me`

Colaborador:
- `POST /colaborador/pontos`
- `GET /colaborador/pontos`
- `GET /colaborador/resumo-mensal`
- `POST /colaborador/solicitacoes`
- `GET /colaborador/solicitacoes`
- `POST /colaborador/atestados`
- `GET /colaborador/atestados`

RH:
- `GET /rh/dashboard`
- `GET /rh/funcionarios`
- `POST /rh/funcionarios`
- `PUT /rh/funcionarios/:id`
- `GET /rh/funcionarios/:id/pontos-dia`
- `POST /rh/funcionarios/:id/pontos-manual`
- `DELETE /rh/pontos/:id`
- `GET /rh/solicitacoes`
- `PUT /rh/solicitacoes/:id`
- `GET /rh/atestados`
- `PUT /rh/atestados/:id`
- `GET /rh/banco-horas`
- `GET /rh/banco-horas/:id/detalhes`

## Alteracoes realizadas (changelog consolidado)

### Entrega atual (CPF + revisao final)

- Limitacao de CPF para 11 numeros no login (frontend e backend).
- Limitacao de CPF para 11 numeros no cadastro de colaborador (frontend e backend).
- Limitacao de CPF para 11 numeros no cadastro via RH (frontend e backend).
- Validacao de CPF na edicao de funcionario RH quando CPF e alterado.
- Atualizacao do RH inicial para CPF `12345678900` no bootstrap.
- Criacao deste README com guia tecnico e operacional.

### Entrega atual (fluxo de batidas + RH unificado)

- Colaborador com fluxo de ponto em 8 etapas (incluindo saida/retorno do almoco).
- Sequencia de botoes guiada por etapa para evitar batida fora de ordem.
- Correcao de data local no RH para evitar "Sem batidas no dia" por diferenca de fuso.
- Inclusao da coluna "Sequencia do Dia" na grade de Registros do RH.
- Central unificada de Solicitacoes + Atestados no colaborador e no RH.
- Auditoria visual no RH para alteracoes de ponto (anterior, novo e justificativa).
- Ajuste de atualizacao mais frequente no RH para refletir novas batidas.

### Entregas anteriores aplicadas no projeto

- Correcao de data/fuso para exibicao de ponto no RH.
- Aprovacao/reprovacao de atestado no RH (API + tela).
- Notificacoes no perfil do colaborador para retornos do RH (solicitacoes e atestados).
- Badge de novas batidas no RH com limpeza ao abrir a pagina de registros.
- Controle RH para adicionar/remover batidas manuais.
- Exclusao de perfil RH dos fluxos de ponto e ativos de ponto.

## Checklist rapido antes de entregar ao cliente

- Subir backend e validar `GET /health`.
- Testar login colaborador com CPF de 11 digitos.
- Testar login RH com CPF `12345678900`.
- Testar cadastro com CPF invalido (deve bloquear).
- Testar RH aprovando/reprovando solicitacao e atestado.
- Testar registro manual de ponto (adicionar/remover).
- Testar sequencia completa de 8 batidas no colaborador.
- Validar aparicao dos pontos no RH (Registros da Equipe e Detalhes do colaborador).
- Testar notificacoes RH e colaborador.

## Observacoes finais

- Em ambiente de producao, recomenda-se:
  - mover segredos para variaveis de ambiente seguras;
  - usar banco gerenciado (PostgreSQL, por exemplo);
  - habilitar logs estruturados e monitoramento;
  - implementar rate limit e hardening de seguranca na API.
