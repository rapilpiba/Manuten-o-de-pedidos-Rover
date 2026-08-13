import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App.jsx';

/**
 * A regra mais importante do sistema, verificada pela interface de verdade:
 * mudar o preço de um produto NÃO pode alterar pedidos já lançados.
 */
let container;
let root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  act(() => {
    root = createRoot(container);
    root.render(<App />);
  });
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
});

/** Escreve em um input controlado do React. */
function digitar(elemento, valor) {
  const setter = Object.getOwnPropertyDescriptor(
    elemento instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  ).set;
  act(() => {
    setter.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/**
 * O Intl usa espaço não separável entre "R$" e o valor. Visualmente é idêntico
 * a um espaço comum, mas não casa em comparação de texto.
 */
function texto(elemento) {
  return elemento.textContent.replace(/\u00A0/g, ' ');
}

function irPara(nome) {
  const botao = [...container.querySelectorAll('.sidebar nav button')]
    .find((b) => b.textContent === nome);
  act(() => { botao.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

function enviarFormulario(seletor = 'form.stack') {
  const form = container.querySelector(seletor);
  act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
}

function cadastrar(secao, campos) {
  irPara(secao);
  const inputs = container.querySelectorAll('form.stack input');
  digitar(inputs[0], campos.id);
  digitar(inputs[1], campos.nome);
  if (campos.preco !== undefined) digitar(inputs[2], campos.preco);
  enviarFormulario();
}

describe('regra de auditoria', () => {
  it('reprecificar o produto não altera o pedido já lançado', () => {
    cadastrar('Funcionários', { id: '01', nome: 'Maria Silva' });
    cadastrar('Produtos', { id: 'P1', nome: 'Pizza Calabresa', preco: '49,90' });

    // Lança o pedido com o preço atual.
    irPara('Novo pedido');
    const campos = container.querySelectorAll('form.stack input');
    digitar(campos[0], '01');
    digitar(campos[1], 'P1');
    enviarFormulario();
    expect(texto(container)).toContain('R$ 49,90');

    // Muda o preço do produto e o nome do funcionário.
    irPara('Produtos');
    const editar = [...container.querySelectorAll('.link-button')].find((b) => b.textContent === 'Editar');
    act(() => { editar.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const camposProduto = container.querySelectorAll('form.stack input');
    digitar(camposProduto[1], 'Pizza Calabresa Grande');
    digitar(camposProduto[2], '59,90');
    enviarFormulario();

    // O histórico precisa continuar mostrando o nome e o preço antigos.
    irPara('Histórico');
    const linha = texto(container.querySelector('.history-table tbody tr'));
    expect(linha).toContain('Pizza Calabresa');
    expect(linha).not.toContain('Pizza Calabresa Grande');
    expect(linha).toContain('R$ 49,90');
    expect(linha).not.toContain('R$ 59,90');
  });

  it('o pedido seguinte usa o preço novo', () => {
    cadastrar('Funcionários', { id: '01', nome: 'Maria' });
    cadastrar('Produtos', { id: 'P1', nome: 'Pizza', preco: '10,00' });

    irPara('Novo pedido');
    let campos = container.querySelectorAll('form.stack input');
    digitar(campos[0], '01');
    digitar(campos[1], 'P1');
    enviarFormulario();

    irPara('Produtos');
    const editar = [...container.querySelectorAll('.link-button')].find((b) => b.textContent === 'Editar');
    act(() => { editar.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    digitar(container.querySelectorAll('form.stack input')[2], '20,00');
    enviarFormulario();

    irPara('Novo pedido');
    campos = container.querySelectorAll('form.stack input');
    digitar(campos[0], '01');
    digitar(campos[1], 'P1');
    enviarFormulario();

    irPara('Histórico');
    const linhas = [...container.querySelectorAll('.history-table tbody tr')];
    const textos = linhas.map((l) => texto(l)).join(' | ');
    expect(textos).toContain('R$ 20,00');
    expect(textos).toContain('R$ 10,00');
  });

  it('os dados sobrevivem a fechar e reabrir a aplicação', () => {
    cadastrar('Funcionários', { id: '01', nome: 'Maria' });
    cadastrar('Produtos', { id: 'P1', nome: 'Pizza', preco: '30,00' });
    irPara('Novo pedido');
    const campos = container.querySelectorAll('form.stack input');
    digitar(campos[0], '01');
    digitar(campos[1], 'P1');
    enviarFormulario();

    // Desmonta e monta de novo, como se o aparelho tivesse sido reaberto.
    act(() => root.unmount());
    act(() => {
      root = createRoot(container);
      root.render(<App />);
    });

    irPara('Histórico');
    expect(texto(container.querySelector('.history-table tbody tr'))).toContain('R$ 30,00');
  });
});
