import React from 'react';

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main role="alert" className="min-h-screen bg-obsidian-950 text-white grid place-items-center p-6"><div className="max-w-md text-center space-y-4">
      <h1 className="font-display text-4xl font-extrabold uppercase">This screen did not load</h1>
            <button onClick={() => window.location.reload()} className="btn btn-primary">Reload</button>
    </div></main>;
    return this.props.children;
  }
}
