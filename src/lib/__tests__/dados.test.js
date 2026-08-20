import { describe, it, expect } from 'vitest';
import { migrar, VERSAO } from '../storage.js';
import { lerPreco, numeroPedido, limiteDoDia } from '../format.js';
import { filtrarPedidos, resumir } from '../dados.jsx';

const pedidoBase = {
  id: 'a', numero: 1, funcionarioId: '01', funcionarioNome: 'Maria',
  produtoId: 'P1', produtoNome: 'Pizza', precoCentavos: 4990,
  descricao: '', situacao: 'CONFIRMADO', criadoEm: '2026-08-13T15:00:00.000Z'
};

describe('lerPreco — dinheiro não pode virar arredondamento errado', () => {
  it('aceita os formatos usados no dia a dia', () => {
    expect(lerPreco('49,90')).toBe(4990);
    expect(lerPreco('49.90')).toBe(4990);
    expect(lerPreco('R$ 49,90')).toBe(4990);
    expect(lerPreco('1.234,56')).toBe(123456);
    expect(lerPreco('1,234.56')).toBe(123456);
    expect(lerPreco(49.9)).toBe(4990);
  });

  it('arredonda centavos em vez de truncar', () => {
    expect(lerPreco('0,555')).toBe(56);
    expect(lerPreco('0,554')).toBe(55);
  });

  it('recusa valores inválidos, negativos e absurdos', () => {
    for (const valor of ['abc', '', null, undefined, '-10', -1, NaN, Infinity, '99999999999']) {
      expect(lerPreco(valor)).toBeNull();
    }
  });

  it('aceita zero (cortesia)', () => {
    expect(lerPreco('0')).toBe(0);
  });
});

describe('migrar — dados gravados precisam sobreviver a atualizações', () => {
  it('devolve estrutura vazia para entrada inútil', () => {
    for (const entrada of [null, undefined, 'texto', 42]) {
      const saida = migrar(entrada);
      expect(saida.versao).toBe(VERSAO);
      expect(saida.pedidos).toEqual([]);
      expect(saida.proximoPedido).toBe(1);
    }
  });

  it('descarta cadastros sem ID ou sem nome', () => {
    const saida = migrar({
      funcionarios: [{ id: '01', nome: 'Maria' }, { id: '', nome: 'X' }, { id: '02' }, null]
    });
    expect(saida.funcionarios).toHaveLength(1);
    expect(saida.funcionarios[0].nome).toBe('Maria');
  });

  it('descarta pedidos que perderam a cópia do nome ou do preço', () => {
    const saida = migrar({
      pedidos: [pedidoBase, { ...pedidoBase, id: 'b', funcionarioNome: '' }, { ...pedidoBase, id: 'c', criadoEm: '' }]
    });
    expect(saida.pedidos).toHaveLength(1);
  });

  it('nunca reaproveita um número de pedido já usado', () => {
    const saida = migrar({
      pedidos: [{ ...pedidoBase, numero: 57 }],
      proximoPedido: 2
    });
    expect(saida.proximoPedido).toBe(58);
  });

  it('trata cadastro sem o campo ativo como ativo', () => {
    const saida = migrar({ funcionarios: [{ id: '01', nome: 'Maria' }] });
    expect(saida.funcionarios[0].ativo).toBe(true);
  });

  it('normaliza situação desconhecida para CONFIRMADO', () => {
    const saida = migrar({ pedidos: [{ ...pedidoBase, situacao: 'QUALQUER' }] });
    expect(saida.pedidos[0].situacao).toBe('CONFIRMADO');
  });

  it('preserva zeros à esquerda dos IDs', () => {
    const saida = migrar({ funcionarios: [{ id: '007', nome: 'Maria' }] });
    expect(saida.funcionarios[0].id).toBe('007');
  });
});

describe('filtrarPedidos e resumir', () => {
  const pedidos = [
    { ...pedidoBase, id: 'a', numero: 1 },
    { ...pedidoBase, id: 'b', numero: 2, funcionarioNome: 'João', funcionarioId: '02' },
    { ...pedidoBase, id: 'c', numero: 3, situacao: 'CANCELADO' }
  ];

  it('busca por nome e por ID do funcionário', () => {
    expect(filtrarPedidos(pedidos, { funcionario: 'maria' })).toHaveLength(2);
    expect(filtrarPedidos(pedidos, { funcionario: '02' })).toHaveLength(1);
  });

  it('filtra por situação', () => {
    expect(filtrarPedidos(pedidos, { situacao: 'CANCELADO' })).toHaveLength(1);
  });

  it('o valor total ignora pedidos cancelados', () => {
    const resumo = resumir(pedidos);
    expect(resumo.total).toBe(3);
    expect(resumo.confirmados).toBe(2);
    expect(resumo.cancelados).toBe(1);
    expect(resumo.centavos).toBe(9980);
  });

  it('período que não contém os pedidos volta vazio', () => {
    expect(filtrarPedidos(pedidos, { de: '2020-01-01', ate: '2020-01-02' })).toHaveLength(0);
  });

  it('o fim do dia inclui o último minuto', () => {
    const inicio = limiteDoDia('2026-08-13', 'inicio');
    const fim = limiteDoDia('2026-08-13', 'fim');
    expect(fim - inicio).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

describe('busca por funcionário — ID casa exato, nome casa por trecho', () => {
  // Cenário exatamente como o relatado: ryan é o 14, titi é o 1.
  const pedidos = [
    { ...pedidoBase, id: 'a', numero: 1, funcionarioId: '14', funcionarioNome: 'ryan' },
    { ...pedidoBase, id: 'b', numero: 2, funcionarioId: '14', funcionarioNome: 'ryan' },
    { ...pedidoBase, id: 'c', numero: 3, funcionarioId: '1', funcionarioNome: 'titi' }
  ];

  it('buscar o ID 1 não traz os pedidos do ID 14', () => {
    const achados = filtrarPedidos(pedidos, { funcionario: '1' });
    expect(achados).toHaveLength(1);
    expect(achados[0].funcionarioNome).toBe('titi');
  });

  it('buscar o ID 14 traz só os pedidos do 14', () => {
    const achados = filtrarPedidos(pedidos, { funcionario: '14' });
    expect(achados).toHaveLength(2);
    expect(achados.every((p) => p.funcionarioId === '14')).toBe(true);
  });

  it('nome continua achando por trecho', () => {
    expect(filtrarPedidos(pedidos, { funcionario: 'ry' })).toHaveLength(2);
    expect(filtrarPedidos(pedidos, { funcionario: 'ti' })).toHaveLength(1);
  });

  it('ignora maiúsculas e espaços nas pontas', () => {
    expect(filtrarPedidos(pedidos, { funcionario: '  RYAN  ' })).toHaveLength(2);
  });

  it('zeros à esquerda são IDs diferentes', () => {
    const comZero = [...pedidos, { ...pedidoBase, id: 'd', numero: 4, funcionarioId: '01', funcionarioNome: 'ana' }];
    expect(filtrarPedidos(comZero, { funcionario: '01' })).toHaveLength(1);
    expect(filtrarPedidos(comZero, { funcionario: '1' })).toHaveLength(1);
  });

  it('busca sem resultado devolve lista vazia', () => {
    expect(filtrarPedidos(pedidos, { funcionario: '99' })).toHaveLength(0);
  });
});

describe('numeroPedido', () => {
  it('completa com zeros à esquerda', () => {
    expect(numeroPedido(1)).toBe('001');
    expect(numeroPedido(57)).toBe('057');
    expect(numeroPedido(1234)).toBe('1234');
  });
});