import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openErrorReport } from '@/lib/error-report';
import {
  clearErrorBoundaryActive,
  markErrorBoundaryActive,
  tryAutoRecoverFromError,
} from '@/lib/error-boundary-recovery';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  private recovering = false;

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    markErrorBoundaryActive();
    // Transient resume/bfcache crashes often clear after one reload.
    if (document.visibilityState === 'visible') {
      tryAutoRecoverFromError();
    }
  }

  componentDidMount() {
    window.addEventListener('pageshow', this.handlePageShow);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.hasError && !this.state.hasError) {
      clearErrorBoundaryActive();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('pageshow', this.handlePageShow);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private recoverFromCachedError = () => {
    if (!this.state.hasError || this.recovering) return;
    this.recovering = true;
    clearErrorBoundaryActive();
    window.location.reload();
  };

  private handlePageShow = (event: PageTransitionEvent) => {
    // bfcache restore of a frozen crash UI — always hard-reload.
    if (event.persisted) this.recoverFromCachedError();
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible' || !this.state.hasError) return;
    // One automatic recover for tab-resume glitches (admin + storefront).
    tryAutoRecoverFromError();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#11151b] p-4">
          <div className="w-full max-w-3xl rounded-[1.75rem] border border-[#7a4205] bg-[#2c1703] p-6 text-white shadow-2xl">
            <div className="flex items-start gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e59c00] text-[#2c1703]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-4">
                <h1 className="text-2xl font-bold">Something went wrong</h1>
                <p className="max-w-2xl text-lg leading-9 text-[#e5d4c2]">
                  An unexpected website error occurred. Try refreshing your browser, but if the issue persists, please report it so admin can review it.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="bg-[#f26522] hover:bg-[#d94e0f]"
                    onClick={() => openErrorReport({
                      title: 'Unexpected website error',
                      message: 'An unexpected website error occurred. Please describe what happened before the crash.',
                      source: 'website_error',
                    })}
                  >
                    Report Error
                  </Button>
                  <Button
                    onClick={() => {
                      clearErrorBoundaryActive();
                      this.setState({ hasError: false });
                      window.location.href = '/';
                    }}
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
