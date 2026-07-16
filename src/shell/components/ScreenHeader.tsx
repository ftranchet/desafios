import { BackButton } from './BackButton';

// Encabezado de pantalla secundaria (Estadísticas, Configuración): botón
// Volver con etiqueta visible — no solo una flecha — y el título al lado.
// Reemplaza a la barra de navegación inferior: estas pantallas se entra y
// se sale, no se "habita".

export function ScreenHeader({ title }: { title: string }) {
  return (
    <header className="flex items-center gap-3">
      <BackButton />
      <h1 className="font-display text-xl font-extrabold text-text-primary">{title}</h1>
    </header>
  );
}
