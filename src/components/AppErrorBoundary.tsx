import React from 'react';

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main role="alert" className="min-h-screen bg-obsidian-950 text-white grid place-items-center p-6"><div className="max-w-md text-center space-y-4">
      <h1 className="text-xl font-bold">This screen could not load</h1>
      <p className="text-sm text-slate-300">The app may have been updated. Reload to open the latest version.</p>
      <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-xl bg-amber-400 text-black font-bold">Reload app</button>
    </div></main>;
    return this.props.children;
  }
}
