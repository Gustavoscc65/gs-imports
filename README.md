# GS Imports — loja virtual (versão inicial)

## O que já está incluído
- Layout responsivo para celular e computador.
- Identidade visual própria GS Imports (preto, branco e dourado) e logo SVG.
- Catálogo inicial com produtos e preços vistos publicamente no catálogo da loja de referência.
- Cartão discreto “GS IMPORTS” sobre cada foto de produto.
- Filtros, sacola de compras e formulário de dados do comprador.
- Backend Express que cria um checkout no PagBank sem expor o token no navegador.
- Endpoint para receber notificações PagBank (webhook), com registro de eventos.

## Importante antes de vender
Esta é uma versão inicial de desenvolvimento, não uma loja publicada nem homologada. As fotos são imagens ilustrativas de referência e devem ser substituídas pelas fotos reais dos produtos que você está autorizado a comercializar. Confirme também estoque, variações, autenticidade, preços, frete, prazo e política de troca antes de aceitar pedidos.

O catálogo foi montado com uma seleção de nomes e preços exibidos publicamente no site de referência em 19/11/2026. Os preços e a disponibilidade podem mudar; revise tudo antes de publicar.

## Configurar o PagBank
1. Instale Node.js 18 ou superior.
2. Copie `.env.example` para `.env`.
3. No painel de desenvolvedor PagBank, gere um token para o ambiente Sandbox e coloque-o em `PAGBANK_TOKEN`.
4. Defina `PAGBANK_ENV=sandbox` e `BASE_URL` com a URL pública HTTPS do ambiente de teste.
5. Execute `npm install` e `npm start`.
6. Teste o checkout no Sandbox com credenciais/cartões de teste oficiais do PagBank.
7. Antes de produção, conclua a homologação exigida pelo PagBank, troque para o token de produção e defina `PAGBANK_ENV=production`.

Documentação oficial:
- Checkout PagBank: https://developer.pagbank.com.br/docs/checkout
- Criar Checkout: https://developer.pagbank.com.br/reference/criar-checkout
- Primeiros passos: https://developer.pagbank.com.br/docs/primeiros-passos-pagbank

## Como testar localmente
```bash
cp .env.example .env
npm install
npm start
```
Acesse http://localhost:3000

## Segurança e operação
- Nunca coloque o token PagBank no `public/app.js` ou em qualquer arquivo servido ao navegador.
- Use HTTPS em produção.
- O webhook desta versão apenas registra eventos. Não marque pedidos como pagos apenas porque chegou uma notificação: consulte o status na API PagBank e valide a notificação antes de liberar mercadoria.
- O arquivo `orders.json` é um armazenamento simples para protótipo. Para produção, use banco de dados, painel administrativo autenticado, backups, controle de estoque, logs e política de privacidade/LGPD.
- O checkout inclui PIX, cartão de crédito e débito. A documentação do PagBank informa que débito exige aprovação interna prévia da conta.
- O frete não está calculado nesta versão. Configure regras de frete e coleta do endereço antes de publicar a loja.
