import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-4">Acceso Denegado</h1>
      <p className="text-gray-600 mb-8">No tienes permiso para acceder a esta página.</p>
      <Link href="/" className="text-blue-500 hover:underline">Volver al Inicio</Link>
    </div>
  );
}