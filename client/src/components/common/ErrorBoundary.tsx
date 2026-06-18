import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openErrorReport } from '@/lib/error-report';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

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
                  <Button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}>
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
