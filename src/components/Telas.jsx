import { memo, useMemo, useRef, useState } from 'react';
import { useDados, filtrarPedidos, resumir } from '../lib/dados.jsx';
import { formatarMoeda, formatarDataHora, formatarDataLonga, numeroPedido, hojeInput } from '../lib/format.js';

function Aviso({ tipo = 'info', children }) {
  if (!children) return null;
  return <div className={`notice notice-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>;
}

/* ── Novo pedido ─────────────────────────────────────────────────────────── */

export function NovoPedido() {
  const dados = useDados();
  const [funcionarioId, setFuncionarioId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [aviso, setAviso] = useState(null);
  const primeiroCampo = useRef(null);

  // Busca por chave em vez de percorrer a lista a cada tecla digitada.
  const porFuncionario = useMemo(
    () => new Map(dados.funcionariosAtivos.map((f) => [f.id.toLowerCase(), f])),
    [dados.funcionariosAtivos]
  );
  const porProduto = useMemo(
    () => new Map(dados.produtosAtivos.map((p) => [p.id.toLowerCase(), p])),
    [dados.produtosAtivos]
  );

  const funcionario = porFuncionario.get(funcionarioId.trim().toLowerCase()) || null;
  const produto = porProduto.get(produtoId.trim().toLowerCase()) || null;

  function enviar(evento) {
    evento.preventDefault();
    const { pedido, erro } = dados.lancarPedido({ funcionarioId, produtoId, descricao });
    if (erro) {
      setAviso({ tipo: 'error', texto: erro });
      return;
    }
    setAviso({
      tipo: 'success',
      texto: `Pedido ${numeroPedido(pedido.numero)} lançado: ${pedido.funcionarioNome} — ${pedido.produtoNome} — ${formatarMoeda(pedido.precoCentavos)}.`
    });
    setFuncionarioId('');
    setProdutoId('');
    setDescricao('');
    primeiroCampo.current?.focus();
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Operação</p>
          <h2>Novo pedido</h2>
          <p className="muted">Digite os IDs e confira os nomes antes de salvar.</p>
        </div>
      </div>

      <Aviso tipo="error">{dados.erroGravacao}</Aviso>

      {!dados.funcionariosAtivos.length || !dados.produtosAtivos.length ? (
        <Aviso tipo="info">
          Cadastre pelo menos um funcionário e um produto antes de lançar pedidos.
        </Aviso>
      ) : null}

      <div className="two-columns order-layout">
        <form className="panel stack" onSubmit={enviar}>
          <label>
            ID do funcionário
            <input
              ref={primeiroCampo}
              list="lista-funcionarios"
              value={funcionarioId}
              onChange={(e) => setFuncionarioId(e.target.value)}
              placeholder="Ex.: 01"
              autoComplete="off"
              required
            />
            <datalist id="lista-funcionarios">
              {dados.funcionariosAtivos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </datalist>
          </label>
          <label>
            ID do produto
            <input
              list="lista-produtos"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              placeholder="Ex.: P1"
              autoComplete="off"
              required
            />
            <datalist id="lista-produtos">
              {dados.produtosAtivos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} — {formatarMoeda(p.precoCentavos)}</option>
              ))}
            </datalist>
          </label>
          <label>
            Descrição opcional
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Ex.: sem cebola, consumo no local…"
            />
          </label>
          <button className="button button-primary" disabled={!funcionario || !produto}>
            Confirmar pedido
          </button>
          {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
        </form>

        <aside className="panel confirmation-card">
          <p className="eyebrow">Conferência</p>
          <h3>Dados do pedido</h3>
          <div className="confirmation-row">
            <span>Funcionário</span>
            <strong>{funcionario ? `${funcionario.nome} — ID ${funcionario.id}` : 'ID não identificado'}</strong>
          </div>
          <div className="confirmation-row">
            <span>Produto</span>
            <strong>{produto ? `${produto.nome} — ID ${produto.id}` : 'ID não identificado'}</strong>
          </div>
          <div className="confirmation-row">
            <span>Preço</span>
            <strong>{produto ? formatarMoeda(produto.precoCentavos) : '—'}</strong>
          </div>
          <div className="confirmation-row">
            <span>Descrição</span>
            <strong>{descricao || 'Sem descrição'}</strong>
          </div>
          <p className="muted small">A data e a hora são registradas automaticamente.</p>
        </aside>
      </div>
    </section>
  );
}

/* ── Cadastros ───────────────────────────────────────────────────────────── */

const LinhaCadastro = memo(function LinhaCadastro({ item, ehFuncionario, aoEditar, aoAlternar }) {
  return (
    <tr className={item.ativo ? '' : 'row-inactive'}>
      <td><strong>{item.id}</strong></td>
      <td>{item.nome}</td>
      {!ehFuncionario && <td><strong>{formatarMoeda(item.precoCentavos)}</strong></td>}
      <td>
        <span className={`status status-${item.ativo ? 'active' : 'inactive'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="actions-cell">
        <button type="button" className="link-button" onClick={() => aoEditar(item)}>Editar</button>
        <button type="button" className="link-button" onClick={() => aoAlternar(item)}>
          {item.ativo ? 'Inativar' : 'Ativar'}
        </button>
      </td>
    </tr>
  );
});

