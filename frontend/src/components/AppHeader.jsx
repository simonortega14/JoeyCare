export default function AppHeader({ onOpenSettings }) {
  return (
    <header className="jc-header">
      <div className="jc-header__left">
        <img src="/vite.svg" alt="Joey Care" className="jc-logo" />
        <span className="jc-brand">Joey Care</span>
      </div>
      <button className="jc-btn jc-btn--ghost" onClick={onOpenSettings}>
        ⚙️ Configuración
      </button>
    </header>
  );
}
