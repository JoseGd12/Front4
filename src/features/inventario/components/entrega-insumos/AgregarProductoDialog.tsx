import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../../shared/components/ui/dialog";
import { Label } from "../../../../shared/components/ui/label";
import { Input } from "../../../../shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../shared/components/ui/select";
import { insumosNativos } from "./constants";
import { formatCurrency } from "./utils";

interface AgregarProductoDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productoSeleccionado: string;
  setProductoSeleccionado: (id: string) => void;
  cantidadProducto: number;
  setCantidadProducto: (cantidad: number) => void;
  onAgregar: () => void;
}

export function AgregarProductoDialog({
  isOpen,
  onOpenChange,
  productoSeleccionado,
  setProductoSeleccionado,
  cantidadProducto,
  setCantidadProducto,
  onAgregar
}: AgregarProductoDialogProps) {
  const handleAgregar = () => {
    onAgregar();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="elegante-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white-primary">Agregar Insumo a la Entrega</DialogTitle>
          <DialogDescription className="text-gray-lightest">
            Selecciona un insumo del catálogo de Nativos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-white-primary">Insumo</Label>
            <Select
              value={productoSeleccionado || undefined}
              onValueChange={(val) => setProductoSeleccionado(val)}
            >
              <SelectTrigger className="elegante-input w-full">
                <SelectValue placeholder="Seleccionar insumo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-darkest border-gray-dark">
                {insumosNativos.map((insumo) => (
                  <SelectItem key={insumo.id} value={String(insumo.id)} className="text-white-primary">
                    {insumo.nombre} - ${formatCurrency(insumo.precio)} ({insumo.categoria})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-white-primary">Cantidad</Label>
            <Input
              type="number"
              min="1"
              value={cantidadProducto}
              onChange={(e) => setCantidadProducto(parseInt(e.target.value) || 1)}
              className="elegante-input"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
          <button onClick={() => onOpenChange(false)} className="elegante-button-secondary">
            Cancelar
          </button>
          <button
            onClick={handleAgregar}
            className="elegante-button-primary"
            disabled={!productoSeleccionado || cantidadProducto <= 0}
          >
            Agregar Insumo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
