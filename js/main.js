// Application Bootstrapper & Service Worker Registration
(function () {
  const { SessionApp } = window.MacroChef.components;

  // Mount React App
  const rootElement = document.getElementById('root');
  if (rootElement && SessionApp) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(SessionApp));
  }

  // Register PWA Service Worker for offline capability
  if ('serviceWorker' in navigator) {
    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[MacroChef PWA] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[MacroChef PWA] Service Worker registration failed:', err);
        });
    };
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }
  }
})();
