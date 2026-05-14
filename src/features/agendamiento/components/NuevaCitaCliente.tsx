import { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Plus,
  Minus,
  ShoppingBag,
  FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";

// --- Mock Data ---
const serviciosIndividuales = [
  { id: 1, nombre: "Corte Clásico", precio: 35000, duracion: 30, descripcion: "Corte tradicional", imagen: "✂️", popular: true },
  { id: 2, nombre: "Corte Moderno", precio: 40000, duracion: 40, descripcion: "Fade y técnicas actuales", imagen: "💇‍♂️", popular: false },
  { id: 3, nombre: "Recorte de Barba", precio: 25000, duracion: 25, descripcion: "Perfilado profesional", imagen: "🧔‍♂️", popular: true },
  { id: 4, nombre: "Afeitado Clásico", precio: 30000, duracion: 30, descripcion: "Navaja y toallas calientes", imagen: "🪒", popular: false },
  { id: 5, nombre: "Perfilado de Cejas", precio: 20000, duracion: 20, descripcion: "Arreglo de cejas", imagen: "👁️", popular: true },
  { id: 6, nombre: "Lavado Premium", precio: 15000, duracion: 15, descripcion: "Masaje capilar", imagen: "🚿", popular: true }
];

const barberosArr = [
  { id: 1, nombre: "Carlos Mendez", especialidad: "Cortes clásicos", rating: 4.9, imagen: "👨‍💼", disponible: true },
  { id: 2, nombre: "Miguel Rodriguez", especialidad: "Cortes modernos", rating: 4.8, imagen: "👨‍🎨", disponible: true },
  { id: 3, nombre: "Ana Lopez", especialidad: "Color y tendencias", rating: 4.7, imagen: "👩‍🎨", disponible: true }
];

const paquetesList = [
  { id: 101, nombre: "Combo Master", descripción: "Corte + Barba + Lavado", precio: 65000, duracion: 75, imagen: "💎" },
  { id: 102, nombre: "Pack Moderno", descripción: "Corte Moderno + Cejas", precio: 50000, duracion: 60, imagen: "🔥" },
  { id: 103, nombre: "Express", descripción: "Corte + Lavado", precio: 45000, duracion: 45, imagen: "⚡" }
];

const productosDisponibles = [
  { id: 201, nombre: "Cera Opaca", precio: 30000, stock: 15, imagen: "🧴" },
  { id: 202, nombre: "Aceite de Barba", precio: 25000, stock: 10, imagen: "💧" },
  { id: 203, nombre: "Shampoo Premium", precio: 45000, stock: 8, imagen: "🧼" }
];

const horariosDisponibles = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const dayNames = ["D", "L", "M", "M", "J", "V", "S"];

interface NuevaCita {
  servicio: string;
  servicioId: number | null;
  paqueteId: number | null;
  productos: { id: number, nombre: string, cantidad: number, precio: number }[];
  barbero: string;
  fecha: string;
  hora: string;
  notas: string;
}

export function NuevaCitaCliente({ isOpen, onClose, clienteInfo, onSuccess }: any) {
  const { success } = useCustomAlert();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [nuevaCita, setNuevaCita] = useState<NuevaCita>({
    servicio: "", servicioId: null, paqueteId: null, productos: [], barbero: "", fecha: "", hora: "", notas: ""
  });

  const formatearPrecio = (precio: number) => `$ ${Math.round(precio).toLocaleString('es-CO')}`;
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const addProducto = (prod: any) => {
    setNuevaCita(prev => {
      const exists = prev.productos.find(p => p.id === prod.id);
      if (exists) return { ...prev, productos: prev.productos.map(p => p.id === prod.id ? { ...p, cantidad: p.cantidad + 1 } : p) };
      return { ...prev, productos: [...prev.productos, { id: prod.id, nombre: prod.nombre, cantidad: 1, precio: prod.precio }] };
    });
  };

  const removeProducto = (id: number) => {
    setNuevaCita(prev => ({
      ...prev,
      productos: prev.productos.map(p => p.id === id ? { ...p, cantidad: Math.max(0, p.cantidad - 1) } : p).filter(p => p.cantidad > 0)
    }));
  };

  const handleSubmit = () => {
    success("Cita confirmada", "Tu agendamiento se ha realizado exitosamente.");
    if (onSuccess) onSuccess(nuevaCita);
    onClose();
  };

  // Funciones de Calendario
  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const isDateAvailable = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0,0,0,0);
    return d >= today;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black-primary border-gray-dark text-white-primary custom-scrollbar">
        <DialogHeader className="border-b border-gray-dark pb-6 mb-8">
          <DialogTitle className="text-3xl font-black text-orange-primary uppercase tracking-tighter">Reservar Nueva Cita</DialogTitle>
          <DialogDescription className="text-gray-lightest text-base">Personaliza tu experiencia en la barbería de lujo</DialogDescription>
        </DialogHeader>

        {/* 1. Barbero Solo */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3 px-1">
            <div className="w-10 h-10 rounded-full bg-orange-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-orange-primary" />
            </div>
            <h3 className="text-xl font-bold text-white-primary uppercase tracking-wider">Paso 1: Elige tu Barbero</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {barberosArr.map((b) => (
              <button
                key={b.id}
                onClick={() => setNuevaCita(prev => ({ ...prev, barbero: b.nombre }))}
                className={`p-6 rounded-2xl border-2 text-center transition-all duration-300 relative overflow-hidden group ${nuevaCita.barbero === b.nombre
                  ? 'border-orange-primary bg-orange-primary/5 shadow-2xl shadow-orange-primary/10'
                  : 'border-gray-dark bg-gray-darker/20 hover:border-gray-medium'
                }`}
              >
                <div className="w-24 h-24 rounded-full bg-gray-dark mx-auto mb-4 flex items-center justify-center text-6xl border-4 border-gray-darker shadow-lg">
                  {b.imagen}
                </div>
                <h4 className="font-black text-white-primary text-lg mb-1">{b.nombre}</h4>
                <p className="text-xs text-orange-primary/80 font-bold uppercase tracking-widest">{b.especialidad}</p>
                <div className="flex items-center justify-center mt-3 text-orange-primary">
                  <Star className="w-4 h-4 fill-current mr-1" />
                  <span className="text-sm font-bold">{b.rating}</span>
                </div>
                {nuevaCita.barbero === b.nombre && (
                  <div className="absolute top-2 right-2 bg-orange-primary text-black-primary rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Servicio y Paquetes */}
        <div className="mt-12 pt-10 border-t border-gray-dark/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <Scissors className="w-5 h-5 text-orange-primary" />
                <h4 className="text-lg font-bold text-white-primary uppercase tracking-widest">Servicios</h4>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {serviciosIndividuales.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setNuevaCita(prev => ({ ...prev, servicio: s.nombre, servicioId: s.id, paqueteId: null }))}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${nuevaCita.servicioId === s.id ? 'border-orange-primary bg-orange-primary/10' : 'border-gray-dark bg-gray-darker/30 hover:border-gray-medium'}`}
                  >
                    <span className="text-3xl">{s.imagen}</span>
                    <div className="flex-1">
                      <p className="font-bold text-white-primary">{s.nombre}</p>
                      <p className="text-orange-primary font-bold text-sm">{formatearPrecio(s.precio)}</p>
                    </div>
                    <div className="text-right text-[10px] text-gray-lighter uppercase font-black">{s.duracion} min</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <Star className="w-5 h-5 text-orange-primary" />
                <h4 className="text-lg font-bold text-white-primary uppercase tracking-widest">Paquetes</h4>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {paquetesList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setNuevaCita(prev => ({ ...prev, paqueteId: p.id, servicioId: null, servicio: p.nombre }))}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${nuevaCita.paqueteId === p.id ? 'border-orange-primary bg-orange-primary/10' : 'border-gray-dark bg-gray-darker/30 hover:border-gray-medium'}`}
                  >
                    <span className="text-3xl">{p.imagen}</span>
                    <div className="flex-1">
                      <p className="font-bold text-white-primary">{p.nombre}</p>
                      <p className="text-[10px] text-gray-lighter truncate mb-1">{p.descripción}</p>
                      <p className="text-orange-primary font-bold text-sm">{formatearPrecio(p.precio)}</p>
                    </div>
                    <span className="bg-green-500/20 text-green-500 text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Ahorro</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Productos */}
        <div className="mt-12 pt-10 border-t border-gray-dark/50 space-y-6">
          <div className="flex items-center space-x-3">
            <ShoppingBag className="w-5 h-5 text-orange-primary" />
            <h3 className="text-xl font-bold text-white-primary uppercase tracking-wider">Añadir Productos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {productosDisponibles.map((prod) => (
              <div key={prod.id} className="p-5 rounded-2xl border border-gray-dark bg-gray-darker/20 flex flex-col items-center">
                <span className="text-5xl mb-4">{prod.imagen}</span>
                <h4 className="font-bold text-white-primary mb-1 text-center">{prod.nombre}</h4>
                <p className="text-orange-primary font-black mb-4">{formatearPrecio(prod.precio)}</p>
                <div className="flex items-center space-x-4 bg-black/40 rounded-full p-1.5 px-4 border border-gray-dark">
                  <button onClick={() => removeProducto(prod.id)} className="w-8 h-8 rounded-full bg-gray-dark hover:bg-gray-medium flex items-center justify-center text-white transition-all"><Minus className="w-4 h-4" /></button>
                  <span className="text-lg font-black text-white-primary w-6 text-center">{nuevaCita.productos.find(p => p.id === prod.id)?.cantidad || 0}</span>
                  <button onClick={() => addProducto(prod)} className="w-8 h-8 rounded-full bg-orange-primary hover:bg-orange-secondary flex items-center justify-center text-black-primary transition-all"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Fecha y Hora */}
        <div className="mt-12 pt-10 border-t border-gray-dark/50 space-y-8">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-orange-primary" />
            <h3 className="text-xl font-bold text-white-primary uppercase tracking-wider">Cuándo nos Visitas</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-gray-darker/20 p-8 rounded-3xl border border-gray-dark">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-xs font-black text-gray-lightest uppercase tracking-[0.2em]">Elige el Día</h4>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="p-2 bg-gray-dark rounded-lg hover:text-orange-primary"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-black text-white-primary min-w-[120px] text-center uppercase tracking-widest">{monthNames[currentMonth.getMonth()]}</span>
                  <button onClick={nextMonth} className="p-2 bg-gray-dark rounded-lg hover:text-orange-primary"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((d, idx) => <div key={idx} className="text-center text-[9px] font-black text-orange-primary/50 uppercase py-2">{d}</div>)}
                {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => <div key={i}></div>)}
                {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                  const d = i + 1;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
                  const isAvailable = isDateAvailable(d);
                  const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate);
                  return (
                    <button
                      key={d}
                      onClick={() => { if (isAvailable) { setSelectedDate(date); setNuevaCita(prev => ({ ...prev, fecha: formatDate(date) })); } }}
                      className={`size-9 flex items-center justify-center rounded-full text-[11px] font-bold transition-all ${isSelected ? 'bg-orange-primary text-black-primary shadow-lg shadow-orange-primary/20' : isAvailable ? 'text-white hover:bg-gray-medium/50' : 'text-gray-darker cursor-not-allowed'}`}
                      disabled={!isAvailable}
                    >{d}</button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="text-xs font-black text-gray-lightest uppercase tracking-[0.2em] px-2">Elige la Hora</h4>
              <div className="grid grid-cols-3 gap-3">
                {horariosDisponibles.map(h => (
                  <button
                    key={h}
                    onClick={() => setNuevaCita(prev => ({ ...prev, hora: h }))}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${nuevaCita.hora === h ? 'border-orange-primary bg-orange-primary text-black-primary' : 'border-gray-dark bg-black/40 text-white-primary hover:border-gray-medium'}`}
                  >{h}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Notas */}
        <div className="mt-12 pt-10 border-t border-gray-dark/50 space-y-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-orange-primary" />
            <h3 className="text-xl font-bold text-white-primary uppercase tracking-wider">Notas Adicionales</h3>
          </div>
          <textarea
            value={nuevaCita.notas}
            onChange={(e) => setNuevaCita(prev => ({ ...prev, notas: e.target.value }))}
            placeholder="¿Algún detalle especial que debamos conocer?"
            className="w-full p-6 bg-gray-darker/20 border-2 border-gray-dark rounded-3xl text-white-primary placeholder:text-gray-lighter focus:border-orange-primary focus:outline-none transition-all resize-none"
            rows={4}
          />
        </div>

        {/* Footer: Sumario y Botones */}
        <div className="mt-16 pt-10 border-t border-gray-dark flex flex-col md:flex-row items-center justify-between gap-10 pb-8">
          <div className="flex-1 w-full md:w-auto">
            {(nuevaCita.servicio || nuevaCita.productos.length > 0) && (
              <div className="bg-gradient-to-r from-orange-primary to-orange-secondary p-[1px] rounded-3xl shadow-2xl shadow-orange-primary/10">
                <div className="bg-gray-darkest rounded-[23px] p-6 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-orange-primary/10 flex items-center justify-center text-orange-primary border border-orange-primary/20"><Check className="w-7 h-7" /></div>
                    <div>
                      <p className="text-xs font-black text-orange-primary uppercase tracking-[0.2em] mb-1">Tu Selección</p>
                      <h5 className="text-lg font-black text-white-primary">{nuevaCita.servicio || "Solo productos"}</h5>
                      {nuevaCita.barbero && <p className="text-xs text-gray-lighter uppercase font-bold tracking-widest mt-1">Con {nuevaCita.barbero}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-lightest uppercase tracking-[0.2em] mb-1">Inversión Total</p>
                    <p className="text-3xl font-black text-orange-primary tracking-tighter">
                      {formatearPrecio(
                        (paquetesList.find(p => p.id === nuevaCita.paqueteId)?.precio || serviciosIndividuales.find(s => s.id === nuevaCita.servicioId)?.precio || 0) +
                        nuevaCita.productos.reduce((sum, p) => sum + (p.precio * p.cantidad), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <Button onClick={onClose} variant="ghost" className="h-16 px-10 text-gray-lighter hover:text-white uppercase font-black tracking-widest text-sm">Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={(!nuevaCita.servicioId && !nuevaCita.paqueteId) || !nuevaCita.barbero || !nuevaCita.fecha || !nuevaCita.hora}
              className="h-16 px-12 bg-orange-primary hover:bg-orange-secondary text-black-primary font-black text-lg rounded-2xl shadow-xl shadow-orange-primary/20 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
            >Confirmar Cita</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
