import { useRef, useState } from 'react';
import { useDados } from '../lib/dados.jsx';
import { VERSAO } from '../lib/storage.js';
import { formatarDataLonga } from '../lib/format.js';

/**
 * Nesta versão os dados existem só neste aparelho. O arquivo de cópia é, ao
 * mesmo tempo, a segurança contra perda e a única forma de levar o histórico
 * para outro computador.
 */
export function Backup() {
  const dados = useDados();
  const [aviso, setAviso] = useState(null);
  const arquivo = useRef(null);

  function exportar() {
    const conteudo = {
      versao: VERSAO,
      exportadoEm: new Date().toISOString(),
      funcionarios: dados.funcionarios,
      produtos: dados.produtos,
      pedidos: dados.pedidos,
      proximoPedido: dados.proximoPedido
    };
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rover-pizzaria-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setAviso({ tipo: 'success', texto: 'Cópia exportada. Guarde o arquivo fora deste aparelho.' });
  }

  async function importar(evento) {
    const selecionado = evento.target.files?.[0];
    if (!selecionado) return;

    // Substituir tudo apaga o que está aqui: precisa de confirmação explícita.
    const confirmado = window.confirm(
      `Importar "${selecionado.name}" vai SUBSTITUIR todos os dados deste aparelho ` +
      `(${dados.pedidos.length} pedido(s) atualmente gravados). Deseja continuar?`
    );
    if (!confirmado) {
      evento.target.value = '';
      return;
    }

    try {
      const texto = await selecionado.text();
      const conteudo = JSON.parse(texto);
      dados.substituirTudo(conteudo);
      setAviso({ tipo: 'success', texto: 'Dados importados com sucesso.' });
    } catch {
      setAviso({ tipo: 'error', texto: 'Arquivo inválido. Escolha um arquivo .json exportado por esta aplicação.' });
    } finally {
      evento.target.value = '';
    }
  }

  const ultimoPedido = dados.pedidos.length
    ? dados.pedidos.reduce((maior, p) => (p.criadoEm > maior ? p.criadoEm : maior), '')
    : null;

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Segurança</p>
          <h2>Cópia dos dados</h2>
          <p className="muted">Exporte com frequência: os dados existem apenas neste aparelho.</p>
        </div>
      </div>

      <div className="panel stack">
        <div className="confirmation-row">
          <span>Funcionários</span><strong>{dados.funcionarios.length}</strong>
        </div>
        <div className="confirmation-row">
          <span>Produtos</span><strong>{dados.produtos.length}</strong>
        </div>
        <div className="confirmation-row">
          <span>Pedidos gravados</span><strong>{dados.pedidos.length}</strong>
        </div>
        <div className="confirmation-row">
          <span>Último pedido</span><strong>{ultimoPedido ? formatarDataLonga(ultimoPedido) : '—'}</strong>
        </div>

        <div className="button-row">
          <button type="button" className="button button-primary" onClick={exportar}>
            Exportar cópia (.json)
          </button>
          <button type="button" className="button button-secondary" onClick={() => arquivo.current?.click()}>
            Importar cópia
          </button>
          <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={importar} />
        </div>

        {aviso && <div className={`notice notice-${aviso.tipo}`}>{aviso.texto}</div>}

        <div className="notice notice-info">
          <strong>Atenção:</strong> limpar os dados de navegação, desinstalar o
          aplicativo ou trocar de aparelho apaga tudo o que está gravado aqui.
          A cópia exportada é a única forma de recuperar.
        </div>
      </div>
    </section>
  );
}
