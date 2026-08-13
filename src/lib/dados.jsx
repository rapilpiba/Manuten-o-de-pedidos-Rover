import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { carregar, salvar, migrar, novoId, VERSAO } from './storage.js';
import { lerPreco, limiteDoDia } from './format.js';

const DadosContext = createContext(null);

export function DadosProvider({ children }) {
  const [dados, setDados] = useState(() => carregar());
  const [erroGravacao, setErroGravacao] = useState('');
  const primeiraCarga = useRef(true);

  // Toda alteração é gravada no aparelho. Se a gravação falhar (armazenamento
  // cheio, navegação privada), o operador precisa saber na hora — senão ele
  // trabalha o expediente inteiro achando que está salvando.
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    setErroGravacao(salvar(dados) ? '' : 'Não foi possível gravar neste aparelho. Exporte uma cópia agora mesmo.');
  }, [dados]);

  const acoes = useMemo(() => ({
    salvarFuncionario(entrada, idOriginal) {
      const id = String(entrada.id || '').trim();
      const nome = String(entrada.nome || '').trim();
      if (!id || !nome) return { erro: 'Informe ID e nome.' };

      let resultado = {};
      setDados((atual) => {
        const conflito = atual.funcionarios.some(
          (f) => f.id.toLowerCase() === id.toLowerCase() && f.id !== idOriginal
        );
        if (conflito) {
          resultado = { erro: 'Já existe um funcionário com este ID.' };
          return atual;
        }

        const ativo = entrada.ativo !== false;
        if (idOriginal) {
          return {
            ...atual,
            funcionarios: atual.funcionarios.map((f) => (
              f.id === idOriginal ? { ...f, id, nome, ativo } : f
            ))
          };
        }
        return {
          ...atual,
          funcionarios: [...atual.funcionarios, { id, nome, ativo, criadoEm: new Date().toISOString() }]
        };
      });
      return resultado;
    },

    salvarProduto(entrada, idOriginal) {
      const id = String(entrada.id || '').trim();
      const nome = String(entrada.nome || '').trim();
      const precoCentavos = lerPreco(entrada.preco);
      if (!id || !nome) return { erro: 'Informe ID e nome.' };
      if (precoCentavos === null) return { erro: 'Informe um preço válido (ex.: 49,90).' };

      let resultado = {};
      setDados((atual) => {
        const conflito = atual.produtos.some(
          (p) => p.id.toLowerCase() === id.toLowerCase() && p.id !== idOriginal
        );
        if (conflito) {
          resultado = { erro: 'Já existe um produto com este ID.' };
          return atual;
        }

        const ativo = entrada.ativo !== false;
        if (idOriginal) {
          return {
            ...atual,
            produtos: atual.produtos.map((p) => (
              p.id === idOriginal ? { ...p, id, nome, precoCentavos, ativo } : p
            ))
          };
        }
        return {
          ...atual,
          produtos: [...atual.produtos, { id, nome, precoCentavos, ativo, criadoEm: new Date().toISOString() }]
        };
      });
      return resultado;
    },

    alternarAtivo(tipo, id) {
      const campo = tipo === 'funcionarios' ? 'funcionarios' : 'produtos';
      setDados((atual) => ({
        ...atual,
        [campo]: atual[campo].map((item) => (item.id === id ? { ...item, ativo: !item.ativo } : item))
      }));
    },

    /**
     * REGRA DE AUDITORIA: o pedido guarda uma cópia do nome e do preço válidos
     * agora. Renomear o funcionário ou reprecificar o produto depois não pode
     * alterar nenhum pedido já lançado.
     */
    lancarPedido({ funcionarioId, produtoId, descricao }) {
      let resultado = {};
      setDados((atual) => {
        const funcionario = atual.funcionarios.find(
          (f) => f.id.toLowerCase() === String(funcionarioId).trim().toLowerCase() && f.ativo
        );
        const produto = atual.produtos.find(
          (p) => p.id.toLowerCase() === String(produtoId).trim().toLowerCase() && p.ativo
        );
        if (!funcionario || !produto) {
          resultado = { erro: 'Funcionário ou produto inexistente ou inativo.' };
          return atual;
        }

        const pedido = {
          id: novoId(),
          numero: atual.proximoPedido,
          funcionarioId: funcionario.id,
          funcionarioNome: funcionario.nome,
          produtoId: produto.id,
          produtoNome: produto.nome,
          precoCentavos: produto.precoCentavos,
          descricao: String(descricao || '').trim(),
          situacao: 'CONFIRMADO',
          criadoEm: new Date().toISOString(),
          canceladoEm: null,
          motivoCancelamento: null
        };
        resultado = { pedido };
        return { ...atual, pedidos: [...atual.pedidos, pedido], proximoPedido: atual.proximoPedido + 1 };
      });
      return resultado;
    },

    cancelarPedido(id, motivo) {
      setDados((atual) => ({
        ...atual,
        pedidos: atual.pedidos.map((p) => (
          p.id === id && p.situacao === 'CONFIRMADO'
            ? {
              ...p,
              situacao: 'CANCELADO',
              canceladoEm: new Date().toISOString(),
              motivoCancelamento: String(motivo || '').trim() || null
            }
            : p
        ))
      }));
    },

    substituirTudo(novos) {
      setDados(migrar(novos));
    }
  }), []);

  const valor = useMemo(() => ({
    ...dados,
    ...acoes,
    erroGravacao,
    funcionariosAtivos: dados.funcionarios.filter((f) => f.ativo),
    produtosAtivos: dados.produtos.filter((p) => p.ativo),
    versao: VERSAO
  }), [dados, acoes, erroGravacao]);

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>;
}

export function useDados() {
  const contexto = useContext(DadosContext);
  if (!contexto) throw new Error('useDados precisa estar dentro de DadosProvider.');
  return contexto;
}

/** Filtra pedidos por funcionário, período e situação. */
export function filtrarPedidos(pedidos, filtros) {
  const busca = String(filtros.funcionario || '').trim().toLowerCase();
  const de = filtros.de ? limiteDoDia(filtros.de, 'inicio') : null;
  const ate = filtros.ate ? limiteDoDia(filtros.ate, 'fim') : null;

  return pedidos
    .filter((p) => {
      if (busca && !p.funcionarioNome.toLowerCase().includes(busca) && !p.funcionarioId.toLowerCase().includes(busca)) {
        return false;
      }
      const momento = new Date(p.criadoEm).getTime();
      if (de !== null && momento < de) return false;
      if (ate !== null && momento > ate) return false;
      if (filtros.situacao && p.situacao !== filtros.situacao) return false;
      return true;
    })
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}

export function resumir(pedidos) {
  let confirmados = 0;
  let centavos = 0;
  for (const p of pedidos) {
    if (p.situacao === 'CONFIRMADO') {
      confirmados += 1;
      centavos += p.precoCentavos;
    }
  }
  return { total: pedidos.length, confirmados, cancelados: pedidos.length - confirmados, centavos };
}
