import { Component, useMemo, useState } from 'react';
import { DadosProvider } from './lib/dados.jsx';
import { NovoPedido, Cadastros, Historico, Relatorio } from './components/Telas.jsx';
import { Backup } from './components/Backup.jsx';

const ABAS = [
  ['pedido', 'Novo pedido'],
  ['historico', 'Histórico'],
  ['funcionarios', 'Funcionários'],
  ['produtos', 'Produtos'],
  ['relatorio', 'Relatório'],
  ['backup', 'Cópia dos dados']
];

const TELAS = {
  pedido: () => <NovoPedido />,
  historico: () => <Historico />,
  funcionarios: () => <Cadastros tipo="funcionarios" />,
  produtos: () => <Cadastros tipo="produtos" />,
  relatorio: () => <Relatorio />,
  backup: () => <Backup />
};

class LimiteDeErro extends Component {
  constructor(props) {
    super(props);
    this.state = { falhou: false };
  }

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro) {
    console.error('[interface]', erro);
  }

  render() {
    if (!this.state.falhou) return this.props.children;
    return (
      <main className="login-page">
        <section className="login-card">
          <h1>Algo deu errado</h1>
          <p className="muted">
            Recarregue a página. Os pedidos já gravados neste aparelho continuam salvos.
          </p>
          <button className="button button-primary" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}

export default function App() {
  const [aba, setAba] = useState('pedido');
  const titulo = useMemo(() => ABAS.find(([chave]) => chave === aba)?.[1], [aba]);

  return (
    <LimiteDeErro>
      <DadosProvider>
        <div className="app-shell">
          <aside className="sidebar nao-imprimir">
            <div className="sidebar-brand">
              <img src="./rover-pizzaria-logo.png" alt="" width="44" height="44" />
              <div><strong>Rover Pizzaria</strong><small>Controle de pedidos</small></div>
            </div>
            <nav>
              {ABAS.map(([chave, nome]) => (
                <button
                  key={chave}
                  type="button"
                  className={aba === chave ? 'nav-active' : ''}
                  onClick={() => setAba(chave)}
                >
                  {nome}
                </button>
              ))}
            </nav>
          </aside>

          <main className="content">
            <header className="mobile-header nao-imprimir">
              <div className="mobile-brand">
                <img src="./rover-pizzaria-logo.png" alt="" width="36" height="36" />
                <div><strong>Rover Pizzaria</strong><small>{titulo}</small></div>
              </div>
              <select value={aba} onChange={(e) => setAba(e.target.value)} aria-label="Seção">
                {ABAS.map(([chave, nome]) => <option key={chave} value={chave}>{nome}</option>)}
              </select>
            </header>

            {TELAS[aba]()}
          </main>
        </div>
      </DadosProvider>
    </LimiteDeErro>
  );
}
