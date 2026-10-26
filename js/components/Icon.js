// Safe, reliable Lucide Icon React component
window.MacroChef = window.MacroChef || {};
window.MacroChef.components = window.MacroChef.components || {};

(function () {
  function Icon({ name, className = 'w-4 h-4', ...props }) {
    const spanRef = React.useRef(null);

    React.useEffect(() => {
      if (!spanRef.current) return;

      if (window.lucide && window.lucide.icons) {
        const { toPascalCase } = window.MacroChef.helpers;
        const pascalName = toPascalCase(name);
        const iconDef = window.lucide.icons[pascalName] || window.lucide.icons[name];

        if (iconDef && typeof iconDef.toSvg === 'function') {
          spanRef.current.innerHTML = iconDef.toSvg({ class: className });
          return;
        }
      }

      // Fallback with isolated createIcons root
      spanRef.current.innerHTML = `<i data-lucide="${name}" class="${className}"></i>`;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons({ root: spanRef.current });
      }
    }, [name, className]);

    return (
      <span
        ref={spanRef}
        className="inline-flex items-center justify-center shrink-0 pointer-events-none"
        {...props}
      />
    );
  }

  window.MacroChef.components.Icon = Icon;
})();

