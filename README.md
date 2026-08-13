# Rover Pizzaria — versão local (aplicativo instalável)

Controle de pedidos que roda **sem servidor nenhum**. É publicado como site
estático, instala como aplicativo no celular, tablet ou computador, e funciona
sem internet depois da primeira abertura.

## Leia isto antes de escolher esta versão

**Os dados ficam só no aparelho onde foram digitados.**

Se a pizzaria lançar pedidos no tablet dela e você abrir a mesma aplicação no
seu computador de casa, você **não vai ver nenhum desses pedidos**. São duas
listas separadas, invisíveis uma para a outra. Não é defeito: é como um
aplicativo sem servidor funciona.

Escolha esta versão se:

- Uma pessoa só usa o sistema, em um aparelho só; **ou**
- Cada ponto controla os próprios pedidos de forma independente; **ou**
- Passar o histórico de um aparelho para outro de vez em quando, pelo arquivo
  de cópia, resolve.

Escolha a **versão com servidor** (a outra pasta do projeto) se você precisa
ver de casa os pedidos que a pizzaria está lançando agora.

| | Versão local | Versão com servidor |
| --- | --- | --- |
| Dados compartilhados entre aparelhos | Não | Sim |
| Precisa manter um computador ligado | Não | Sim |
| Funciona sem internet | Sempre | Só com a fila offline |
| Instala como aplicativo | Sim | Dá para adicionar |
| Custo de hospedagem | Zero | Zero (Tailscale) |
| Risco de perder dados | Alto sem cópia | Baixo (banco no servidor) |

## Como executar

```bash
npm install
npm run dev
```

Abre em <http://localhost:5173>.

Para gerar a versão publicável:

```bash
npm run build
```

Os arquivos saem em `dist/`.

## Como publicar de graça

O conteúdo de `dist/` é um site estático: serve em qualquer hospedagem gratuita.

**Vercel** (mais simples):

1. Suba o projeto para um repositório no GitHub.
2. Entre em <https://vercel.com> com a conta do GitHub.
3. "Add New" → "Project" → escolha o repositório.
4. A Vercel detecta o Vite sozinho. Clique em "Deploy".

Você recebe um endereço `https://alguma-coisa.vercel.app` — permanente,
gratuito e com HTTPS. Se quiser um endereço próprio terminado em `.app`,
registre o domínio (custa cerca de R$ 60 a R$ 120 por ano, porque `.app` é um
TLD com HTTPS obrigatório) e aponte para a Vercel.

**Netlify** e **GitHub Pages** funcionam igual. O `base: './'` no
`vite.config.js` já deixa a aplicação pronta para rodar em subpasta.

## Instalar como aplicativo

Depois de publicada, abra o endereço no aparelho:

- **Android (Chrome):** menu ⋮ → "Instalar aplicativo".
- **iPhone (Safari):** botão de compartilhar → "Adicionar à Tela de Início".
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

Vira um ícone na tela inicial, abre em tela cheia sem barra de navegador e
funciona sem internet.

## Cópia dos dados — não pule esta parte

A aba **"Cópia dos dados"** exporta tudo em um arquivo `.json`. Esse arquivo é:

- a **única** proteção contra perder o histórico;
- a **única** forma de levar os dados para outro aparelho.

Limpar os dados de navegação, desinstalar o aplicativo ou trocar de aparelho
apaga tudo. Exporte no fim de cada expediente e guarde o arquivo em outro
lugar (e-mail para você mesmo, pen drive, nuvem).

Importar **substitui** todos os dados do aparelho, e a aplicação pede
confirmação antes.

## Sobre senha

Esta versão **não tem senha**, de propósito. Em uma aplicação sem servidor,
qualquer senha ficaria escrita no próprio código enviado ao navegador —
qualquer pessoa poderia lê-la em segundos. Seria uma falsa sensação de
segurança, e falsa segurança é pior que nenhuma.

A proteção real aqui é o próprio aparelho: use a senha ou a biometria do
celular, do tablet ou do computador. Se você precisa de acesso controlado por
palavra-chave, use a versão com servidor, onde a verificação acontece fora do
alcance do navegador.

## Relatório em PDF

A aba **Relatório** monta o documento e o botão abre a janela de impressão do
navegador. Escolha **"Salvar como PDF"** como destino para gerar o arquivo.

## Testes

```bash
npm test
```

São 24 testes cobrindo o que quebra em silêncio: conversão de preço em todos os
formatos, migração e leitura defensiva dos dados gravados, filtros e totais, e
— pela interface de verdade — a regra de que reprecificar um produto **não**
altera pedidos já lançados.

## Estrutura

```text
src/lib/storage.js       Gravação no aparelho, versão e migração
src/lib/dados.jsx        Regras de negócio e estado da aplicação
src/lib/format.js        Preço, data e conversões
src/components/Telas.jsx Pedido, cadastros, histórico e relatório
src/components/Backup.jsx Exportar e importar
public/sw.js             Service worker (funcionamento offline)
public/manifest.webmanifest Dados de instalação do aplicativo
```

## Detalhe técnico

Os valores são guardados em **centavos, como número inteiro**. Dinheiro em
ponto flutuante acumula erro de arredondamento, e um relatório de fechamento
não pode fechar com um centavo de diferença.
