import React, { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "../../../shared/components/ui/input";
import {
  Receipt,
  Package,
  User,
  Plus,
  Truck,
  Hash,
  Calendar,
} from "lucide-react";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { entregaInsumosService, CreateEntregaData, InsumoEntrega } from "../services/entregaInsumosService";
import { insumosService, Insumo } from "../services/insumosService";
import { barberosService, Barbero } from "../../administracion/services/barberosService";
import { apiService, ApiUser } from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { FormSection } from "../../../shared/components/ui/FormSection";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { DetailPanelEntrega } from "../components/DetailPanelEntrega";
import { canBeUsedInService, isSaleOnly } from "../../../shared/utils/usagePolicy";

// Utilities
const formatCurrency = (amount: number): string => {
  return (amount ?? 0).toLocaleString("es-CO");
};

const formatDate = (date: string | Date): string => {
  let dateObj: Date;
  if (typeof date === "string") {
    const plainDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (plainDateMatch) {
      const [, year, month, day] = plainDateMatch;
      dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  if (Number.isNaN(dateObj.getTime())) return String(date || "");
  return dateObj.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const normalizeSearchText = (value: unknown): string => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const generateCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFullName = (nombre?: string, apellido?: string) => {
  return `${nombre || ''}${apellido ? ` ${apellido}` : ''}`.trim();
};

interface RegistrarEntregaPageProps {
  onBack: () => void;
}

export function RegistrarEntregaPage({ onBack }: RegistrarEntregaPageProps) {
  const { user } = useAuth();
  const {
    created,
    error: showErrorAlert,
    AlertContainer,
  } = useCustomAlert();

  // Data loading state
  const [loading, setLoading] = useState(true);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);

  // Form state
  const inicialNuevaEntrega = {
    barberoSeleccionado: 0,
    fechaRegistro: generateCurrentDate(),
    insumos: [] as InsumoEntrega[]
  };

  const [nuevaEntrega, setNuevaEntrega] = useState(inicialNuevaEntrega);

  // Product addition state
  const [insumoSeleccionado, setInsumoSeleccionado] = useState(0);
  const [cantidadInsumo, setCantidadInsumo] = useState(0);
  const [cantidadInsumoInput, setCantidadInsumoInput] = useState('');
  const [insumoSearchTerm, setInsumoSearchTerm] = useState("");
  const [barberoSearchTerm, setBarberoSearchTerm] = useState("");

  // Tarjeta inputs for detail panel
  const [tarjetaInputs, setTarjetaInputs] = useState<Record<number, { cantidad?: string }>>({});

  // Validation
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [showAddInsumoErrors, setShowAddInsumoErrors] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shakeClass = validationAttempt % 2 === 0 ? "input-required-shake-a" : "input-required-shake-b";
  const addProductoRowRef = useRef<HTMLDivElement | null>(null);
  const productoInputRef = useRef<HTMLInputElement | null>(null);
  const cantidadInputRef = useRef<HTMLInputElement | null>(null);

  const clearValidationErrors = () => {
    if (showFormErrors) setShowFormErrors(false);
    if (showAddInsumoErrors) setShowAddInsumoErrors(false);
  };

  // Computed
  const numeroEntrega = useMemo(() => {
    return (entregas || []).reduce((max: number, e: any) => {
      const id = Number(e?.id ?? 0);
      return Number.isFinite(id) && id > max ? id : max;
    }, 0) + 1;
  }, [entregas]);

  const noInsumosAgregados = (nuevaEntrega.insumos?.length || 0) === 0;
  const showInsumoSelectorError =
    (showFormErrors && noInsumosAgregados && !insumoSeleccionado) ||
    (showAddInsumoErrors && !insumoSeleccionado);
  const showCantidadError =
    ((showFormErrors && noInsumosAgregados) || showAddInsumoErrors) && cantidadInsumo <= 0;

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [barberosData, insumosData, entregasData] = await Promise.all([
          barberosService.getBarberos().catch(() => []),
          insumosService.getInsumos().catch(() => []),
          entregaInsumosService.getEntregas().catch(() => []),
        ]);
        setBarberos(barberosData);
        setInsumos((insumosData || []).filter((i: Insumo) => i.activo === true));
        setEntregas(entregasData);
      } catch (error) {
        console.error("Error cargando datos:", error);
        showErrorAlert("Error al cargar datos", "No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Insumos disponibles (filtrar solo para servicio)
  const insumosDisponibles = useMemo(() => {
    return insumos.filter((i) => canBeUsedInService(i as any));
  }, [insumos]);

  // Add insumo
  const agregarInsumo = () => {
    if (!insumoSeleccionado) {
      setShowAddInsumoErrors(true);
      setValidationAttempt((prev) => prev + 1);
      showErrorAlert('Campos obligatorios', 'Selecciona un producto antes de agregar.');
      return;
    }

    if (!cantidadInsumoInput.trim() || !cantidadInsumo || cantidadInsumo <= 0) {
      setShowAddInsumoErrors(true);
      setValidationAttempt((prev) => prev + 1);
      showErrorAlert('Campos obligatorios', 'Ingresa una cantidad válida.');
      return;
    }

    const selectedId = Number(insumoSeleccionado);
    const insumo = insumos.find((i) => Number(i.id) === selectedId);
    if (!insumo) {
      showErrorAlert('Producto no encontrado', 'El producto seleccionado no existe.');
      return;
    }

    if (isSaleOnly(insumo as any)) {
      showErrorAlert('No permitido', 'Este producto es solo para venta y no puede entregarse como insumo.');
      return;
    }

    const stockDisponible = insumo.stockInsumos ?? insumo.stock;
    let cantidadAUsar = cantidadInsumo;
    if (cantidadInsumo > stockDisponible) {
      showErrorAlert('Cantidad ajustada', `Se ajustó al stock máximo: ${stockDisponible}`);
      cantidadAUsar = stockDisponible;
    }

    const insumosActuales = nuevaEntrega.insumos || [];
    const existeInsumo = insumosActuales.find((i) => Number(i.id) === Number(insumo.id));

    if (existeInsumo) {
      let cantidadFinal = existeInsumo.cantidad + cantidadAUsar;
      if (cantidadFinal > stockDisponible) {
        showErrorAlert('Cantidad ajustada', `Se ajustó al stock máximo: ${stockDisponible}`);
        cantidadFinal = stockDisponible;
      }
      setNuevaEntrega({
        ...nuevaEntrega,
        insumos: insumosActuales.map((i) =>
          Number(i.id) === Number(insumo.id) ? { ...i, cantidad: cantidadFinal } : i
        )
      });
      setTarjetaInputs((prev) => ({ ...prev, [insumo.id]: { cantidad: String(cantidadFinal) } }));
    } else {
      setNuevaEntrega({
        ...nuevaEntrega,
        insumos: [...insumosActuales, {
          id: insumo.id,
          nombre: insumo.nombre,
          categoria: insumo.categoria,
          cantidad: cantidadAUsar,
          precio: Number(insumo.precio) || 0,
          imagen: insumo.imagen
        }]
      });
      setTarjetaInputs((prev) => ({ ...prev, [insumo.id]: { cantidad: String(cantidadAUsar) } }));
    }

    setInsumoSeleccionado(0);
    setCantidadInsumo(0);
    setCantidadInsumoInput('');
    setInsumoSearchTerm("");
    setShowAddInsumoErrors(false);
    if (showFormErrors) setShowFormErrors(false);
  };

  const eliminarInsumo = (insumoId: number) => {
    setNuevaEntrega({
      ...nuevaEntrega,
      insumos: (nuevaEntrega.insumos || []).filter((i) => i.id !== insumoId)
    });
    setTarjetaInputs((prev) => {
      const next = { ...prev };
      delete next[insumoId];
      return next;
    });
  };

  // Tarjeta input handlers
  const getTarjetaInput = (insumo: { id: number; cantidad: number }, campo: "cantidad") => {
    const visual = tarjetaInputs[insumo.id]?.cantidad;
    return visual ?? String(insumo.cantidad ?? 0);
  };

  const onTarjetaInputChange = (insumoId: number, campo: "cantidad", valor: string) => {
    setTarjetaInputs((prev) => ({ ...prev, [insumoId]: { ...prev[insumoId], cantidad: valor } }));

    if (valor.trim() === '') return;
    const numero = Number(valor);
    if (Number.isNaN(numero)) return;

    const cantidad = Math.max(1, Math.floor(numero));
    const insumoBase = insumos.find((i) => Number(i.id) === Number(insumoId));
    const stockDisponible = insumoBase ? (insumoBase.stockInsumos ?? insumoBase.stock) : Number.POSITIVE_INFINITY;
    const cantidadFinal = cantidad > stockDisponible ? stockDisponible : cantidad;

    if (cantidadFinal !== cantidad) {
      showErrorAlert('Cantidad ajustada', `Se ajustó al stock máximo: ${stockDisponible}`);
      setTarjetaInputs((prev) => ({ ...prev, [insumoId]: { cantidad: String(cantidadFinal) } }));
    }

    setNuevaEntrega((prev) => ({
      ...prev,
      insumos: (prev.insumos || []).map((i) =>
        Number(i.id) === Number(insumoId) ? { ...i, cantidad: cantidadFinal } : i
      )
    }));
  };

  // Calculations
  const cantidadTotal = useMemo(() => {
    return (nuevaEntrega.insumos || []).reduce((sum, i) => sum + i.cantidad, 0);
  }, [nuevaEntrega.insumos]);

  const valorTotal = useMemo(() => {
    return (nuevaEntrega.insumos || []).reduce((sum, i) => sum + (Number(i.precio) || 0) * i.cantidad, 0);
  }, [nuevaEntrega.insumos]);

  // Submit
  const handleCreateEntrega = async () => {
    if (!user || !user.id) {
      showErrorAlert("Error de sesión", "No se ha identificado el usuario responsable.");
      return;
    }

    if (!nuevaEntrega.barberoSeleccionado || !nuevaEntrega.insumos || nuevaEntrega.insumos.length === 0) {
      setShowFormErrors(true);
      setValidationAttempt((prev) => prev + 1);
      showErrorAlert('Campos obligatorios', 'Completa el barbero y agrega al menos un producto.');
      return;
    }

    try {
      setIsSubmitting(true);
      const barbero = barberos.find((b) => b.id === nuevaEntrega.barberoSeleccionado);
      if (!barbero) {
        showErrorAlert('Barbero no encontrado', 'No se encontró el barbero seleccionado.');
        return;
      }

      const entregaData: CreateEntregaData = {
        barberoId: nuevaEntrega.barberoSeleccionado,
        usuarioId: Number(user.id) || 0,
        detalles: nuevaEntrega.insumos.map((insumo) => ({
          productoId: insumo.id,
          cantidad: insumo.cantidad
        }))
      };

      const entregaCreada = await entregaInsumosService.createEntrega(entregaData);

      // Refresh data
      const [entregasActualizadas, insumosActualizados] = await Promise.all([
        entregaInsumosService.getEntregas(),
        insumosService.getInsumos()
      ]);
      setEntregas(entregasActualizadas);
      setInsumos(insumosActualizados.filter((i: Insumo) => i.activo === true));

      const numeroEntregaCreada = Number((entregaCreada as any)?.id ?? 0);
      created(
        "Entrega creada",
        `La entrega #${numeroEntregaCreada > 0 ? numeroEntregaCreada : numeroEntrega} ha sido registrada para ${getFullName(barbero?.nombre, barbero?.apellido) || 'Sin asignar'}.`
      );
      limpiarFormulario();
    } catch (error: any) {
      console.error('Error creando entrega:', error);
      showErrorAlert('Error al registrar', error?.message || 'No se pudo registrar la entrega.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const limpiarFormulario = () => {
    setNuevaEntrega({ ...inicialNuevaEntrega, fechaRegistro: generateCurrentDate() });
    setBarberoSearchTerm("");
    setInsumoSearchTerm("");
    setInsumoSeleccionado(0);
    setCantidadInsumo(0);
    setCantidadInsumoInput('');
    setTarjetaInputs({});
    setShowFormErrors(false);
    setShowAddInsumoErrors(false);
  };

  // Cantidad input handler
  const handleCantidadInputChange = (valor: string) => {
    const onlyDigits = valor.replace(/\D+/g, "").slice(0, 4);
    setCantidadInsumoInput(onlyDigits);
    if (showAddInsumoErrors) setShowAddInsumoErrors(false);
    if (onlyDigits.trim() === "") {
      setCantidadInsumo(0);
      return;
    }
    setCantidadInsumo(Math.max(0, parseInt(onlyDigits, 10) || 0));
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
      <AlertContainer />

      {/* Master-Detail Layout */}
      <div
        className="grid grid-cols-1 lg:grid-cols-master-detail gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden"
        style={{ gridTemplateRows: 'minmax(0, 1fr)' }}
      >
        {/* LEFT: Form */}
        <aside className="lg:min-h-0 lg:min-w-0">
          <div className="elegante-card h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-5">
              {/* Section 1: Información Básica */}
              <FormSection
                title="Información Básica"
                icon={<Receipt className="w-4 h-4" />}
                headerRight={
                  <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
                    <div className="flex items-center gap-2" style={{ paddingRight: '20px' }}>
                      <span className="text-white-primary font-bold">Nº Entrega:</span>
                      <span className="text-gray-lightest font-medium tabular-nums">
                        {numeroEntrega.toString().padStart(3, "0")}
                      </span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-gray-dark" />
                    <div className="flex items-center gap-2">
                      <span className="text-white-primary font-bold">Fecha:</span>
                      <span className="text-gray-lightest font-medium">
                        {formatDate(nuevaEntrega.fechaRegistro)}
                      </span>
                    </div>
                  </div>
                }
              />

              {/* Section 2: Barbero */}
              <FormSection title="Barbero" icon={<User className="w-4 h-4" />}>
                <div className="space-y-1">
                  <SearchField
                    placeholder="Busca un barbero..."
                    value={barberoSearchTerm}
                    onChange={(val) => setBarberoSearchTerm(val)}
                    onClear={() => {
                      setBarberoSearchTerm("");
                      setNuevaEntrega((prev) => ({ ...prev, barberoSeleccionado: 0 }));
                    }}
                    items={barberos}
                    filterFn={(b: Barbero, query) => {
                      const q = normalizeSearchText(query);
                      const searchable = normalizeSearchText(
                        [b.id, b.nombre, b.apellido, b.documento].join(" ")
                      );
                      return searchable.includes(q);
                    }}
                    renderItem={(barbero: Barbero) => (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                            {getFullName(barbero.nombre, barbero.apellido)}
                          </p>
                          <p className="text-[10px] text-gray-lightest">
                            CC {barbero.documento || "Sin documento"}
                          </p>
                        </div>
                      </div>
                    )}
                    onSelect={(barbero: Barbero) => {
                      setNuevaEntrega((prev) => ({ ...prev, barberoSeleccionado: barbero.id }));
                      setBarberoSearchTerm(getFullName(barbero.nombre, barbero.apellido));
                      clearValidationErrors();
                    }}
                    error={showFormErrors && !nuevaEntrega.barberoSeleccionado ? "Debes seleccionar un barbero." : undefined}
                    shakeClass={shakeClass}
                    onFocus={clearValidationErrors}
                  />
                </div>
              </FormSection>

              {/* Section 3: Agregar Insumos */}
              <FormSection title="Agregar Insumos" icon={<Package className="w-4 h-4" />}>
                <div className="space-y-4" ref={addProductoRowRef}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-gray-lightest text-xs">Producto *</Label>
                      <SearchField
                        placeholder="Busca un insumo..."
                        value={insumoSearchTerm}
                        onChange={(val) => setInsumoSearchTerm(val)}
                        onClear={() => {
                          setInsumoSearchTerm("");
                          setInsumoSeleccionado(0);
                        }}
                        items={insumosDisponibles}
                        filterFn={(i: Insumo, query) => {
                          const q = normalizeSearchText(query);
                          const searchable = normalizeSearchText(
                            [i.id, i.nombre, i.categoria].join(" ")
                          );
                          return searchable.includes(q);
                        }}
                        renderItem={(insumo: Insumo) => (
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="shrink-0 w-7 h-7 rounded overflow-hidden bg-gray-dark">
                                <ImageRenderer url={insumo.imagen || ""} alt={insumo.nombre} className="w-full h-full border-0 bg-transparent" />
                              </div>
                              <div>
                                <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                                  {insumo.nombre}
                                </p>
                                <p className="text-[10px] text-gray-lightest">{insumo.categoria || 'Sin categoría'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-gray-lightest leading-none">Stock insumos</span>
                                <span className={`text-xs font-bold ${(insumo.stockInsumos ?? insumo.stock) > 0 ? "text-blue-400" : "text-red-400"}`}>
                                  {insumo.stockInsumos ?? insumo.stock}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        onSelect={(insumo: Insumo) => {
                          setInsumoSeleccionado(insumo.id);
                          setInsumoSearchTerm(insumo.nombre);
                          clearValidationErrors();
                        }}
                        error={showInsumoSelectorError ? "Selecciona un producto." : undefined}
                        shakeClass={shakeClass}
                        onFocus={clearValidationErrors}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-gray-lightest text-xs">Cantidad *</Label>
                      <Input
                        ref={cantidadInputRef}
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={cantidadInsumoInput}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') e.preventDefault();
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData?.getData("text") || "";
                          if (/[^\d]/.test(text) || text.length > 4) {
                            e.preventDefault();
                            handleCantidadInputChange(text.replace(/\D+/g, "").slice(0, 4));
                          }
                        }}
                        onChange={(e) => handleCantidadInputChange(e.target.value)}
                        onFocus={clearValidationErrors}
                        className={`elegante-input no-spin ${showCantidadError ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ""}`}
                      />
                      {showCantidadError && (
                        <p className="text-xs text-red-400">Ingresa una cantidad válida.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={agregarInsumo}
                      className="elegante-button-primary h-11 w-full md:w-auto md:min-w-[220px] text-center flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Insumo
                    </button>
                  </div>

                  {(showFormErrors || showAddInsumoErrors) && noInsumosAgregados && (
                    <p className="text-xs text-red-400">Debes agregar al menos un insumo.</p>
                  )}
                </div>
              </FormSection>
            </div>

            {/* Action Buttons */}
            <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90 flex justify-end space-x-3">
              <button onClick={onBack} className="elegante-button-secondary">
                Cancelar
              </button>
              <button
                onClick={handleCreateEntrega}
                disabled={isSubmitting}
                className="elegante-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Registrar Entrega
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT: Detail Panel */}
        <section className="lg:min-h-0 lg:min-w-0 lg:pr-2">
          <DetailPanelEntrega
            insumos={nuevaEntrega.insumos || []}
            cantidadTotal={cantidadTotal}
            valorTotal={valorTotal}
            onRemoveInsumo={eliminarInsumo}
            getTarjetaInput={getTarjetaInput}
            onTarjetaInputChange={onTarjetaInputChange}
          />
        </section>
      </div>
    </div>
  );
}
