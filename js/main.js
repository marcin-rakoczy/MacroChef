// Application Bootstrapper & Service Worker Registration
(function () {
  const { App } = window.MacroChef;

  // Mount React App
  const rootElement = document.getElementById('root');
  if (rootElement && App) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));
  }

  // Register PWA Service Worker for offline capability
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[MacroChef PWA] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[MacroChef PWA] Service Worker registration failed:', err);
        });
    });
  }
})();

