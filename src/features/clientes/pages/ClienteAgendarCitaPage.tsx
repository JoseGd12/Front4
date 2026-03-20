import { useState } from "react";
import { Calendar, Clock, User, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";

const barberos = [
  { id: "1", nombre: "Miguel Rodriguez", especialidad: "Corte Clásico y Barba" },
  { id: "2", nombre: "Sofia Martinez", especialidad: "Cortes Modernos y Tinturado" },
  { id: "3", nombre: "Carlos Mendoza", especialidad: "Barba y Bigote" },
];

const servicios = [
  { id: "1", nombre: "Corte de Cabello", precio: 35000, duracion: "45 min" },
  { id: "2", nombre: "Arreglo de Barba", precio: 20000, duracion: "30 min" },
  { id: "3", nombre: "Corte + Barba", precio: 50000, duracion: "60 min" },
  { id: "4", nombre: "Tinturado", precio: 55000, duracion: "90 min" },
  { id: "5", nombre: "Paquete Premium", precio: 80000, duracion: "120 min" },
];

const horariosDisponibles = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", 
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"
];

export function ClienteAgendarCitaPage() {
  const { success, error: showErrorAlert, AlertContainer } = useCustomAlert();
  const [formData, setFormData] = useState({
    barbero: "",
    servicio: "",
    fecha: "",
    hora: "",
    notas: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.barbero || !formData.servicio || !formData.fecha || !formData.hora) {
      showErrorAlert("Campos requeridos", "Por favor completa todos los campos obligatorios.");
      return;
    }

    success("Cita agendada", `Tu cita ha sido programada para el ${formData.fecha} a las ${formData.hora}.`);

    // Reset form
    setFormData({
      barbero: "",
      servicio: "",
      fecha: "",
      hora: "",
      notas: ""
    });
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('es-CO');
  };

  const selectedService = servicios.find(s => s.id === formData.servicio);
  const selectedBarbero = barberos.find(b => b.id === formData.barbero);

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Agendar Nueva Cita</h1>
            <p className="text-sm text-gray-lightest mt-1">Programa tu próxima visita con nuestros especialistas</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulario */}
            <div className="lg:col-span-2">
              <div className="elegante-card">
                <h2 className="text-xl font-semibold text-white-primary mb-6">Información de la Cita</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Selección de Barbero */}
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-primary" />
                      Barbero *
                    </Label>
                    <Select value={formData.barbero} onValueChange={(value) => setFormData({...formData, barbero: value})}>
                      <SelectTrigger className="elegante-input">
                        <SelectValue placeholder="Selecciona un barbero" />
                      </SelectTrigger>
                      <SelectContent>
                        {barberos.map((barbero) => (
                          <SelectItem key={barbero.id} value={barbero.id}>
                            <div>
                              <div className="font-medium">{barbero.nombre}</div>
                              <div className="text-xs text-gray-lightest">{barbero.especialidad}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selección de Servicio */}
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-primary" />
                      Servicio *
                    </Label>
                    <Select value={formData.servicio} onValueChange={(value) => setFormData({...formData, servicio: value})}>
                      <SelectTrigger className="elegante-input">
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicios.map((servicio) => (
                          <SelectItem key={servicio.id} value={servicio.id}>
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <div className="font-medium">{servicio.nombre}</div>
                                <div className="text-xs text-gray-lightest">{servicio.duracion}</div>
                              </div>
                              <div className="text-orange-primary font-medium">
                                ${formatCurrency(servicio.precio)}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fecha y Hora */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-primary" />
                        Fecha *
                      </Label>
                      <Input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                        className="elegante-input"
                         min={new Date().toLocaleDateString('sv-SE')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-primary" />
                        Hora *
                      </Label>
                      <Select value={formData.hora} onValueChange={(value) => setFormData({...formData, hora: value})}>
                        <SelectTrigger className="elegante-input">
                          <SelectValue placeholder="Selecciona una hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {horariosDisponibles.map((hora) => (
                            <SelectItem key={hora} value={hora}>
                              {hora}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notas Adicionales */}
                  <div className="space-y-2">
                    <Label className="text-white-primary">
                      Notas Adicionales (Opcional)
                    </Label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      className="elegante-input min-h-[100px] resize-none"
                      placeholder="Especifica alguna preferencia o requerimiento especial..."
                    />
                  </div>

                  {/* Botón de Envío */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="elegante-button-primary w-full"
                    >
                      Confirmar Cita
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Resumen de la Cita */}
            <div className="space-y-6">
              {/* Información de la Barbería */}
              <div className="elegante-card">
                <h3 className="text-lg font-semibold text-white-primary mb-4">
                  Información de Contacto
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-orange-primary" />
                    <div>
                      <p className="text-white-primary text-sm">Cra 15 #123-45</p>
                      <p className="text-gray-lightest text-xs">Centro, Bogotá</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-orange-primary" />
                    <div>
                      <p className="text-white-primary text-sm">+57 301 234 5678</p>
                      <p className="text-gray-lightest text-xs">Línea directa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-orange-primary" />
                    <div>
                      <p className="text-white-primary text-sm">citas@edwinsbarber.com</p>
                      <p className="text-gray-lightest text-xs">Correo de citas</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de Selección */}
              {(selectedService || selectedBarbero || formData.fecha || formData.hora) && (
                <div className="elegante-card">
                  <h3 className="text-lg font-semibold text-white-primary mb-4">
                    Resumen de tu Cita
                  </h3>
                  <div className="space-y-4">
                    {selectedBarbero && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Barbero</p>
                        <p className="text-white-primary font-medium">{selectedBarbero.nombre}</p>
                        <p className="text-gray-lightest text-sm">{selectedBarbero.especialidad}</p>
                      </div>
                    )}
                    
                    {selectedService && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Servicio</p>
                        <p className="text-white-primary font-medium">{selectedService.nombre}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-gray-lightest text-sm">{selectedService.duracion}</p>
                          <p className="text-orange-primary font-medium">${formatCurrency(selectedService.precio)}</p>
                        </div>
                      </div>
                    )}
                    
                    {formData.fecha && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Fecha</p>
                        <p className="text-white-primary font-medium">
                          {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    
                    {formData.hora && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Hora</p>
                        <p className="text-white-primary font-medium">{formData.hora}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    <AlertContainer />
    </>
  );
}
