import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App.jsx';

/**
 * Teste de fumaça: monta a aplicação de verdade e confere que as telas
 * principais renderizam sem estourar. Pega erro de import e de JSX que os
 * testes de função pura não alcançam.
 */
let container;
let root;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
});

function montar() {
  act(() => {
    root = createRoot(container);
    root.render(<App />);
  });
}

describe('aplicação', () => {
  it('monta sem erro e mostra a tela de novo pedido', () => {
    montar();
    expect(container.textContent).toContain('Novo pedido');
    expect(container.textContent).toContain('Rover Pizzaria');
  });

  it('avisa que faltam cadastros antes de lançar pedidos', () => {
    montar();
    expect(container.textContent).toContain('Cadastre pelo menos um funcionário');
  });

  it('navega por todas as seções sem quebrar', () => {
    montar();
    const botoes = [...container.querySelectorAll('.sidebar nav button')];
    expect(botoes.length).toBe(6);
    for (const botao of botoes) {
      act(() => { botao.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    expect(container.textContent).toContain('Cópia dos dados');
  });

  it('carrega pedidos já gravados no aparelho', () => {
    localStorage.setItem('rover-pizzaria-dados', JSON.stringify({
      versao: 1,
      funcionarios: [{ id: '01', nome: 'Maria Silva', ativo: true }],
      produtos: [{ id: 'P1', nome: 'Pizza', precoCentavos: 4990, ativo: true }],
      pedidos: [{
        id: 'x', numero: 7, funcionarioId: '01', funcionarioNome: 'Maria Silva',
        produtoId: 'P1', produtoNome: 'Pizza', precoCentavos: 4990,
        descricao: '', situacao: 'CONFIRMADO', criadoEm: new Date().toISOString()
      }],
      proximoPedido: 8
    }));

    montar();
    const historico = [...container.querySelectorAll('.sidebar nav button')]
      .find((b) => b.textContent === 'Histórico');
    act(() => { historico.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    expect(container.textContent).toContain('Maria Silva');
    expect(container.textContent).toContain('007');
  });
});
