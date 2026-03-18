import { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  Scissors,
  Star,
  Clock,
  Phone,
  Mail,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  MapPin
} from 'lucide-react';
import { Dialog, DialogContent } from '../../../shared/components/ui/dialog';
import { useCustomAlert } from '../../../shared/components/ui/custom-alert';
import { apiService } from '../../../shared/services/api';
import { productoService } from '../../productos/services/productos';
import manitoLogo from '../../../assets/Manito.jpeg';
import '../../../styles/landing.css';

const LOGO_URL = manitoLogo;


const formatCurrency = (amount: number): string => amount.toLocaleString('es-CO');

interface LandingPageProps {
  onRequestLogin?: () => void;
  onRequestRegister?: () => void;
  onRequestDashboard?: () => void;
  onSelectReservation?: (item: any) => void;
}

export function LandingPage({ onRequestLogin, onRequestRegister, onRequestDashboard, onSelectReservation }: LandingPageProps) {
  const { isAuthenticated } = useAuth();
  const { info, success } = useCustomAlert();
  const [scrolled, setScrolled] = useState(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', fecha: '', hora: '', servicio: '' });

  const [servicios, setServicios] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API (Backend)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [serviciosRes, productosRes, paquetesRes] = await Promise.all([
          apiService.getServicios(),
          productoService.getProductos(),
          apiService.getPaquetes()
        ]);

        // Combinar servicios y paquetes
        const todosLosServicios = [
          ...serviciosRes.filter(s => s.estado !== false).map(s => ({ ...s, type: 'servicio' })),
          ...paquetesRes.filter(p => p.activo !== false).map(p => ({ ...p, type: 'paquete' }))
        ];

        setServicios(todosLosServicios.slice(0, 6));
        setProductos(productosRes.filter(p => p.activo !== false).slice(0, 6));
      } catch (error) {
        console.error("Error fetching landing data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      setHeroOpacity(Math.max(0, 1 - y / 600));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reveal on scroll y Footer Visibility
  useEffect(() => {
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal-item').forEach(el => revealObserver.observe(el));

    const footerObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsFooterVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    const footerElement = document.getElementById('footer');
    if (footerElement) {
      footerObserver.observe(footerElement);
    }

    return () => {
      revealObserver.disconnect();
      footerObserver.disconnect();
    };
  }, [loading]); // Re-run when products/services are loaded to observe them


  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { onRequestLogin?.(); return; }
    success('Reserva enviada', 'Nos pondremos en contacto contigo pronto.');
    setFormData({ nombre: '', email: '', telefono: '', fecha: '', hora: '', servicio: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-body landing-page-container">

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-md ${scrolled ? 'bg-black/80 border-b border-white/5 py-4' : 'bg-black/20 py-6'}`}>
        <div className="content-max-width flex justify-between items-center">
          <div className="flex items-center gap-8 sm:gap-12 lg:gap-16">
            <button
              onClick={() => scrollToSection('inicio')}
              title="Ir al inicio"
              className="flex items-center gap-4 hover:opacity-80 transition-opacity duration-300"
            >
              <img src={LOGO_URL} alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-lg" />
              <div className="text-3xl font-bold tracking-tight">Manito<span className="text-gradient">Barbershop</span></div>
            </button>
            {[
              { id: 'nosotros', label: 'Nosotros' },
              { id: 'servicios', label: 'Servicios' },
              { id: 'productos', label: 'Productos' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-base font-semibold text-gray-300 hover:text-[#d8b081] transition-all duration-300 uppercase tracking-wide relative group py-1"
                title={`Ir a ${item.label}`}
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <button
                onClick={onRequestDashboard}
                className="px-8 py-3 bg-[#d8b081] text-black border-2 border-[#d8b081] rounded-xl hover:bg-[#e8c091] hover:border-[#e8c091] transition-all duration-300 text-base font-semibold hover:scale-105 shadow-lg"
                title="Ir a mi panel de control"
              >
                Inicio
              </button>
            ) : (
              <button
                onClick={onRequestLogin}
                className="px-8 py-3 border-2 border-white/20 rounded-xl hover:border-[#d8b081] hover:bg-[#d8b081]/10 transition-all duration-300 text-base font-semibold hover:scale-105 shadow-lg"
                title="Iniciar sesión en tu cuenta"
              >
                Ingresar
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header id="inicio" className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center animate-slow-zoom blur-[4px] opacity-40 grayscale"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a]/40 via-[#0d0d0d]/70 to-black"></div>
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
        <div
          className="relative z-10 text-center px-6 max-w-5xl mx-auto reveal-item active"
          style={{ opacity: heroOpacity, transform: `translateY(${(1 - heroOpacity) * 40}px)`, transition: 'none' }}
        >
          <span className="text-xs font-black uppercase tracking-[0.5em] text-[#d8b081] mb-8 block">Bogotá, Colombia</span>
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-bold mb-8 tracking-tight font-title text-gradient leading-none">MANITO BARBERSHOP</h1>
          <p className="text-2xl sm:text-3xl mb-14 text-gray-300 max-w-2xl mx-auto leading-relaxed font-light">Estilo, Elegancia y Profesionalismo en Cada Corte</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={isAuthenticated ? onRequestDashboard : onRequestLogin}
              title="Reserva tu cita ahora — rápido y fácil"
              className="inline-flex items-center gap-3 px-10 py-5 bg-[#d8b081] text-black font-bold text-lg rounded-xl shadow-2xl shadow-[#d8b081]/30 hover:bg-[#e8c091] hover:scale-105 transition-all duration-300"
            >
              {isAuthenticated ? 'Gestionar Mis Citas' : 'Reserva tu Cita'}
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              onClick={() => scrollToSection('servicios')}
              title="Ver todos nuestros servicios"
              className="inline-flex items-center gap-3 px-10 py-5 border-2 border-white/20 text-white font-semibold text-lg rounded-xl hover:border-[#d8b081]/60 hover:bg-white/5 hover:scale-105 transition-all duration-300"
            >
              Ver Servicios
            </button>
          </div>
        </div>
      </header>

      {/* Nosotros Section */}
      <section id="nosotros" className="section-padding relative overflow-hidden bg-[#090909] border-y border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[46rem] h-[46rem] rounded-full bg-[#d8b081]/8 blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </div>

        <div className="content-max-width relative z-10 space-y-14">
          <div className="reveal-item text-center space-y-6">
            <span className="text-xs font-black uppercase tracking-[0.7em] text-[#d8b081] block">Nosotros</span>
            <h2 className="font-title font-bold uppercase tracking-tight text-6xl md:text-8xl lg:text-9xl leading-none">
              <span className="text-gradient">Donde el estilo</span>
              <span className="block text-gradient">se vuelve identidad</span>
            </h2>
            <p className="max-w-3xl mx-auto text-base md:text-lg text-gray-300 leading-relaxed">
              Somos una barberia ubicada en Bogota, dedicada al cuidado de la apariencia masculina desde el 1 de abril de 2023.
              Con mas de 2 anos de trayectoria, nos hemos consolidado como un punto de referencia para quienes valoran precision, detalle y personalidad.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            <div className="reveal-item lg:col-span-7 space-y-6">
              <div className="rounded-3xl border border-[#d8b081]/25 bg-gradient-to-br from-[#171717] via-[#111] to-[#0b0b0b] p-8 md:p-10 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-2xl bg-[#d8b081]/15 border border-[#d8b081]/30 flex items-center justify-center">
                    <Star className="w-5 h-5 text-[#d8b081]" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.45em] text-gray-300 font-black">Nuestra esencia</span>
                </div>

                <p className="text-gray-200 text-lg leading-relaxed mb-8">
                  Contamos con un equipo de
                  <span className="text-[#d8b081] font-black"> 6 colaboradores</span>,
                  entre ellos
                  <span className="text-[#d8b081] font-black"> 5 barberos especializados</span>.
                  Cada servicio combina tecnica, criterio estilistico y atencion personalizada.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-black/50 border border-white/10 p-5">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-2">Equipo</div>
                    <div className="text-4xl font-black font-title text-white leading-none">5</div>
                    <div className="text-sm text-gray-300 mt-2">Barberos profesionales</div>
                  </div>
                  <div className="rounded-2xl bg-black/50 border border-white/10 p-5">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-2">Estructura</div>
                    <div className="text-4xl font-black font-title text-white leading-none">6</div>
                    <div className="text-sm text-gray-300 mt-2">Colaboradores en total</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111]/80 p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                  Tambien ofrecemos una linea completa de productos para el cuidado facial y capilar, junto con accesorios exclusivos.
                </p>
                <button
                  onClick={() => scrollToSection('servicios')}
                  title="Conoce todos nuestros servicios disponibles"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#d8b081] text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-[#e8c091] hover:scale-105 transition-all duration-300 shrink-0"
                >
                  Conoce nuestros servicios <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="reveal-item lg:col-span-5" style={{ transitionDelay: '0.2s' }}>
              <div className="h-full rounded-3xl border border-white/10 bg-[#121212]/90 p-7 md:p-8 backdrop-blur-sm shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
                <div className="mb-8">
                  <span className="text-[11px] font-black uppercase tracking-[0.45em] text-[#d8b081] block mb-3">Datos clave</span>
                  <h3 className="text-3xl font-title font-black uppercase tracking-tight text-white">Manito Barber</h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#d8b081]/15 border border-[#d8b081]/25 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-[#d8b081]" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-1">Ubicacion</p>
                        <p className="text-lg font-bold text-white">Calle 79 #52-12</p>
                        <p className="text-sm text-gray-300">Barrio El Bosque</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#d8b081]/15 border border-[#d8b081]/25 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-[#d8b081]" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-1">Contacto</p>
                        <p className="text-lg font-bold text-white">301 483 6189</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#d8b081]/15 border border-[#d8b081]/25 flex items-center justify-center shrink-0">
                        <Scissors className="w-5 h-5 text-[#d8b081]" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mb-1">Equipo</p>
                        <p className="text-sm text-gray-200 leading-relaxed">
                          5 barberos profesionales y personal administrativo a tu servicio.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supertítulo que abarca servicios y productos */}
      <div className="bg-[#0a0a0a] border-t border-white/5 pt-32 pb-8">
        <div className="content-max-width text-center reveal-item">
          <h2 className="section-supertitle font-bold font-title tracking-tight leading-none text-gradient uppercase">
            Lo que ofrecemos
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-lg font-medium leading-relaxed italic mt-6">"La calidad es el único estándar que no admite compromisos."</p>
        </div>
      </div>

      {/* Servicios Section */}
      <section id="servicios" className="pb-24 pt-16 border-white/5" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="content-max-width relative z-10">
          <div className="text-center mb-14 reveal-item">
            <span className="text-xs font-black uppercase tracking-[0.6em] text-[#d8b081] mb-4 block">Servicios</span>
            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase">
              Nuestros Servicios
            </h3>
          </div>
        </div>

        {/* Carousel de Servicios */}
        <div className="overflow-hidden carousel-mask">
          {loading ? (
            <div className="flex gap-6 px-8 justify-center">
              {[1, 2, 3].map(i => <div key={i} className="w-[380px] h-[420px] bg-zinc-900 animate-pulse rounded-2xl shrink-0"></div>)}
            </div>
          ) : (
            <div className="carousel-track" style={{ '--carousel-duration': `${Math.max(30, servicios.length * 6)}s` } as React.CSSProperties}>
              {[...servicios, ...servicios].map((servicio, idx) => (
                <div key={`srv-${idx}`} className="w-[380px] shrink-0 px-3 group">
                  <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover h-full">
                    <div className="relative overflow-hidden bg-[#111]" style={{ height: '240px' }}>
                      <img src={servicio.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600'} alt={servicio.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-y-2 group-hover:translate-y-0 text-white">
                        <Clock className="w-4 h-4 text-[#d8b081]" />
                        <span className="text-xs font-black uppercase tracking-widest">{servicio.duracion} min</span>
                      </div>
                    </div>
                    <div className="px-6 pt-5 pb-6">
                      <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500 block mb-2">
                        {servicio.type === 'paquete' ? 'Paquete' : 'Servicio'}
                      </span>
                      <div className="flex items-baseline justify-between mb-3">
                        <h3 className="text-lg font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{servicio.nombre}</h3>
                        <span className="text-xl font-black text-[#d8b081] ml-3">${formatCurrency(servicio.precio)}</span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed mb-5 line-clamp-2">{servicio.descripcion}</p>
                      <button
                        onClick={() => {
                          if (isAuthenticated) {
                            onSelectReservation?.(servicio);
                          } else {
                            onRequestLogin?.();
                          }
                        }}
                        title={`Reservar ${servicio.nombre} ahora`}
                        className="w-full py-3 bg-transparent text-[#d8b081] text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] hover:bg-[#d8b081] hover:text-black hover:scale-105 transition-all duration-300 shadow-lg"
                      >
                        Reservar Ahora
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Productos Section */}
      <section id="productos" className="pb-24 pt-16 bg-[#0d0d0d]">
        <div className="content-max-width relative z-10">
          <div className="text-center mb-14 reveal-item">
            <span className="text-xs font-black uppercase tracking-[0.6em] text-[#d8b081] mb-4 block">Tienda</span>
            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase">
              Nuestros Productos
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto text-lg leading-relaxed mt-4">Los mejores productos para el cuidado de tu imagen, disponibles para llevar a casa.</p>
          </div>
        </div>

        {/* Carousel de Productos — dirección inversa */}
        <div className="overflow-hidden carousel-mask">
          {loading ? (
            <div className="flex gap-6 px-8 justify-center">
              {[1, 2, 3].map(i => <div key={i} className="w-[380px] h-[380px] bg-zinc-900 animate-pulse rounded-2xl shrink-0"></div>)}
            </div>
          ) : (
            <div className="carousel-track" style={{ '--carousel-duration': `${Math.max(30, productos.length * 6)}s`, animationDirection: 'reverse' } as React.CSSProperties}>
              {[...productos, ...productos].map((producto, idx) => (
                <div key={`prod-${idx}`} className="w-[380px] shrink-0 px-3 group">
                  <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover h-full">
                    <div className="relative overflow-hidden bg-[#111]" style={{ height: '240px' }}>
                      <img src={producto.imagenProduc || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'} alt={producto.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                    <div className="px-6 pt-5 pb-6">
                      <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500 block mb-2">{producto.categoria?.nombre || 'Producto'}</span>
                      <div className="flex items-baseline justify-between mb-3">
                        <h3 className="text-lg font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{producto.nombre}</h3>
                        <span className="text-xl font-black text-[#d8b081] ml-3">${formatCurrency(producto.precio)}</span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{producto.descripcion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* Footer */}
      <footer id="footer" className="border-t border-white/10" style={{ backgroundColor: '#0d0d0d', paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div className="content-max-width">
          <div className="grid md:grid-cols-4 gap-14 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                <span className="text-2xl font-black font-title tracking-tight text-white uppercase">Manito</span>
              </div>
              <p className="text-gray-400 text-sm italic leading-relaxed">"El estilo es una forma de decir quién eres sin tener que hablar."</p>
            </div>
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-[0.5em] text-[#d8b081] block">Explorar</span>
              <ul className="space-y-5">
                {[['inicio', 'Inicio'], ['servicios', 'Servicios'], ['productos', 'Productos'], ['nosotros', 'Nosotros']].map(([id, label]) => (
                  <li key={id}>
                    <button
                      onClick={() => scrollToSection(id)}
                      title={`Ir a la sección ${label}`}
                      className="text-sm font-semibold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-[0.5em] text-[#d8b081] block">Horario</span>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-400"><span>Lun — Vie</span><span>9:00 — 20:00</span></div>
                <div className="flex justify-between items-center text-sm font-semibold text-gray-400"><span>Sábado</span><span>9:00 — 20:00</span></div>
                <div className="flex justify-between items-center text-sm font-semibold text-gray-600"><span>Domingo</span><span>Cerrado</span></div>
              </div>
            </div>
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-[0.5em] text-[#d8b081] block">Contacto</span>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-400">
                  <Phone className="w-4 h-4 text-[#d8b081] flex-shrink-0" />
                  <span className="text-sm">301 483 6189</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <MapPin className="w-4 h-4 text-[#d8b081] flex-shrink-0" />
                  <span className="text-sm">Calle 79 #52-12, Bogotá</span>
                </div>
              </div>
              <button
                onClick={isAuthenticated ? onRequestDashboard : onRequestLogin}
                title="Reserva tu cita ahora"
                className="mt-4 w-full py-4 bg-[#d8b081] text-black font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-[#e8c091] hover:scale-105 transition-all duration-300"
              >
                {isAuthenticated ? 'Mi Dashboard' : 'Reservar Cita'}
              </button>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">© 2025 Manito Barbershop. Todos los derechos reservados.</p>
            <div className="flex items-center gap-2 text-gray-600">
              <Scissors className="w-4 h-4 text-[#d8b081]" />
              <span className="text-xs uppercase tracking-widest">Bogotá, Colombia</span>
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}
