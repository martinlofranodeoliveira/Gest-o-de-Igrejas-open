import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Erro inesperado',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Renderer error boundary caught:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const setupIssue =
      this.state.message.toLowerCase().includes('electron') ||
      this.state.message.toLowerCase().includes('sqlite') ||
      this.state.message.toLowerCase().includes('bridge') ||
      this.state.message.toLowerCase().includes('api');

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-on-surface">
        <div className="w-full max-w-2xl rounded-[2rem] bg-surface-container-lowest p-10 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-error">Sistema indisponível</p>
          <h1 className="mt-4 font-headline text-4xl font-extrabold text-on-surface">
            {setupIssue
              ? 'Não foi possível carregar esta instalação corretamente.'
              : 'O sistema encontrou um problema ao abrir esta tela.'}
          </h1>
          <p className="mt-4 text-base leading-7 text-on-surface-variant">
            {setupIssue
              ? 'Feche e abra o aplicativo novamente. Se o problema continuar, reinstale esta cópia do sistema nesta máquina.'
              : 'Recarregue o sistema para tentar novamente. Se o problema continuar, revise os dados mais recentes cadastrados.'}
          </p>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="satin-gradient rounded-xl px-8 py-4 text-sm font-bold text-on-primary shadow-lg"
            >
              Recarregar aplicativo
            </button>
          </div>
        </div>
      </div>
    );
  }
}
