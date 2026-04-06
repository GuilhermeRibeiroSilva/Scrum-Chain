# Scrum-Chain
Aplicação de gerenciamento de projetos Scrum utilizando blockchain.

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 14 ou superior)
- [npm](https://www.npmjs.com/) (normalmente vem com Node.js)
- [MetaMask](https://metamask.io/) (para interagir com contratos)
- [PostgreSQL](https://www.postgresql.org/) (banco de dados relacional)
- [pgAdmin](https://www.pgadmin.org/) (gerenciador gráfico para PostgreSQL)

## Configuração Inicial

1. Clone o repositório ou descompacte o arquivo:
git clone <url-do-repositorio>
ou descompacte o arquivo .zip

2. Instale as dependências nas Pastas:
- Na Pasta Raiz: npm install
- cd backend: npm install
- cd frontend: npm install

## Execução

1. Inicie a rede local Hardhat: 
- npx hardhat node ou powershell -ExecutionPolicy Bypass -Command "npx hardhat node"

2. Compile:
- npx hardhat compile

- 2.1 Em outro terminal, implante os contratos:
- npx hardhat run scripts/deploy.js --network localhost ou powershell -ExecutionPolicy Bypass -Command "npx hardhat run scripts/deploy.js --network localhost"

3. Incie o backend:
- cd backend; npm start ou powershell -ExecutionPolicy Bypass -Command "npm start"

4. Inicie o frontend:
- cd frontend; npm start ou powershell -ExecutionPolicy Bypass -Command "npm start"

5. Configure o MetaMask:
- Nome da Rede: Hardhat Local
- URL do RPC: http://127.0.0.1:8545
- ID da Cadeia: 31337
- Símbolo da moeda: ETH (ou o símbolo que você estiver usando)
- URL do Explorador: deixe em branco

- Importe uma conta das fornecidas pelo Hardhat usando a chave privadain.


## Para mais Informçãoes Sobre o uso do projeto acesse o Wiki do Repositorio por esse link https://drive.google.com/file/d/1eoRxxblA8drvUz_W0VXwf_WtYtq8Bj51/view?usp=sharing](https://github.com/Gui-svg-gg/Scrum-Chain/wiki
