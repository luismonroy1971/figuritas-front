import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./globals.css";

class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 text-center shadow-sm">
            <div className="text-sm uppercase tracking-[0.24em] text-rose-500">
              Error de carga
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              La aplicación no pudo mostrarse correctamente
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              Recarga la página con Ctrl + F5. Si sigue igual, borra la caché del
              navegador o vuelve a abrir el enlace en incógnito.
            </p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);
