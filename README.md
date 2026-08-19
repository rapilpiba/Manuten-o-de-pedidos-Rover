# Rover Pizzaria (aplicativo instalável)

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

## Cópia dos dados

A aba **"Cópia dos dados"** exporta tudo em um arquivo `.json`. Esse arquivo é:

- a **única** proteção contra perder o histórico;
- a **única** forma de levar os dados para outro aparelho.

Limpar os dados de navegação, desinstalar o aplicativo ou trocar de aparelho
apaga tudo. Exporte no fim de cada expediente e guarde o arquivo em outro
lugar (e-mail para você mesmo, pen drive, nuvem).

Importar **substitui** todos os dados do aparelho, e a aplicação pede
confirmação antes.

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

## Preview

A preview da versão se encontra em https://pedidos-rover.vercel.app/
