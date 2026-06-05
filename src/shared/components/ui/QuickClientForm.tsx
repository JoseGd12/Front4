import { useState, useRef } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Input } from "./input";
import { clientesService } from "../../../features/clientes/services/clientesService";

interface QuickClientFormProps {
  /** Texto actual del buscador para pre-rellenar el nombre */
  searchTerm: string;
  /** Callback cuando se crea el cliente exitosamente */
  onClientCreated: (cliente: { id: number; nombre: string; apellido: string; telefono: string; documento: string }) => void;
  /** Callback para mostrar error */
  onError?: (msg: string) => void;
}

/**
 * Formulario inline para registrar rápidamente un "cliente de paso".
 * Solo pide nombre (pre-rellenado) y teléfono opcional.
 * Genera automáticamente documento, correo y contraseña temporales.
 */
export function QuickClientForm({ searchTerm, onClientCreated, onError }: QuickClientFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [nombre, setNombre] = useState(searchTerm);
  const [telefono, setTelefono] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);

  const handleOpen = () => {
    setNombre(searchTerm || "");
    setTelefono("");
    setIsOpen(true);
  };

  const handleCreate = async () => {
    const trimmedName = nombre.trim();
    if (!trimmedName || isCreatingRef.current) return;

    isCreatingRef.current = true;
    setIsCreating(true);
    try {
      const cliente = await clientesService.createClienteRapido(trimmedName, telefono.trim() || undefined);
      onClientCreated({
        id: cliente.id,
        nombre: `${cliente.nombre} ${cliente.apellido}`.trim(),
        apellido: cliente.apellido || '',
        telefono: cliente.telefono || '',
        documento: cliente.documento || '',
      });
      setIsOpen(false);
    } catch (err: any) {
      const msg = err?.message || "No se pudo registrar el cliente.";
      if (onError) onError(msg);
      else console.error(msg);
    } finally {
      isCreatingRef.current = false;
      setIsCreating(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-orange-primary/40 bg-orange-primary/5 text-orange-primary text-xs font-semibold uppercase tracking-wider hover:bg-orange-primary/10 hover:border-orange-primary/60 transition-all"
      >
        <UserPlus className="w-4 h-4" />
        Registrar cliente de paso
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-lg border border-orange-primary/30 bg-orange-primary/5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="w-4 h-4 text-orange-primary" />
        <span className="text-xs font-bold text-orange-primary uppercase tracking-wider">Registro rápido</span>
      </div>

      <div>
        <label className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold block mb-1">
          Nombre *
        </label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del cliente"
          className="elegante-input h-9 text-sm"
          autoFocus
        />
      </div>

      <div>
        <label className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold block mb-1">
          Teléfono <span className="text-gray-medium">(opcional)</span>
        </label>
        <Input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 3001234567"
          className="elegante-input h-9 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex-1 py-2 rounded-lg border border-gray-dark text-gray-lightest text-xs font-semibold hover:bg-gray-darker transition-colors"
          disabled={isCreating}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !nombre.trim()}
          className="flex-1 py-2 rounded-lg bg-orange-primary text-black-primary text-xs font-bold uppercase tracking-wider hover:bg-orange-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Registrando...
            </>
          ) : (
            "Registrar"
          )}
        </button>
      </div>

      <p className="text-[9px] text-gray-lighter italic leading-relaxed">
        Se creará un perfil temporal con datos generados automáticamente. El cliente podrá completar su perfil después.
      </p>
    </div>
  );
}
