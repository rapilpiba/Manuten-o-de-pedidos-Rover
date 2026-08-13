/**
 * Armazenamento local da Rover Pizzaria.
 *
 * Não existe servidor nesta versão: tudo o que é gravado fica no navegador
 * deste aparelho. O padrão segue o que funciona bem em aplicações offline —
 * versão explícita, leitura defensiva e descarte de registros malformados —
 * para que uma atualização do sistema nunca derrube a tela do operador.
 */

const CHAVE = 'rover-pizzaria-dados';
export const VERSAO = 1;

const VAZIO = { versao: VERSAO, funcionarios: [], produtos: [], pedidos: [], proximoPedido: 1 };

function novoId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function ehTextoUtil(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

/** Descarta qualquer cadastro que não tenha o mínimo para ser usado. */
function limparCadastros(lista, comPreco) {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((item) => item && ehTextoUtil(item.id) && ehTextoUtil(item.nome))
    .map((item) => ({
      id: item.id.trim(),
      nome: item.nome.trim(),
      ativo: item.ativo !== false,
      precoCentavos: comPreco ? Math.max(0, Math.round(Number(item.precoCentavos) || 0)) : undefined,
      criadoEm: item.criadoEm || new Date().toISOString()
    }));
}

/** Um pedido só é válido se preservar a cópia do nome e do preço do momento. */
function limparPedidos(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((p) => (
      p &&
      Number.isFinite(Number(p.numero)) &&
      ehTextoUtil(p.funcionarioNome) &&
      ehTextoUtil(p.produtoNome) &&
      ehTextoUtil(p.criadoEm)
    ))
    .map((p) => ({
      id: p.id || novoId(),
      numero: Number(p.numero),
      funcionarioId: String(p.funcionarioId ?? ''),
      funcionarioNome: p.funcionarioNome,
      produtoId: String(p.produtoId ?? ''),
      produtoNome: p.produtoNome,
      precoCentavos: Math.max(0, Math.round(Number(p.precoCentavos) || 0)),
      descricao: typeof p.descricao === 'string' ? p.descricao : '',
      situacao: p.situacao === 'CANCELADO' ? 'CANCELADO' : 'CONFIRMADO',
      criadoEm: p.criadoEm,
      canceladoEm: p.canceladoEm || null,
      motivoCancelamento: p.motivoCancelamento || null
    }));
}

/**
 * Aceita dados de qualquer versão conhecida e devolve sempre um formato válido.
 * Quando chegar a versão 2, o lugar de traduzir o formato antigo é aqui.
 */
export function migrar(bruto) {
  if (!bruto || typeof bruto !== 'object') return { ...VAZIO };

  const funcionarios = limparCadastros(bruto.funcionarios, false);
  const produtos = limparCadastros(bruto.produtos, true);
  const pedidos = limparPedidos(bruto.pedidos);

  // O próximo número nunca pode repetir um pedido já existente, mesmo que o
  // contador salvo tenha se perdido ou vindo errado de um arquivo importado.
  const maiorNumero = pedidos.reduce((maior, p) => Math.max(maior, p.numero), 0);
  const proximoPedido = Math.max(Number(bruto.proximoPedido) || 1, maiorNumero + 1);

  return { versao: VERSAO, funcionarios, produtos, pedidos, proximoPedido };
}

export function carregar() {
  let bruto;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {
    return { ...VAZIO };
  }
  if (!bruto) return { ...VAZIO };

  try {
    return migrar(JSON.parse(bruto));
  } catch {
    // Dado corrompido: começa limpo em vez de travar a aplicação.
    return { ...VAZIO };
  }
}

export function salvar(dados) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    return true;
  } catch {
    // Armazenamento cheio ou bloqueado (navegação privada).
    return false;
  }
}

export { novoId, VAZIO };
