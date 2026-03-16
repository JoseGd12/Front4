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
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/95 backdrop-blur-lg border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
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
      <section id="nosotros" className="section-padding bg-[#0d0d0d] relative overflow-hidden">
        <div className="content-max-width">
          <div className="grid lg:grid-cols-2 magister-gap items-start">
            <div className="reveal-item space-y-12">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.6em] text-[#d8b081] mb-6 block">Nuestra Trayectoria</span>
                <h2 className="text-7xl md:text-9xl font-black uppercase font-title tracking-tighter leading-[0.9] mb-10">Manito Barber</h2>
              </div>
              <div className="space-y-8 text-gray-200 text-xl leading-loose max-w-lg">
                <p>Somos una barbería ubicada en Bogotá, dedicada al cuidado de la apariencia masculina desde el 1 de abril de 2023. Con más de 2 años de trayectoria, nos hemos consolidado como un punto de referencia.</p>
                <p>Contamos con un equipo de <span className="text-[#d8b081] font-black">6 colaboradores</span>, entre ellos <span className="text-[#d8b081] font-black">5 barberos especializados</span>.</p>
                <p>Ofrecemos una línea completa de productos para el cuidado facial y capilar, así como accesorios exclusivos.</p>
              </div>
              <button
                onClick={() => scrollToSection('servicios')}
                title="Conoce todos nuestros servicios disponibles"
                className="inline-flex items-center gap-3 px-10 py-5 bg-[#d8b081] text-black font-bold text-base rounded-xl hover:bg-[#e8c091] hover:scale-105 transition-all duration-300 shadow-lg shadow-[#d8b081]/20"
              >
                Conoce nuestros servicios <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="reveal-item" style={{ transitionDelay: '0.3s' }}>
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-10">
                <span className="text-xs font-black uppercase tracking-[0.6em] text-[#d8b081] mb-10 block">Datos Clave</span>
                <div className="space-y-0">
                  <div className="flex items-start gap-6 py-8 border-b border-white/5">
                    <div className="w-14 h-14 rounded-xl bg-[#d8b081]/10 border border-[#d8b081]/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-[#d8b081]" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Ubicación</div>
                      <div className="text-2xl font-black font-title text-white">Calle 79 #52-12</div>
                      <div className="text-base text-gray-300 mt-1">Barrio El Bosque</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-6 py-8 border-b border-white/5">
                    <div className="w-14 h-14 rounded-xl bg-[#d8b081]/10 border border-[#d8b081]/20 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-[#d8b081]" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Contacto</div>
                      <div className="text-2xl font-black font-title text-white">301 483 6189</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-6 pt-8">
                    <div className="w-14 h-14 rounded-xl bg-[#d8b081]/10 border border-[#d8b081]/20 flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-6 h-6 text-[#d8b081]" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.4em] text-gray-400 mb-2">Equipo</div>
                      <div className="text-lg text-gray-200 leading-relaxed">5 barberos profesionales y personal administrativo a tu servicio</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="section-padding border-y border-white/5" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="content-max-width relative z-10">
          <div className="text-center mb-20 reveal-item">
            <span className="text-xs font-black uppercase tracking-[0.6em] text-[#d8b081] mb-6 block">Lo que ofrecemos</span>
            <h1 className="text-[10rem] md:text-[16rem] lg:text-[20rem] xl:text-[24rem] font-bold font-title tracking-tighter text-white mb-8 block capitalize leading-[0.75]">
              Nuestros Servicios
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto text-lg font-medium leading-relaxed italic">"La calidad es el único estándar que no admite compromisos."</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-96 bg-zinc-900 animate-pulse rounded-2xl"></div>)
            ) : servicios.map((servicio, idx) => (
              <div key={servicio.id} className="reveal-item group" style={{ transitionDelay: `${idx * 0.15}s` }}>
                <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover">
                  <div className="relative overflow-hidden bg-[#111]" style={{ height: '280px' }}>
                    <img src={servicio.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600'} alt={servicio.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-y-2 group-hover:translate-y-0 text-white">
                      <Clock className="w-4 h-4 text-[#d8b081]" />
                      <span className="text-xs font-black uppercase tracking-widest">{servicio.duracion} min</span>
                    </div>
                  </div>
                    <div className="px-6 pt-6 pb-6">
                      <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500 block mb-2">
                        {servicio.type === 'paquete' ? 'Paquete' : 'Servicio'}
                      </span>
                      <div className="flex items-baseline justify-between mb-3">
                        <h3 className="text-lg font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{servicio.nombre}</h3>
                        <span className="text-xl font-black text-[#d8b081] ml-3">${formatCurrency(servicio.precio)}</span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed mb-6">{servicio.descripcion}</p>
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
        </div>
      </section>

      {/* Productos Section */}
      <section id="productos" className="section-padding bg-[#0d0d0d]">
        <div className="content-max-width">
          <div className="text-center mb-20 reveal-item">
            <span className="text-xs font-black uppercase tracking-[0.6em] text-[#d8b081] mb-6 block">Tienda</span>
            <h1 className="text-[10rem] md:text-[16rem] lg:text-[20rem] xl:text-[24rem] font-bold font-title tracking-tighter text-white mb-8 block capitalize leading-[0.75]">
              Nuestros Productos
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto text-lg leading-relaxed">Los mejores productos para el cuidado de tu imagen, disponibles para llevar a casa.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-96 bg-zinc-900 animate-pulse rounded-2xl"></div>)
            ) : productos.map((producto, idx) => (
              <div key={producto.id} className="reveal-item group" style={{ transitionDelay: `${idx * 0.15}s` }}>
                <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover">
                  <div className="relative overflow-hidden bg-[#111]" style={{ height: '280px' }}>
                    <img src={producto.imagenProduc || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'} alt={producto.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  </div>
                  <div className="px-6 pt-6 pb-6">
                    <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500 block mb-2">{producto.categoria?.nombre || 'Producto'}</span>
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="text-lg font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{producto.nombre}</h3>
                      <span className="text-xl font-black text-[#d8b081] ml-3">${formatCurrency(producto.precio)}</span>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">{producto.descripcion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