export function Cadastros({ tipo }) {
  const ehFuncionario = tipo === 'funcionarios';
  const dados = useDados();
  const itens = ehFuncionario ? dados.funcionarios : dados.produtos;

  const [form, setForm] = useState({ id: '', nome: '', preco: '', ativo: true });
  const [editando, setEditando] = useState(null);
  const [aviso, setAviso] = useState(null);

  function limpar() {
    setEditando(null);
    setForm({ id: '', nome: '', preco: '', ativo: true });
  }

  function editar(item) {
    setEditando(item.id);
    setForm({
      id: item.id,
      nome: item.nome,
      preco: ehFuncionario ? '' : String((item.precoCentavos / 100).toFixed(2)).replace('.', ','),
      ativo: item.ativo
    });
    setAviso(null);
  }

  function enviar(evento) {
    evento.preventDefault();
    const salvar = ehFuncionario ? dados.salvarFuncionario : dados.salvarProduto;
    const { erro } = salvar(form, editando) || {};
    if (erro) {
      setAviso({ tipo: 'error', texto: erro });
      return;
    }
    setAviso({ tipo: 'success', texto: 'Cadastro salvo.' });
    limpar();
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cadastros</p>
          <h2>{ehFuncionario ? 'Funcionários' : 'Produtos'}</h2>
          <p className="muted">IDs podem conter zeros à esquerda.</p>
        </div>
      </div>

      <div className="two-columns registry-layout">
        <form className="panel stack" onSubmit={enviar}>
          <h3>{editando ? 'Editar cadastro' : 'Novo cadastro'}</h3>
          <label>
            ID
            <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required autoComplete="off" />
          </label>
          <label>
            Nome
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoComplete="off" />
          </label>
          {!ehFuncionario && (
            <label>
              Preço (R$)
              <input
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="Ex.: 49,90"
                required
              />
            </label>
          )}
          {editando && (
            <label className="checkbox-row">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              Cadastro ativo
            </label>
          )}
          <div className="button-row">
            <button className="button button-primary">Salvar</button>
            {editando && <button type="button" className="button button-secondary" onClick={limpar}>Cancelar</button>}
          </div>
          {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
        </form>

        <div className="panel table-panel">
          <div className="table-title">
            <h3>Cadastros existentes</h3>
            <span className="badge">{itens.length}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Nome</th>{!ehFuncionario && <th>Preço</th>}<th>Situação</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <LinhaCadastro
                    key={item.id}
                    item={item}
                    ehFuncionario={ehFuncionario}
                    aoEditar={editar}
                    aoAlternar={() => dados.alternarAtivo(tipo, item.id)}
                  />
                ))}
                {!itens.length && (
                  <tr><td colSpan={ehFuncionario ? 4 : 5} className="empty-cell">Nenhum cadastro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Histórico ───────────────────────────────────────────────────────────── */

export function Historico() {
  const dados = useDados();
  const [filtros, setFiltros] = useState(() => ({
    funcionario: '', de: hojeInput(), ate: hojeInput(), situacao: ''
  }));
  const [aplicados, setAplicados] = useState(filtros);

  const encontrados = useMemo(() => filtrarPedidos(dados.pedidos, aplicados), [dados.pedidos, aplicados]);
  const resumo = useMemo(() => resumir(encontrados), [encontrados]);

  function cancelar(pedido) {
    const motivo = window.prompt(`Motivo do cancelamento do pedido ${numeroPedido(pedido.numero)} (opcional):`);
    if (motivo === null) return;
    dados.cancelarPedido(pedido.id, motivo);
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Consulta</p>
          <h2>Histórico de pedidos</h2>
          <p className="muted">Pesquise pelo ID ou pelo nome do funcionário.</p>
        </div>
      </div>

      <form className="panel filter-bar" onSubmit={(e) => { e.preventDefault(); setAplicados(filtros); }}>
        <label>
          Funcionário
          <input value={filtros.funcionario} onChange={(e) => setFiltros({ ...filtros, funcionario: e.target.value })} placeholder="ID ou nome" />
        </label>
        <label>
          De
          <input type="date" value={filtros.de} onChange={(e) => setFiltros({ ...filtros, de: e.target.value })} />
        </label>
        <label>
          Até
          <input type="date" value={filtros.ate} onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })} />
        </label>
        <label>
          Situação
          <select value={filtros.situacao} onChange={(e) => setFiltros({ ...filtros, situacao: e.target.value })}>
            <option value="">Todos</option>
            <option value="CONFIRMADO">Confirmados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </label>
        <button className="button button-primary">Pesquisar</button>
      </form>

      <div className="panel table-panel history-table">
        <div className="table-title">
          <h3>Pedidos encontrados</h3>
          <div className="table-summary">
            <span className="badge">{resumo.total}</span>
            <span className="muted small">
              {resumo.confirmados} confirmados · {resumo.cancelados} cancelados · {formatarMoeda(resumo.centavos)}
            </span>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pedido</th><th>Funcionário</th><th>Produto</th><th>Preço</th>
                <th>Descrição</th><th>Data e hora</th><th>Situação</th><th />
              </tr>
            </thead>
            <tbody>
              {encontrados.map((p) => (
                <tr key={p.id}>
                  <td><strong>{numeroPedido(p.numero)}</strong></td>
                  <td>{p.funcionarioNome}<small>ID {p.funcionarioId}</small></td>
                  <td>{p.produtoNome}<small>ID {p.produtoId}</small></td>
                  <td><strong>{formatarMoeda(p.precoCentavos)}</strong></td>
                  <td>{p.descricao || '—'}</td>
                  <td>{formatarDataHora(p.criadoEm)}</td>
                  <td><span className={`status status-${p.situacao.toLowerCase()}`}>{p.situacao}</span></td>
                  <td>
                    {p.situacao === 'CONFIRMADO' && (
                      <button type="button" className="link-button danger" onClick={() => cancelar(p)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
              {!encontrados.length && (
                <tr><td colSpan="8" className="empty-cell">Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ── Relatório ───────────────────────────────────────────────────────────── */

export function Relatorio() {
  const dados = useDados();
  const [filtros, setFiltros] = useState(() => ({
    funcionario: '', de: hojeInput(), ate: hojeInput(), incluirCancelados: true
  }));

  const encontrados = useMemo(() => {
    const lista = filtrarPedidos(dados.pedidos, filtros);
    return filtros.incluirCancelados ? lista : lista.filter((p) => p.situacao === 'CONFIRMADO');
  }, [dados.pedidos, filtros]);

  const resumo = useMemo(() => resumir(encontrados), [encontrados]);

  return (
    <section>
      <div className="section-heading nao-imprimir">
        <div>
          <p className="eyebrow">Fechamento</p>
          <h2>Relatório</h2>
          <p className="muted">
            Monte o relatório e use “Imprimir”. Na janela de impressão, escolha
            “Salvar como PDF” para guardar o arquivo.
          </p>
        </div>
      </div>

      <form className="panel report-card stack nao-imprimir" onSubmit={(e) => e.preventDefault()}>
        <div className="two-columns compact-columns">
          <label>
            Data inicial
            <input type="date" value={filtros.de} onChange={(e) => setFiltros({ ...filtros, de: e.target.value })} />
          </label>
          <label>
            Data final
            <input type="date" value={filtros.ate} onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })} />
          </label>
        </div>
        <label>
          Filtrar funcionário (opcional)
          <input value={filtros.funcionario} onChange={(e) => setFiltros({ ...filtros, funcionario: e.target.value })} placeholder="ID ou nome" />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={filtros.incluirCancelados}
            onChange={(e) => setFiltros({ ...filtros, incluirCancelados: e.target.checked })}
          />
          Incluir pedidos cancelados
        </label>
        <button type="button" className="button button-primary" onClick={() => window.print()}>
          Imprimir / Salvar em PDF
        </button>
      </form>

      <div className="folha-impressao panel">
        <header className="folha-cabecalho">
          <img src="./rover-pizzaria-logo.png" alt="" width="56" height="56" />
          <h1>ROVER PIZZARIA</h1>
          <h2>RELATÓRIO DE PEDIDOS</h2>
          <p>Gerado em: {formatarDataLonga(new Date().toISOString())}</p>
        </header>

        <p className="folha-resumo">
          Total: {resumo.total} | Confirmados: {resumo.confirmados} | Cancelados: {resumo.cancelados}
          <br />
          Valor dos pedidos confirmados: <strong>{formatarMoeda(resumo.centavos)}</strong>
        </p>

        {!encontrados.length && <p>Nenhum pedido encontrado para os filtros informados.</p>}

        {encontrados.map((p) => (
          <article className="folha-pedido" key={p.id}>
            <h3>PEDIDO - {numeroPedido(p.numero)}{p.situacao === 'CANCELADO' ? ' — CANCELADO' : ''}</h3>
            <p>Nome (funcionário): {p.funcionarioNome} (ID: {p.funcionarioId})</p>
            <p>Produto: {p.produtoNome} (ID: {p.produtoId})</p>
            <p>Preço: {formatarMoeda(p.precoCentavos)}</p>
            <p>Descrição: {p.descricao || '—'}</p>
            <p>Data e hora: {formatarDataLonga(p.criadoEm)}</p>
            {p.situacao === 'CANCELADO' && (
              <>
                <p>Cancelado em: {formatarDataLonga(p.canceladoEm)}</p>
                <p>Motivo: {p.motivoCancelamento || 'Não informado'}</p>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
