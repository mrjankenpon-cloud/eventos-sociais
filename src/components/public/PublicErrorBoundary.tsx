import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Evita tela totalmente em branco se uma rota pública lançar erro de render.
 */
export class PublicErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PublicErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container py-20 max-w-md text-center space-y-4">
          <h1 className="text-2xl font-black text-gray-900">
            Não foi possível abrir esta página
          </h1>
          <p className="text-sm text-gray-600">
            Atualize a página ou volte à lista de eventos.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button className="rounded-2xl" onClick={this.handleRetry}>
              Atualizar
            </Button>
            <Link to="/">
              <Button variant="secondary" className="rounded-2xl w-full">
                Voltar ao início
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
