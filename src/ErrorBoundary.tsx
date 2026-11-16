import { Component, type ReactNode } from 'react';

// Se a tela quebrar ao desenhar, mostra um aviso no lugar da tela em branco.
// Não apaga nem grava nada: ao reabrir, o init segue o caminho normal, com a trava do PIN.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error('Memoras: erro ao desenhar a tela', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flow">
        <div className="card" role="alert">
          <div className="h1">Algo deu errado</div>
          <div className="p">Suas anotações continuam salvas neste aparelho.</div>
          <button className="gel" onClick={() => location.reload()}>Abrir de novo</button>
        </div>
      </div>
    );
  }
}
