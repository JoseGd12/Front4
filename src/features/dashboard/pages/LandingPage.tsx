import { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { 
  Scissors, 
  Star, 
  Clock, 
  Phone, 
  Mail, 
  ChevronRight, 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShoppingBag, 
  MapPin,
  Menu
} from 'lucide-react';
import { Dialog, DialogContent } from '../../../shared/components/ui/dialog';
import { useCustomAlert } from '../../../shared/components/ui/custom-alert';
import { apiService } from '../../../shared/services/api';
import { productoService } from '../../productos/services/productos';
import manitoLogo from '../../../assets/Manito.jpeg';
import '../../../styles/landing.css';

const LOGO_URL = manitoLogo;

interface CartItem { 
  id: number; 
  nombre: string; 
  precio: number; 
  cantidad: number; 
  tipo: 'producto' | 'servicio'; 
  imagen?: string; 
}

const formatCurrency = (amount: number): string => amount.toLocaleString('es-CO');

interface LandingPageProps { 
  onRequestLogin?: () => void; 
  onRequestRegister?: () => void; 
}

export function LandingPage({ onRequestLogin, onRequestRegister }: LandingPageProps) {
  const { isAuthenticated } = useAuth();
  const { info, success } = useCustomAlert();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          ...serviciosRes.filter(s => s.estado !== false).map(s => ({ ...s, tipoItem: 'servicio' })),
          ...paquetesRes.filter(p => p.activo !== false).map(p => ({ ...p, tipoItem: 'paquete' }))
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

  const addToCart = (item: any, tipo: 'producto' | 'servicio') => {
    if (!isAuthenticated) { onRequestLogin?.(); return; }
    const id = item.id;
    const existingItem = cart.find(c => c.id === id && c.tipo === tipo);
    const imagen = tipo === 'producto' ? item.imagenProduc : item.imagen;
    
    if (existingItem) {
      setCart(cart.map(c => c.id === id && c.tipo === tipo ? { ...c, cantidad: c.cantidad + 1 } : c));
    } else {
      setCart([...cart, { id, nombre: item.nombre, precio: item.precio, cantidad: 1, tipo, imagen }]);
    }
    setCartOpen(true);
  };

  const removeFromCart = (id: number, tipo: 'producto' | 'servicio') => setCart(cart.filter(c => !(c.id === id && c.tipo === tipo)));
  
  const updateQuantity = (id: number, tipo: 'producto' | 'servicio', cantidad: number) => {
    if (cantidad <= 0) { removeFromCart(id, tipo); return; }
    setCart(cart.map(c => c.id === id && c.tipo === tipo ? { ...c, cantidad } : c));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  
  const handleCheckout = () => {
    if (!isAuthenticated) { onRequestLogin?.(); return; }
    info('Proceso de compra', 'Redirigiendo al proceso de compra...');
  };
  
  const scrollToSection = (id: string) => { 
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
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
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/95 backdrop-blur-lg border-b border-white/5 py-3' : 'bg-transparent py-5'}`}>
        <div className="content-max-width flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img src={LOGO_URL} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
             <div className="text-2xl font-bold tracking-tight">Manito<span className="text-gradient">Barber</span></div>
          </div>
          
          <div className="hidden md:flex items-center space-x-10 text-sm font-medium">
            {['inicio', 'servicios', 'productos', 'nosotros'].map(s => (
              <button key={s} onClick={() => scrollToSection(s)} className="text-gray-400 hover:text-white transition-colors uppercase button-expert">
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={() => setCartOpen(true)} className="relative hover:text-[#d8b081] transition-colors p-2 button-expert">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#d8b081] text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
            </button>
            <button onClick={onRequestLogin} className="px-5 py-2 border border-white/10 rounded-lg hover:border-[#d8b081]/50 hover:bg-[#d8b081]/10 transition-all text-sm font-medium button-expert">Ingresar</button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-lg border-b border-white/5 p-4 space-y-4">
            {['inicio', 'servicios', 'productos', 'nosotros'].map(s => (
              <button key={s} onClick={() => scrollToSection(s)} className="block w-full text-left text-gray-400 hover:text-[#d8b081] uppercase text-sm font-bold">
                {s}
              </button>
            ))}
          </div>
        )}
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
          className="relative z-10 text-center px-4 max-w-4xl mx-auto reveal-item active"
          style={{ opacity: heroOpacity, transform: `translateY(${(1 - heroOpacity) * 40}px)`, transition: 'none' }}
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight font-title text-gradient">MANITO BARBERSHOP</h1>
          <p className="text-xl sm:text-2xl mb-10 text-gray-300 max-w-2xl mx-auto">Estilo, Elegancia y Profesionalismo en Cada Corte</p>
          <button onClick={onRequestLogin} className="inline-flex items-center gap-2 px-8 py-4 bg-[#d8b081] text-black font-bold rounded-lg shadow-lg shadow-[#d8b081]/30 button-expert">
            Reserva tu Cita
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Nosotros Section */}
      <section id="nosotros" className="section-padding bg-[#0d0d0d] relative overflow-hidden">
        <div className="content-max-width">
          <div className="grid lg:grid-cols-2 magister-gap items-start">
            <div className="reveal-item space-y-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-[#d8b081] mb-6 block">Nuestra Trayectoria</span>
                <h2 className="text-6xl md:text-8xl font-black uppercase font-title tracking-tighter leading-[0.9] mb-10">Manito Barber</h2>
              </div>
              <div className="space-y-6 text-gray-200 text-lg leading-relaxed max-w-lg">
                <p>Somos una barbería ubicada en Bogotá, dedicada al cuidado de la apariencia masculina desde el 1 de abril de 2023. Con más de 2 años de trayectoria, nos hemos consolidado como un punto de referencia.</p>
                <p>Contamos con un equipo de <span className="text-[#d8b081] font-black">6 colaboradores</span>, entre ellos <span className="text-[#d8b081] font-black">5 barberos especializados</span>.</p>
                <p>Ofrecemos una línea completa de productos para el cuidado facial y capilar, así como accesorios exclusivos.</p>
              </div>
            </div>

            <div className="reveal-item" style={{ transitionDelay: '0.3s' }}>
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-8">
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-[#d8b081] mb-8 block">Datos Clave</span>
                <div className="space-y-0">
                  <div className="flex items-start gap-5 py-7 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-[#d8b081]/10 border border-[#d8b081]/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#d8b081]" />
                    </div>
                    <div>
                      <div className="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 mb-1">Ubicación</div>
                      <div className="text-xl font-black font-title text-white">Calle 79 #52-12</div>
                      <div className="text-sm text-gray-300 mt-0.5">Barrio El Bosque</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-5 py-7 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-[#d8b081]/10 border border-[#d8b081]/20 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[#d8b081]" />
                    </div>
                    <div>
                      <div className="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 mb-1">Contacto</div>
                      <div className="text-xl font-black font-title text-white">301 483 6189</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-5 pt-7">
                    <div className="w-11 h-11 rounded-xl bg-[#d8b081]/10 border border-[#d8b081]/20 flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-5 h-5 text-[#d8b081]" />
                    </div>
                    <div>
                      <div className="text-[12px] font-black uppercase tracking-[0.4em] text-gray-400 mb-1">Equipo</div>
                      <div className="text-base text-gray-200 leading-relaxed">5 barberos profesionales y personal administrativo a tu servicio</div>
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
          <div className="text-center mb-16 reveal-item">
            <h2 className="text-[5rem] md:text-[6.5rem] font-bold font-title tracking-tight text-white mb-6 block capitalize">Servicios</h2>
            <p className="text-gray-400 max-w-lg mx-auto text-sm font-medium leading-relaxed italic">"La calidad es el único estándar que no admite compromisos."</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-96 bg-zinc-900 animate-pulse rounded-2xl"></div>)
            ) : servicios.map((servicio, idx) => (
              <div key={servicio.id} className="reveal-item group" style={{ transitionDelay: `${idx * 0.15}s` }}>
                <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover">
                  <div className="relative overflow-hidden bg-[#111]" style={{ height: '260px' }}>
                    <img src={servicio.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600'} alt={servicio.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-y-2 group-hover:translate-y-0 text-white">
                      <Clock className="w-3 h-3 text-[#d8b081]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{servicio.duracion} min</span>
                    </div>
                  </div>
                  <div className="px-4 pt-4 pb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-500 block mb-1">
                      {servicio.tipoItem === 'paquete' ? 'Paquete' : 'Servicio'}
                    </span>
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-base font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{servicio.nombre}</h3>
                      <span className="text-lg font-black text-[#d8b081] ml-3">${formatCurrency(servicio.precio)}</span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed mb-4">{servicio.descripcion}</p>
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
          <div className="text-center mb-16 reveal-item">
            <h2 className="text-[5rem] md:text-[6.5rem] font-bold font-title tracking-tight text-white mb-6 block capitalize">Productos</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-96 bg-zinc-900 animate-pulse rounded-2xl"></div>)
            ) : productos.map((producto, idx) => (
              <div key={producto.id} className="reveal-item group" style={{ transitionDelay: `${idx * 0.15}s` }}>
                <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover">
                  <div className="relative overflow-hidden bg-[#111]" style={{ height: '260px' }}>
                    <img src={producto.imagenProduc || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'} alt={producto.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  </div>
                  <div className="px-4 pt-4 pb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-500 block mb-1">{producto.categoria?.nombre || 'Producto'}</span>
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-base font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{producto.nombre}</h3>
                      <span className="text-lg font-black text-[#d8b081] ml-3">${formatCurrency(producto.precio)}</span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed mb-4">{producto.descripcion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer id="footer" className="border-t border-white/10" style={{ backgroundColor: '#0d0d0d', paddingTop: '5rem', paddingBottom: '3rem' }}>
        <div className="content-max-width">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Scissors className="w-6 h-6 text-[#d8b081]" />
                <span className="text-xl font-black font-title tracking-tight text-white uppercase">Elite</span>
              </div>
              <p className="text-gray-500 text-xs italic leading-relaxed">"El estilo es una forma de decir quién eres sin tener que hablar."</p>
            </div>
            <div className="space-y-5">
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#d8b081] block">Explorar</span>
              <ul className="space-y-4">
                {[['inicio', 'Inicio'], ['servicios', 'Servicios'], ['productos', 'Productos'], ['nosotros', 'Nosotros']].map(([id, label]) => (
                  <li key={id}>
                    <button onClick={() => scrollToSection(id)} className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 hover:text-white transition-colors uppercase">{label}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-5">
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#d8b081] block">Horario</span>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400"><span>L — V</span><span>9:00 — 20:00</span></div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400"><span>SÁB</span><span>9:00 — 20:00</span></div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-600"><span>DOM</span><span>Cerrado</span></div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center md:text-left">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">© 2025 Manito Barbershop. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="bg-black border border-white/10 text-white max-w-md">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-2xl font-bold font-title uppercase">Carrito</h2>
              <button onClick={() => setCartOpen(false)} className="hover:text-[#d8b081] transition-colors"><X className="w-6 h-6" /></button>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-gray-500">Tu carrito está vacío</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={`${item.tipo}-${item.id}`} className="flex gap-4 p-4 bg-white/5 rounded-lg">
                      <img src={item.imagen || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200'} alt={item.nombre} className="w-20 h-20 object-cover rounded-lg" />
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.nombre}</h3>
                        <p className="text-[#d8b081] font-bold">${formatCurrency(item.precio * item.cantidad)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => updateQuantity(item.id, item.tipo, item.cantidad - 1)} className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10"><Minus className="w-3 h-3" /></button>
                          <span className="font-semibold text-sm">{item.cantidad}</span>
                          <button onClick={() => updateQuantity(item.id, item.tipo, item.cantidad + 1)} className="w-7 h-7 bg-white/5 rounded flex items-center justify-center hover:bg-white/10"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id, item.tipo)} className="text-gray-500 hover:text-white transition"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-3xl font-bold text-[#d8b081]">${formatCurrency(cartTotal)}</span>
                  </div>
                  <button onClick={handleCheckout} className="w-full py-4 bg-[#d8b081] text-black font-bold rounded-lg button-expert flex items-center justify-center gap-2">
                    Proceder al Pago <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
