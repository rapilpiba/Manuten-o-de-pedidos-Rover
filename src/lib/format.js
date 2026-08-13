// Objetos Intl são caros de criar: ficam no topo do módulo e são reaproveitados.
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const dataLonga = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export function formatarMoeda(centavos) {
  return moeda.format(Number(centavos || 0) / 100);
}

export function formatarDataHora(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '—' : dataHora.format(data);
}

export function formatarDataLonga(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '—' : dataLonga.format(data);
}

export function numeroPedido(numero) {
  return String(numero).padStart(3, '0');
}

/** Aceita "49,90", "49.90", "R$ 49,90" e "1.234,56". Devolve centavos ou null. */
export function lerPreco(valor) {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || valor < 0 || valor > 10_000_000) return null;
    return Math.round(valor * 100);
  }

  const bruto = String(valor ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!bruto) return null;

  let normalizado = bruto;
  const temVirgula = bruto.includes(',');
  const temPonto = bruto.includes('.');
  if (temVirgula && temPonto) {
    normalizado = bruto.lastIndexOf(',') > bruto.lastIndexOf('.')
      ? bruto.replace(/\./g, '').replace(',', '.')
      : bruto.replace(/,/g, '');
  } else if (temVirgula) {
    normalizado = bruto.replace(',', '.');
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0 || numero > 10_000_000) return null;
  return Math.round(numero * 100);
}

/** Data de hoje no formato aceito por <input type="date">, no fuso do aparelho. */
export function hojeInput() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

/** Converte "2026-08-13" no início/fim do dia, no fuso do próprio aparelho. */
export function limiteDoDia(data, ponta) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const [ano, mes, dia] = data.split('-').map(Number);
  return ponta === 'fim'
    ? new Date(ano, mes - 1, dia, 23, 59, 59, 999).getTime()
    : new Date(ano, mes - 1, dia, 0, 0, 0, 0).getTime();
}
