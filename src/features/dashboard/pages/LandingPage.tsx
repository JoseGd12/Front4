import { useState, useEffect, useRef } from 'react';
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
  MapPin,
  Award,
  Users,
  Calendar,
  Heart,
  Sparkles,
  Trophy,
  LogOut
} from 'lucide-react';
import { Dialog, DialogContent } from '../../../shared/components/ui/dialog';
import { useCustomAlert } from '../../../shared/components/ui/custom-alert';
import { apiService } from '../../../shared/services/api';
import { productoService } from '../../productos/services/productos';
import manitoLogo from '../../../assets/Manito.jpeg';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import '../../../styles/landing.css';

const LOGO_URL = manitoLogo;

// ── Carousel hook: auto-scroll + drag-to-explore ──
function useCarouselDrag(speed: number = 0.5, enabled: boolean = true) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;

    lastTimeRef.current = 0;

    const isNoDragTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('[data-carousel-no-drag="true"]'));

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (!isDraggingRef.current) {
        offsetRef.current -= speed * (delta / 16);
      }

      const hw = track.scrollWidth / 2;
      if (hw > 0) {
        while (offsetRef.current <= -hw) offsetRef.current += hw;
        while (offsetRef.current > 0) offsetRef.current -= hw;
      }

      track.style.transform = `translateX(${offsetRef.current}px)`;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // ── Mouse drag ──
    const onMouseDown = (e: MouseEvent) => {
      if (isNoDragTarget(e.target)) return;
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      dragStartXRef.current = e.clientX;
      dragStartOffsetRef.current = offsetRef.current;
      container.classList.add('is-dragging');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      if (isNoDragTarget(e.target)) {
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        container.classList.remove('is-dragging');
        return;
      }
      e.preventDefault();
      const dx = e.clientX - dragStartXRef.current;
      if (Math.abs(dx) > 3) hasMovedRef.current = true;
      offsetRef.current = dragStartOffsetRef.current + dx;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      container.classList.remove('is-dragging');
    };

    const onMouseLeave = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        container.classList.remove('is-dragging');
      }
    };

    // Prevent accidental clicks after dragging
    const onClick = (e: MouseEvent) => {
      if (hasMovedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // ── Touch drag ──
    const onTouchStart = (e: TouchEvent) => {
      if (isNoDragTarget(e.target)) return;
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartOffsetRef.current = offsetRef.current;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      if (isNoDragTarget(e.target)) {
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        container.classList.remove('is-dragging');
        return;
      }
      const dx = e.touches[0].clientX - dragStartXRef.current;
      if (Math.abs(dx) > 3) hasMovedRef.current = true;
      offsetRef.current = dragStartOffsetRef.current + dx;
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('click', onClick, true);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('click', onClick, true);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [speed, enabled]);

  return { trackRef, containerRef };
}


const formatCurrency = (amount: number): string => amount.toLocaleString('es-CO');

interface LandingPageProps {
  onRequestLogin?: () => void;
  onRequestRegister?: () => void;
  onRequestDashboard?: () => void;
  onSelectReservation?: (item: any) => void;
}

export function LandingPage({ onRequestLogin, onRequestRegister, onRequestDashboard, onSelectReservation }: LandingPageProps) {
  const { isAuthenticated, logout } = useAuth();
  const { info, success } = useCustomAlert();
  const [scrolled, setScrolled] = useState(false);
  const [heroOpacity, setHeroOpacity] = useState(1);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', fecha: '', hora: '', servicio: '' });

  const [servicios, setServicios] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carousel hooks — services scroll left, products scroll right
  const servCarousel = useCarouselDrag(1, !loading);
  const prodCarousel = useCarouselDrag(-1, !loading);

  const lenisRef = useRef<Lenis | null>(null);

  // Smooth scroll with Lenis
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 0.8,
      lerp: 0.25,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

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
    if (lenisRef.current) {
      lenisRef.current.scrollTo(`#${id}`, {
        offset: 0,
        immediate: false,
        duration: 1.5,
      });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
              className="flex items-center gap-4 transition-all duration-300 group"
            >
              <img src={LOGO_URL} alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-lg" />
              <div className="text-3xl font-bold tracking-tight nav-link-hover">Manito<span>Barbershop</span></div>
            </button>
            {[
              { id: 'nosotros', label: 'Nosotros' },
              { id: 'servicios', label: 'Servicios' },
              { id: 'productos', label: 'Productos' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="nav-link-hover text-base font-semibold uppercase tracking-wide relative group py-1 transition-all duration-300"
                title={`Ir a ${item.label}`}
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <button
                  onClick={onRequestDashboard}
                  className="nav-link-hover text-base font-semibold uppercase tracking-wide relative group py-1 transition-all duration-300"
                  title="Ir a mi panel de control"
                >
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
                </button>
                <button
                  onClick={logout}
                  className="nav-link-hover text-base font-semibold uppercase tracking-wide relative group py-1 transition-all duration-300 flex items-center gap-2"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
                </button>
              </>
            ) : (
              <button
                onClick={onRequestLogin}
                className="nav-link-hover text-base font-semibold uppercase tracking-wide relative group py-1 transition-all duration-300"
                title="Iniciar sesión en tu cuenta"
              >
                Ingresar
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
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
          <h1 className="font-bold tracking-tight font-title text-gradient leading-none mb-6" style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)' }}>MANITO BARBERSHOP</h1>
          <button
            onClick={isAuthenticated ? onRequestDashboard : onRequestLogin}
            title="Reserva tu cita ahora — rápido y fácil"
            className="inline-flex items-center gap-3 px-10 py-5 bg-[#d8b081] text-black font-bold text-lg rounded-xl shadow-2xl shadow-[#d8b081]/30 hover:bg-[#e8c091] hover:scale-105 transition-all duration-300 mb-10"
          >
            {isAuthenticated ? 'Gestionar Mis Citas' : 'Reserva tu Cita'}
            <ChevronRight className="w-6 h-6" />
          </button>
          <p className="text-2xl sm:text-3xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-light">Estilo, Elegancia y Profesionalismo en Cada Corte</p>
        </div>
      </header>

      {/* Nosotros Section */}
      <section id="nosotros" className="nosotros-section relative overflow-hidden" style={{ padding: '5rem 0' }}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-[#d8b081]/5 blur-[100px] animate-float-slow" />
          <div className="absolute bottom-20 left-[5%] w-96 h-96 rounded-full bg-[#d8b081]/3 blur-[120px]" style={{ animationDelay: '3s' }} />
        </div>

        <div className="content-max-width relative z-10">
          {/* Título de sección */}
          <div className="text-center mb-8 reveal-item">
            <h2 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase">
              Nosotros
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed mt-4">
              Más de 2 años transformando estilos en el corazón de Medellín
            </p>
          </div>

          {/* Contenido en dos columnas */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">

            {/* Columna izquierda: esencia + stats + CTA */}
            <div className="reveal-item space-y-6 rounded-3xl">
              {/* Card principal - Nuestra esencia */}
              <div className="glass-card rounded-2xl p-8 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl icon-float flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#d8b081]" />
                  </div>
                  <div>
                    <span className="text-[21px] uppercase tracking-[0.5em] text-[#d8b081] font-black block">Nuestra esencia</span>
                    <span className="text-xs text-gray-500">Desde abril 2023</span>
                  </div>
                </div>

                <p className="text-gray-200 text-base leading-relaxed mb-8">
                  Somos una barbería ubicada en Medellín, dedicada al cuidado de la apariencia masculina.
                  Contamos con un equipo de
                  <span className="text-[#d8b081] font-black"> 6 colaboradores</span>,
                  entre ellos
                  <span className="text-[#d8b081] font-black"> 5 barberos especializados</span>.
                  Cada servicio combina técnica, criterio estilístico y atención 100% personalizada.
                </p>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-card rounded-2xl p-5 text-center">
                    <div className="w-10 h-10 rounded-xl icon-float flex items-center justify-center mx-auto mb-3">
                      <Users className="w-5 h-5 text-[#d8b081]" />
                    </div>
                    <div className="text-3xl font-black font-title text-white leading-none">5</div>
                    <div className="text-xs text-gray-400 mt-2 uppercase tracking-wider font-semibold">Barberos profesionales</div>
                  </div>
                  <div className="stat-card rounded-2xl p-5 text-center">
                    <div className="w-10 h-10 rounded-xl icon-float flex items-center justify-center mx-auto mb-3">
                      <Trophy className="w-5 h-5 text-[#d8b081]" />
                    </div>
                    <div className="text-3xl font-black font-title text-white leading-none">6</div>
                    <div className="text-xs text-gray-400 mt-2 uppercase tracking-wider font-semibold">Colaboradores en total</div>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl icon-float flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-[#d8b081]" />
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    También ofrecemos productos para el cuidado facial, capilar y accesorios exclusivos.
                  </p>
                </div>
                <button
                  onClick={() => scrollToSection('servicios')}
                  title="Conoce todos nuestros servicios disponibles"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#d8b081] text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-[#e8c091] hover:scale-105 transition-all duration-300 shrink-0 shadow-[0_4px_20px_rgba(216,176,129,0.25)]"
                >
                  Ver servicios <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Columna derecha: datos clave */}
            <div className="reveal-item rounded-3xl" style={{ transitionDelay: '0.15s' }}>
              <div className="glass-card rounded-2xl p-8 md:p-10 h-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl icon-float flex items-center justify-center">
                    <Award className="w-6 h-6 text-[#d8b081]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-[#d8b081] block">Datos clave</span>
                    <h3 className="text-2xl font-title font-black uppercase tracking-tight text-white">Manito Barber</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Ubicación */}
                  <div className="glass-card-dark rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-[#d8b081]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-1">Ubicación</p>
                        <p className="text-lg font-bold text-gray-400">Calle 79 #52-12</p>
                        <p className="text-sm text-gray-500 mt-0.5">Barrio El Bosque, Medellín</p>
                      </div>
                    </div>
                  </div>

                  {/* Contacto */}
                  <div className="glass-card-dark rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-[#d8b081]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-1">Contacto</p>
                        <p className="text-lg font-bold text-gray-400">301 483 6189</p>
                        <p className="text-sm text-gray-500 mt-0.5">Llámanos o escríbenos</p>
                      </div>
                    </div>
                  </div>

                  {/* Horario */}
                  <div className="glass-card-dark rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-[#d8b081]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-1">Horario</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-semibold text-white">Lun — Sáb</span>
                          <span className="text-sm font-bold text-gray-400">9:00 — 20:00</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-semibold text-gray-500">Domingo</span>
                          <span className="text-sm font-semibold text-gray-600">Cerrado</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Equipo */}
                  <div className="glass-card-dark rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center shrink-0">
                        <Scissors className="w-5 h-5 text-[#d8b081]" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-1">Equipo</p>
                        <p className="text-sm text-gray-500 leading-relaxed">
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
          <div className="supertitle-wrapper">
            <span className="supertitle-line" />
            <h2 className="section-supertitle font-bold font-title tracking-tight leading-none text-gradient uppercase">
              Lo que ofrecemos
            </h2>
            <span className="supertitle-line" />
          </div>
          <p className="text-gray-400 max-w-xl mx-auto text-lg font-medium leading-relaxed italic mt-6">"La calidad es el único estándar que no admite compromisos."</p>
        </div>
      </div>

      {/* Servicios Section */}
      <section id="servicios" className="pb-24 pt-16 border-white/5" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="content-max-width relative z-10">
          <div className="text-center mb-14 reveal-item">

            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase " style={{ marginTop: '4rem' }}>
              Servicios
            </h3>
          </div>
        </div>

        {/* Carousel de Servicios */}
        <div ref={servCarousel.containerRef} className="overflow-hidden carousel-mask carousel-container">
          {loading ? (
            <div className="flex gap-6 px-6 overflow-hidden w-full" style={{ marginBottom: '2rem' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-[380px] shrink-0 rounded-2xl overflow-hidden border border-[#d8b081]/10 bg-[#141414]" style={{ animationDelay: `${i * 150}ms` }}>
                  {/* Imagen skeleton con shimmer dorado */}
                  <div className="relative h-[240px] bg-[#1a1a1a] overflow-hidden">
                    <div className="absolute inset-0 skeleton-shimmer-gold" />
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#141414] to-transparent" />
                    {/* Badge skeleton */}
                    <div className="absolute top-4 right-4 w-20 h-8 rounded-xl bg-[#d8b081]/5 border border-[#d8b081]/10" />
                  </div>
                  {/* Contenido skeleton */}
                  <div className="px-6 pt-5 pb-6 space-y-4">
                    {/* Etiqueta tipo */}
                    <div className="w-16 h-2.5 rounded-full bg-[#d8b081]/8 skeleton-shimmer-gold" />
                    {/* Título + precio */}
                    <div className="flex items-baseline justify-between">
                      <div className="w-32 h-5 rounded-md bg-[#d8b081]/10 skeleton-shimmer-gold" />
                      <div className="w-20 h-5 rounded-md bg-[#d8b081]/15 skeleton-shimmer-gold" />
                    </div>
                    {/* Descripción */}
                    <div className="space-y-2">
                      <div className="w-full h-3 rounded-full bg-[#d8b081]/6 skeleton-shimmer-gold" />
                      <div className="w-3/4 h-3 rounded-full bg-[#d8b081]/5 skeleton-shimmer-gold" />
                    </div>
                    {/* Botón skeleton */}
                    <div className="w-full h-12 rounded-xl border-2 border-[#d8b081]/15 bg-[#d8b081]/5 skeleton-shimmer-gold" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div ref={servCarousel.trackRef} className="carousel-track">
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
                        data-carousel-no-drag="true"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAuthenticated) {
                            onSelectReservation?.(servicio);
                          } else {
                            onRequestLogin?.();
                          }
                        }}
                        title={`Reservar ${servicio.nombre} ahora`}
                        className="w-full py-3 bg-transparent text-[#d8b081] text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] hover:scale-105 transition-all duration-300 shadow-lg relative z-10 gold-hover-transition"
                      >
                        Agendar Ahora
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

            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase">
              Productos
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto text-lg leading-relaxed  mb-2">Reserva el producto que deseas y nosotros lo tendremos listo para ti en tu próxima visita.</p>
          </div>
        </div>

        {/* Carousel de Productos — dirección inversa */}
        <div ref={prodCarousel.containerRef} className="overflow-hidden carousel-mask carousel-container">
          {loading ? (
            <div className="flex gap-6 px-6 overflow-hidden w-full" style={{ marginBottom: '2rem' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-[380px] shrink-0 rounded-2xl overflow-hidden border border-[#d8b081]/10 bg-[#141414]" style={{ animationDelay: `${i * 150}ms` }}>
                  {/* Imagen skeleton con shimmer dorado */}
                  <div className="relative h-[240px] bg-[#1a1a1a] overflow-hidden">
                    <div className="absolute inset-0 skeleton-shimmer-gold" />
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#141414] to-transparent" />
                  </div>
                  {/* Contenido skeleton */}
                  <div className="px-6 pt-5 pb-6 space-y-4">
                    {/* Etiqueta categoría */}
                    <div className="w-20 h-2.5 rounded-full bg-[#d8b081]/8 skeleton-shimmer-gold" />
                    {/* Título + precio */}
                    <div className="flex items-baseline justify-between">
                      <div className="w-28 h-5 rounded-md bg-[#d8b081]/10 skeleton-shimmer-gold" />
                      <div className="w-20 h-5 rounded-md bg-[#d8b081]/15 skeleton-shimmer-gold" />
                    </div>
                    {/* Descripción */}
                    <div className="space-y-2">
                      <div className="w-full h-3 rounded-full bg-[#d8b081]/6 skeleton-shimmer-gold" />
                      <div className="w-2/3 h-3 rounded-full bg-[#d8b081]/5 skeleton-shimmer-gold" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div ref={prodCarousel.trackRef} className="carousel-track">
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
      <footer id="footer" className="relative overflow-hidden border-t border-white/10 bg-[#111117]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[52rem] h-[24rem] rounded-full bg-[#d8b081]/6 blur-[130px]" />
        </div>

        {/* CTA Banner */}
        <div className="relative border-b border-white/5">
          <div className="content-max-width relative z-10 py-16 md:py-20 px-8 md:px-12 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-7">
            <div className="max-w-2xl text-center">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[#d8b081] font-black mt-4">Reserva tu momento</p>
              <h3 className="text-2xl md:text-3xl font-bold font-title  text-white mb-2">¿Listo para tu próximo look?</h3>
              <p className="text-gray-400 text-sm md:text-base mb-8">Agenda tu cita y vive la experiencia Manito Barbershop con atención profesional.</p>
            </div>
            <button
              onClick={isAuthenticated ? onRequestDashboard : onRequestLogin}
              title="Reservar cita ahora"
              className="inline-flex items-center gap-3 px-10 pl-4 mb-4 py-4 bg-transparent text-[#d8b081] border-2 border-[#d8b081] font-bold text-sm uppercase tracking-widest rounded-xl shadow-2xl shadow-[#d8b081]/10 hover:scale-105 transition-all duration-300 shrink-0 gold-hover-transition"
            >
              {isAuthenticated ? 'Mi Panel' : 'Reservar Cita'}
              <ChevronRight className="w-4 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="content-max-width relative z-10 py-20 px-8 md:px-12 lg:px-16">
          <div className="grid md:grid-cols-3 gap-10 lg:gap-16">
            {/* Marca */}
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4">
                <img src={LOGO_URL} alt="Manito Barbershop" className="w-12 h-12 rounded-full object-cover border-2 border-[#d8b081]/20" />
                <div>
                  <span className="text-xl font-black font-title mt-4 tracking-tight text-white uppercase block">Manito Barbershop</span>
                  <span className="text-xs text-gray-500 uppercase tracking-widest">Medellín, Colombia</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Estilo, elegancia y profesionalismo en cada corte. Más de 2 años transformando estilos en el corazón de Bogotá.
              </p>
              <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
                <p>Atención personalizada desde el primer contacto hasta el resultado final.</p>
                <p>En cada visita buscamos que te lleves una experiencia cómoda, precisa y memorable.</p>
              </div>
            </div>

            {/* Horario */}
            <div className="space-y-5 mt-6 mr-2">
              <span className="text-lg  font-bold uppercase tracking-[0.3em] text-[#d8b081] block">Horario</span>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Lunes — Viernes</span>
                  <span className="text-white font-medium">9:00 — 20:00</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Sábado</span>
                  <span className="text-white font-medium">9:00 — 20:00</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Domingo</span>
                  <span className="text-gray-600">Cerrado</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Recomendamos agendar con antelación para asegurar tu horario ideal.
              </p>
            </div>

            {/* Contacto */}
            <div className="space-y-5 mt-6 ml-5">
              <span className="text-lg  font-bold uppercase tracking-[0.3em] text-[#d8b081] block">Contacto</span>
              <div className="space-y-4">
                <a href="tel:3014836189" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-white/5 group-hover:bg-[#d8b081]/10 flex items-center justify-center transition-colors">
                    <Phone className="w-4 h-4 text-[#d8b081]" />
                  </div>
                  <div>
                    <span className="text-sm block">301 483 6189</span>
                    <span className="text-[11px] text-gray-600">Llámanos o escríbenos</span>
                  </div>
                </a>

                <a href="mailto:manitobarbershop@gmail.com" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-white/5 group-hover:bg-[#d8b081]/10 flex items-center justify-center transition-colors">
                    <Mail className="w-4 h-4 text-[#d8b081]" />
                  </div>
                  <div>
                    <span className="text-sm block">manitobarbershop@gmail.com</span>
                    <span className="text-[11px] text-gray-600">Atención por correo</span>
                  </div>
                </a>

                <div className="flex items-center gap-3 text-gray-400">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#d8b081]" />
                  </div>
                  <div>
                    <span className="text-sm block">Calle 79 #52-12</span>
                    <span className="text-[11px] text-gray-600">Barrio El Bosque, Bogotá</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                Si tienes dudas sobre servicios o productos, nuestro equipo te asesora sin costo.
              </p>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="relative z-10 border-t border-white/5">
          <div className="content-max-width py-8 px-8 md:px-12 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600 mt-4">© {new Date().getFullYear()} Manito Barbershop. Todos los derechos reservados.</p>
            <div className="flex items-center gap-3 mb-4">
              <Scissors className="w-3.5 h-3.5 text-[#d8b081]/40" />
              <span className="text-xs text-gray-600 uppercase tracking-widest">Hecho con pasión</span>
              <Scissors className="w-3.5 h-3.5 text-[#d8b081]/40 rotate-180" />
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}
