import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  Scissors,
  Star,
  Clock,
  Check,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ShoppingBag,
  MapPin,
  Award,
  Users,
  Calendar,
  Heart,
  Sparkles,
  Trophy,
  LogOut,
  Package,
  ShieldCheck
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
  const wasDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  const resetPosition = () => {
    offsetRef.current = 0;
    lastTimeRef.current = 0;
    if (trackRef.current) {
      trackRef.current.style.transform = 'translateX(0px)';
    }
  };

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
      wasDraggingRef.current = false;
      dragStartXRef.current = e.clientX;
      dragStartOffsetRef.current = offsetRef.current;
      container.classList.add('is-dragging');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const dx = e.clientX - dragStartXRef.current;
      if (Math.abs(dx) > 3) hasMovedRef.current = true;
      offsetRef.current = dragStartOffsetRef.current + dx;
    };

    const onMouseUp = () => {
      // Record whether a real drag happened for the click handler
      wasDraggingRef.current = hasMovedRef.current;
      isDraggingRef.current = false;
      hasMovedRef.current = false;
      container.classList.remove('is-dragging');
    };

    const onMouseLeave = () => {
      if (isDraggingRef.current) {
        wasDraggingRef.current = hasMovedRef.current;
        isDraggingRef.current = false;
        hasMovedRef.current = false;
        container.classList.remove('is-dragging');
      }
    };

    // Prevent accidental clicks after dragging — only block the click
    // that immediately follows a real drag gesture
    const onClick = (e: MouseEvent) => {
      if (wasDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        wasDraggingRef.current = false;
      }
    };

    // ── Touch drag ──
    const onTouchStart = (e: TouchEvent) => {
      if (isNoDragTarget(e.target)) return;
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      wasDraggingRef.current = false;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartOffsetRef.current = offsetRef.current;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.touches[0].clientX - dragStartXRef.current;
      if (Math.abs(dx) > 3) hasMovedRef.current = true;
      offsetRef.current = dragStartOffsetRef.current + dx;
    };

    const onTouchEnd = () => {
      wasDraggingRef.current = hasMovedRef.current;
      isDraggingRef.current = false;
      hasMovedRef.current = false;
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

  return { trackRef, containerRef, resetPosition };
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
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesView, setServicesView] = useState<'servicios' | 'paquetes'>('servicios');
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [nosotrosSlide, setNosotrosSlide] = useState(0);

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
        // Solo cargar los primeros 6 items para la landing (no cargar todo)
        const [serviciosRes, productosRes, paquetesRes] = await Promise.all([
          apiService.getServiciosPaged({ page: 1, pageSize: 6 }).catch(() => ({ items: [] })),
          productoService.getProductosPaged({ page: 1, pageSize: 6 }).catch(() => ({ items: [] })),
          apiService.getPaquetesPaged({ page: 1, pageSize: 6 }).catch(() => ({ items: [] }))
        ]);

        const serviciosList = (serviciosRes.items || []).filter((s: any) => s.estado !== false).map((s: any) => ({ ...s, type: 'servicio' }));
        const paquetesList = (paquetesRes.items || []).filter((p: any) => p.activo !== false).map((p: any) => ({ ...p, type: 'paquete' }));
        setServicios(serviciosList.slice(0, 6));
        setPaquetes(paquetesList.slice(0, 6));
        setProductos((productosRes.items || []).filter((p: any) => p.activo !== false).slice(0, 6));
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

  const handleOpenDetail = async (item: any, kind: 'servicio' | 'producto') => {
    const normalizedItem = kind === 'producto' ? { ...item, type: 'producto' } : item;
    setSelectedDetailItem(normalizedItem);
    setIsDetailDialogOpen(true);

    const shouldLoadMore = kind === 'producto' || item.type === 'paquete';
    if (!shouldLoadMore) {
      setIsDetailLoading(false);
      return;
    }

    setIsDetailLoading(true);
    try {
      if (kind === 'producto') {
        const fullProducto = await productoService.getProductoById(item.id);
        if (fullProducto) {
          setSelectedDetailItem({ ...fullProducto, type: 'producto' });
        }
      } else if (item.type === 'paquete') {
        const fullPaquete = await apiService.getPaqueteById(item.id);
        if (fullPaquete) {
          setSelectedDetailItem({ ...fullPaquete, type: 'paquete' });
        }
      }
    } catch (error) {
      console.warn('No se pudieron cargar los detalles completos del item:', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDetailDialogChange = (open: boolean) => {
    setIsDetailDialogOpen(open);
    if (!open) {
      setIsDetailLoading(false);
      setSelectedDetailItem(null);
    }
  };

  const activeServiceItems = useMemo(
    () => (servicesView === 'servicios' ? servicios : paquetes),
    [servicesView, servicios, paquetes]
  );

  useEffect(() => {
    servCarousel.resetPosition();
  }, [servicesView]);

  return (
    <div className="min-h-screen bg-black text-white font-body landing-page-container" style={{ overflowX: 'clip' }}>

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

          <div className="flex items-center gap-8">
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

      {/* ═══ Sticky Reveal: Hero + Gallery scroll over Nosotros underneath ═══ */}
      <div style={{ position: 'relative', zIndex: 2, backgroundColor: '#000' }}>

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
        {/* Black transition line */}
        <div className="bg-black" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d8b081]/20 to-transparent" />
        </div>

        {/* Gallery Mosaic */}
        <div className="bg-black" style={{ paddingBottom: '3rem' }}>
          {(() => {
            const fallbackImages = [
              'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=800&fit=crop',
              'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop',
              'https://images.unsplash.com/photo-1521590832167-7228f5fa666e?w=600&h=400&fit=crop',
              'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=800&fit=crop',
              'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=400&fit=crop',
              'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=400&fit=crop',
              'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=800&fit=crop',
              'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=600&h=400&fit=crop',
              'https://images.unsplash.com/photo-1596728325003-1f3e3c0f3e0a?w=600&h=400&fit=crop',
            ];

            const galleryImages: string[] = [];
            paquetes.forEach((p: any) => {
              const img = p.imagen || p.imagenUrl;
              if (img && typeof img === 'string' && img.startsWith('http')) galleryImages.push(img);
            });
            servicios.forEach((s: any) => {
              if (s.imagen && typeof s.imagen === 'string' && s.imagen.startsWith('http')) galleryImages.push(s.imagen);
            });
            productos.forEach((p: any) => {
              if (p.imagenProduc && typeof p.imagenProduc === 'string' && p.imagenProduc.startsWith('http')) galleryImages.push(p.imagenProduc);
            });
            while (galleryImages.length < 15) {
              galleryImages.push(fallbackImages[galleryImages.length % fallbackImages.length]);
            }

            const groups: string[][] = [];
            for (let i = 0; i < galleryImages.length; i += 5) {
              groups.push(galleryImages.slice(i, i + 5));
            }

            return (
              <div className="relative">
                <div
                  className="flex overflow-x-auto gallery-scroll"
                  style={{ height: '520px', gap: '6px', scrollBehavior: 'smooth' }}
                >
                  {groups.map((group, gi) => (
                    <div key={`gallery-group-${gi}`} className="flex shrink-0 h-full" style={{ gap: '6px' }}>
                      <div className="w-[380px] h-full shrink-0 overflow-hidden relative group rounded-lg">
                        <img src={group[0]} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" loading="lazy" draggable={false} />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-500" />
                      </div>
                      <div className="grid grid-cols-2 grid-rows-2 shrink-0" style={{ width: '520px', height: '100%', gap: '6px' }}>
                        {group.slice(1, 5).map((img, idx) => (
                          <div key={idx} className="overflow-hidden relative group rounded-lg">
                            <img src={img} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" loading="lazy" draggable={false} />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all duration-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent pointer-events-none z-10" />
                <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent pointer-events-none z-10" />
              </div>
            );
          })()}
        </div>
      </div>{/* end of Hero + Gallery wrapper */}

      {/* Nosotros — scrolls naturally; zIndex:1 lets following sections (zIndex:2) slide over it */}
      <div id="nosotros" style={{ position: 'relative', zIndex: 1 }}>
        <section className="nosotros-section relative bg-[#0a0a0a]" style={{ padding: '2.5rem 0 10rem', minHeight: '100vh' }}>
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

          {/* Dos columnas: Galería collage izquierda + Info derecha */}
          <div className="grid lg:grid-cols-2 gap-6 items-start">

            {/* Columna izquierda: Galería collage con flechas */}
            <div className="reveal-item">
              {(() => {
                const galleryImgs: string[] = [
                  ...servicios.filter((s: any) => s.imagen?.startsWith('http')).map((s: any) => s.imagen),
                  ...paquetes.filter((p: any) => (p.imagen || p.imagenUrl)?.startsWith('http')).map((p: any) => p.imagen || p.imagenUrl),
                  ...productos.filter((p: any) => p.imagenProduc?.startsWith('http')).map((p: any) => p.imagenProduc),
                ];
                const fallbacks = [
                  'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=800&fit=crop',
                  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=400&fit=crop',
                  'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=400&fit=crop',
                  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=800&fit=crop',
                  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop',
                  'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=400&fit=crop',
                  'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=600&h=400&fit=crop',
                  'https://images.unsplash.com/photo-1596728325003-1f3e3c0f3e0a?w=600&h=400&fit=crop',
                  'https://images.unsplash.com/photo-1521590832167-7228f5fa666e?w=600&h=400&fit=crop',
                ];
                while (galleryImgs.length < 9) {
                  galleryImgs.push(fallbacks[galleryImgs.length % fallbacks.length]);
                }

                const totalPages = Math.ceil(galleryImgs.length / 3);
                const pageIndex = nosotrosSlide % totalPages;

                // Build all page sets
                const pages: string[][] = [];
                for (let p = 0; p < totalPages; p++) {
                  const set = galleryImgs.slice(p * 3, p * 3 + 3);
                  while (set.length < 3) set.push(galleryImgs[set.length % galleryImgs.length]);
                  pages.push(set);
                }

                return (
                  <div className="relative overflow-hidden rounded-2xl" style={{ height: '376px' }}>
                    {/* Carousel track — all pages side by side */}
                    <div
                      style={{
                        display: 'flex',
                        width: `${totalPages * 100}%`,
                        height: '100%',
                        transform: `translateX(-${pageIndex * (100 / totalPages)}%)`,
                        transition: 'transform 0.5s ease-in-out',
                      }}
                    >
                      {pages.map((set, pi) => (
                        <div key={pi} style={{ width: `${100 / totalPages}%`, flexShrink: 0, padding: '0 2px' }}>
                          <div
                            className="h-full gap-4"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.2fr 1fr',
                              gridTemplateRows: '1.3fr 1fr',
                            }}
                          >
                            {/* Imagen principal — 2 filas */}
                            <div className="rounded-2xl overflow-hidden relative group" style={{ gridRow: '1 / 3' }}>
                              <img src={set[0]} alt="" className="w-full h-full object-cover transition-all duration-500 grayscale group-hover:grayscale-0 group-hover:scale-105" loading="lazy" draggable={false} />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all duration-500" />
                            </div>
                            {/* Derecha superior */}
                            <div className="rounded-2xl overflow-hidden relative group">
                              <img src={set[1]} alt="" className="w-full h-full object-cover transition-all duration-500 grayscale group-hover:grayscale-0 group-hover:scale-105" loading="lazy" draggable={false} />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all duration-500" />
                            </div>
                            {/* Derecha inferior */}
                            <div className="rounded-2xl overflow-hidden relative group">
                              <img src={set[2]} alt="" className="w-full h-full object-cover transition-all duration-500 grayscale group-hover:grayscale-0 group-hover:scale-105" loading="lazy" draggable={false} />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all duration-500" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Flecha izquierda */}
                    <button
                      onClick={() => setNosotrosSlide((prev) => (prev - 1 + totalPages) % totalPages)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-[#d8b081]/30 hover:border-[#d8b081]/40 transition-all duration-300 z-10"
                      title="Anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Flecha derecha */}
                    <button
                      onClick={() => setNosotrosSlide((prev) => (prev + 1) % totalPages)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-[#d8b081]/30 hover:border-[#d8b081]/40 transition-all duration-300 z-10"
                      title="Siguiente"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Indicadores de página */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setNosotrosSlide(i)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            i === pageIndex
                              ? 'bg-[#d8b081] w-6'
                              : 'bg-white/40 hover:bg-white/60 w-2'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Columna derecha: esencia + stats + CTA */}
            <div className="reveal-item space-y-6 rounded-3xl" style={{ transitionDelay: '0.15s' }}>
              {/* Card principal - Nuestra esencia */}
              <div className="glass-card rounded-2xl p-8 mt-4">
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
            </div>

          </div>

          {/* CTA Card — centrada debajo del grid */}
          <div className="max-w-2xl mx-auto mt-6 reveal-item">
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
        </div>
        </section>
      </div>

      {/* Supertítulo que abarca servicios y productos */}
      <div className="border-t border-white/5 pt-16 pb-0 backdrop-blur-md" style={{ position: 'relative', zIndex: 2, backgroundColor: '#000' }}>
        <div className="content-max-width text-center reveal-item">
          <div className="supertitle-wrapper">
            <span className="supertitle-line" />
            <h2 className="section-supertitle font-bold font-title tracking-tight leading-none text-gradient uppercase">
              Lo que ofrecemos
              
            </h2>
            
            <span className="supertitle-line " />
            
          </div>
          <p className="text-gray-400 max-w-xl mx-auto text-lg font-medium leading-relaxed italic mt-6 mb-4">"La calidad es el único estándar que no admite compromisos."</p>
        </div>
      </div>

      {/* Servicios Section */}
      <section id="servicios" className="pb-24 pt-0" style={{ backgroundColor: '#0a0a0a', position: 'relative', zIndex: 2 }}>
        <div className="content-max-width relative z-10">
          <div className="text-center mb-10 reveal-item">

            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase" style={{ paddingTop: '4rem', marginBottom: '1rem' }}>
              Servicios
            </h3>
            <div className="mt-8 mb-10 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setServicesView('servicios')}
                title="Ver servicios individuales"
                data-selected={servicesView === 'servicios'}
                className="min-w-[210px] px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] bg-transparent text-[#d8b081] transition-all duration-300 shadow-lg gold-hover-transition"
              >
                Individuales
              </button>
              <button
                type="button"
                onClick={() => setServicesView('paquetes')}
                title="Ver paquetes disponibles"
                data-selected={servicesView === 'paquetes'}
                className="min-w-[210px] px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] bg-transparent text-[#d8b081] transition-all duration-300 shadow-lg gold-hover-transition"
              >
                Paquetes
              </button>
            </div>
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
              {[...activeServiceItems, ...activeServiceItems].map((servicio, idx) => (
                <div key={`srv-${idx}`} className="w-[380px] shrink-0 px-3 group">
                  <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover h-full">
                    <div className="relative overflow-hidden bg-[#111]" style={{ height: '240px' }}>
                      <img loading="lazy" src={servicio.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600'} alt={servicio.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
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
                      <div className="space-y-3">
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
                        <button
                          data-carousel-no-drag="true"
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(servicio, 'servicio');
                          }}
                          title={`Ver detalles de ${servicio.nombre}`}
                          className="w-full py-3 bg-transparent text-[#d8b081] text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] hover:scale-105 transition-all duration-300 shadow-lg relative z-10 gold-hover-transition"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Productos Section */}
      <section id="productos" className="pb-24 pt-16" style={{ position: 'relative', zIndex: 2, backgroundColor: '#0d0d0d' }}>
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
                      <img loading="lazy" src={producto.imagenProduc || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'} alt={producto.nombre} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                    <div className="px-6 pt-5 pb-6">
                      <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500 block mb-2">{producto.categoria?.nombre || 'Producto'}</span>
                      <div className="flex items-baseline justify-between mb-3">
                        <h3 className="text-lg font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{producto.nombre}</h3>
                        <span className="text-xl font-black text-[#d8b081] ml-3">${formatCurrency(producto.precio)}</span>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{producto.descripcion}</p>
                      <button
                        data-carousel-no-drag="true"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(producto, 'producto');
                        }}
                        title={`Ver detalles de ${producto.nombre}`}
                        className="w-full mt-6 py-3 bg-transparent text-[#d8b081] text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] hover:scale-105 transition-all duration-300 shadow-lg relative z-10 gold-hover-transition"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Datos Clave Section — moved from Nosotros */}
      <section className="py-20" style={{ position: 'relative', zIndex: 2, backgroundColor: '#080808' }}>
        <div className="content-max-width relative z-10 ">
          <div className="text-center mb-12 reveal-item">
            <div className="flex items-center justify-center gap-4 mb-4 ">
              <div className="w-12 h-12 rounded-2xl icon-float flex mt-6 mb-6 items-center justify-center">
                <Award className="w-6 h-6 text-[#d8b081]" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.5em] text-[#d8b081] block"></span>
                <h3 className="text-2xl mt-6 mb-6 font-title font-black uppercase tracking-tight text-white">Datos relevantes</h3>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 reveal-item">
            {/* Ubicación */}
            <div className="glass-card-dark rounded-2xl p-6 mb-8">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#d8b081]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-2">Ubicación</p>
                  <p className="text-lg font-bold text-gray-400">Calle 79 #52-12</p>
                  <p className="text-sm text-gray-500 mt-0.5">Barrio El Bosque, Medellín</p>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="glass-card-dark rounded-2xl p-6 mb-8">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#d8b081]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-2">Contacto</p>
                  <p className="text-lg font-bold text-gray-400">301 483 6189</p>
                  <p className="text-sm text-gray-500 mt-0.5">Llámanos o escríbenos</p>
                </div>
              </div>
            </div>

            {/* Horario */}
            <div className="glass-card-dark rounded-2xl p-6 mb-8">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#d8b081]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-2">Horario</p>
                  <div className="flex items-center justify-between mt-1 gap-4">
                    <span className="text-sm font-semibold text-white">Lun — Dom</span>
                    <span className="text-sm font-bold text-gray-400">9:00 — 20:00</span>
                  </div>
                  
                </div>
              </div>
            </div>

            {/* Equipo */}
            <div className="glass-card-dark rounded-2xl p-6 mb-8">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-[#d8b081]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-white font-medium mb-2">Equipo</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    5 barberos profesionales y personal administrativo a tu servicio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Detail Modal ── */}
      <Dialog open={isDetailDialogOpen} onOpenChange={handleDetailDialogChange}>
        <DialogContent className="detail-modal-content w-[96vw] max-w-[750px] max-h-[90vh] border border-[#d8b081]/15 !bg-[#0e0e13] !p-0 !gap-0 text-white overflow-hidden rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(216,176,129,0.08)]">

          {/* ─── Skeleton / Loading state ─── */}
          {isDetailLoading && !selectedDetailItem?.nombre ? (
            <div className="p-0">
              <div className="relative h-[130px] bg-[#1a1a1a] overflow-hidden">
                <div className="absolute inset-0 skeleton-shimmer-gold" />
                <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[#0e0e13] to-transparent" />
                <div className="absolute top-3 left-4 w-20 h-6 rounded-full bg-[#d8b081]/8 border border-[#d8b081]/10" />
              </div>
              <div className="p-5 space-y-3">
                <div className="w-2/3 h-5 rounded-lg bg-[#d8b081]/10 skeleton-shimmer-gold" />
                <div className="w-full h-3 rounded-full bg-[#d8b081]/6 skeleton-shimmer-gold" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-24 rounded-xl bg-[#d8b081]/5 border border-[#d8b081]/8 skeleton-shimmer-gold" />
                  <div className="h-24 rounded-xl bg-[#d8b081]/5 border border-[#d8b081]/8 skeleton-shimmer-gold" />
                </div>
                <div className="flex justify-center gap-3">
                  <div className="w-36 h-9 rounded-xl bg-[#d8b081]/8 border border-[#d8b081]/12 skeleton-shimmer-gold" />
                  <div className="w-24 h-9 rounded-xl bg-white/5 border border-white/8 skeleton-shimmer-gold" />
                </div>
              </div>
            </div>
          ) : selectedDetailItem && (
            <div className="overflow-y-auto detail-modal-scroll" style={{ maxHeight: 'calc(90vh - 2rem)' }}>

              {/* ─── Image header ─── */}
              <div
                className="relative w-full overflow-hidden bg-[#111]"
                style={{
                  height: '100px',
                  backgroundImage: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e13] via-[#0e0e13]/30 to-transparent" />

                {/* Floating badge */}
                <span className="absolute top-3 left-4 inline-flex items-center gap-1.5 rounded-full border border-[#d8b081]/40 bg-black/60 backdrop-blur-md px-3 py-1 text-[9px] font-black uppercase tracking-[0.35em] text-[#f2d6b3] shadow-lg z-10">
                  {selectedDetailItem.type === 'producto' ? <ShoppingBag className="h-3 w-3" /> : selectedDetailItem.type === 'paquete' ? <Package className="h-3 w-3" /> : <Scissors className="h-3 w-3" />}
                  {selectedDetailItem.type === 'producto' ? 'Producto' : selectedDetailItem.type === 'paquete' ? 'Paquete' : 'Servicio'}
                </span>

                {/* Price */}
                <div className="absolute bottom-3 right-4 text-right z-10">
                  <span className="text-2xl font-black font-title text-[#f2d6b3] drop-shadow-lg">${formatCurrency(selectedDetailItem.precio)}</span>
                  {selectedDetailItem.type === 'paquete' && Number(selectedDetailItem.precioOriginal) > Number(selectedDetailItem.precio) && (
                    <span className="block text-xs text-gray-400 line-through">${formatCurrency(selectedDetailItem.precioOriginal)}</span>
                  )}
                </div>
              </div>

              {/* ─── Content body ─── */}
              <div className="relative px-6 pb-5 pt-3">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(216,176,129,0.06),transparent_55%)] pointer-events-none" />

                <div className="relative space-y-3">

                  {/* ── Top: Name+Desc+Quote (left) | Info cards (right) ── */}
                  <div className="flex gap-5 items-start">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-500 block mb-1">
                          {selectedDetailItem.type === 'producto'
                            ? selectedDetailItem.categoria?.nombre || 'Colección destacada'
                            : selectedDetailItem.type === 'paquete' ? 'Experiencia combinada' : 'Cuidado personalizado'}
                        </span>
                        <h3 className="text-lg font-black font-title uppercase tracking-tight text-white leading-tight">
                          {selectedDetailItem.nombre}
                        </h3>
                      </div>
                      <p className="text-[13px] leading-relaxed text-gray-300">
                        {selectedDetailItem.descripcion || (
                          selectedDetailItem.type === 'producto'
                            ? 'Producto seleccionado para complementar tu estilo y rutina de cuidado personal.'
                            : 'Una propuesta premium para una experiencia cómoda, precisa y memorable.'
                        )}
                      </p>
                      <div className="detail-motivational-quote">
                        <div className="detail-quote-border" />
                        <p className="text-[13px] font-title italic text-gray-200 leading-relaxed pl-3.5">
                          {selectedDetailItem.type === 'producto'
                            ? '"Tu imagen habla por ti. Elige los productos que reflejan quién eres."'
                            : selectedDetailItem.type === 'paquete'
                              ? '"Una experiencia completa merece una atención sin igual."'
                              : '"Cada corte es una obra de arte. Tu estilo, nuestra inspiración."'}
                        </p>
                      </div>
                    </div>

                    {/* Right: stacked info cards */}
                    <div className="flex flex-col gap-2 w-[130px] shrink-0">
                      <div className="detail-info-card rounded-xl p-2.5 text-center">
                        <div className="w-7 h-7 rounded-lg icon-float flex items-center justify-center mx-auto mb-1">
                          {selectedDetailItem.type === 'producto'
                            ? <ShoppingBag className="w-3.5 h-3.5 text-[#d8b081]" />
                            : <Clock className="w-3.5 h-3.5 text-[#d8b081]" />}
                        </div>
                        <span className="block text-sm font-black font-title text-white leading-none">
                          {selectedDetailItem.type === 'producto'
                            ? `${Number(selectedDetailItem.stockVentas || 0) + Number(selectedDetailItem.stockInsumos || 0)}`
                            : `${selectedDetailItem.duracion} min`}
                        </span>
                        <span className="block text-[9px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                          {selectedDetailItem.type === 'producto' ? 'Disponibles' : 'Duración'}
                        </span>
                      </div>
                      <div className="detail-info-card rounded-xl p-2.5 text-center">
                        <div className="w-7 h-7 rounded-lg icon-float flex items-center justify-center mx-auto mb-1">
                          <Star className="w-3.5 h-3.5 text-[#d8b081]" />
                        </div>
                        <span className="block text-sm font-black font-title text-white leading-none">Premium</span>
                        <span className="block text-[9px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Calidad</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Detail rows (2-column wrap) ── */}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailItem.type === 'producto' ? (
                      <>
                        <div className="detail-row flex-1 min-w-[calc(50%-0.2rem)]">
                          <span className="text-[12px] text-gray-400">Marca</span>
                          <span className="text-[12px] font-bold text-white">{selectedDetailItem.marca || 'Selección Manito'}</span>
                        </div>
                        <div className="detail-row flex-1 min-w-[calc(50%-0.2rem)]">
                          <span className="text-[12px] text-gray-400">Stock ventas</span>
                          <span className="text-[12px] font-bold text-white">{selectedDetailItem.stockVentas ?? 0}</span>
                        </div>
                        <div className="detail-row flex-1 min-w-[calc(50%-0.2rem)]">
                          <span className="text-[12px] text-gray-400">Stock insumos</span>
                          <span className="text-[12px] font-bold text-white">{selectedDetailItem.stockInsumos ?? 0}</span>
                        </div>
                        <div className="detail-row flex-1 min-w-[calc(50%-0.2rem)]">
                          <span className="text-[12px] text-gray-400">IVA</span>
                          <span className="text-[12px] font-bold text-white">{selectedDetailItem.porcentajeIva ?? selectedDetailItem.iva ?? 0}%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="detail-row flex-1 min-w-[calc(50%-0.2rem)]">
                          <span className="text-[12px] text-gray-400">Tipo</span>
                          <span className="text-[12px] font-bold text-white">{selectedDetailItem.type === 'paquete' ? 'Paquete integral' : 'Servicio individual'}</span>
                        </div>
                        <div className="detail-row flex-1 min-w-[calc(50%-0.2rem)]">
                          <span className="text-[12px] text-gray-400">Atención</span>
                          <span className="text-[12px] font-bold text-white">Personalizada</span>
                        </div>
                        {selectedDetailItem.type === 'paquete' && (
                          <div className="detail-row flex-1 min-w-[calc(50%-0.2rem)]">
                            <span className="text-[12px] text-gray-400">Ahorro</span>
                            <span className="text-[12px] font-bold text-[#d8b081]">
                              {Math.max(0, Number(selectedDetailItem.precioOriginal || 0) - Number(selectedDetailItem.precio || 0)) > 0
                                ? `$${formatCurrency(Math.max(0, Number(selectedDetailItem.precioOriginal || 0) - Number(selectedDetailItem.precio || 0)))}`
                                : 'Incluido'}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* ── Two-column sections: Benefits + Image ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="detail-section-card overflow-clip h-[110px]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Check className="h-3.5 w-3.5 text-[#d8b081]" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                          {selectedDetailItem.type === 'producto' ? 'Lo que debes saber' : selectedDetailItem.type === 'paquete' ? 'Incluye' : 'Beneficios'}
                        </h4>
                      </div>
                      <div className="space-y-1">
                        {selectedDetailItem.type === 'paquete' ? (
                          Array.isArray(selectedDetailItem.servicios) && selectedDetailItem.servicios.length > 0 ? (
                            selectedDetailItem.servicios.slice(0, 3).map((servicioIncluido: string, index: number) => (
                              <div key={`${servicioIncluido}-${index}`} className="flex items-start gap-2">
                                <div className="mt-1.5 h-1 w-1 rounded-full bg-[#d8b081] shadow-[0_0_6px_rgba(216,176,129,0.5)]" />
                                <p className="text-[11px] text-gray-300 leading-snug">{servicioIncluido}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-gray-500 italic">Preparando el listado...</p>
                          )
                        ) : selectedDetailItem.type === 'producto' ? (
                          [
                            'Complementa tu rutina de cuidado.',
                            'Alineado con el estándar Manito.',
                            'Consulta en tu próxima visita.'
                          ].map((tip, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="mt-1.5 h-1 w-1 rounded-full bg-[#d8b081] shadow-[0_0_6px_rgba(216,176,129,0.5)]" />
                              <p className="text-[11px] text-gray-300 leading-snug">{tip}</p>
                            </div>
                          ))
                        ) : (
                          [
                            'Asesoría según tu estilo.',
                            'Atención al detalle profesional.',
                            'Imagen impecable garantizada.'
                          ].map((benefit, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="mt-1.5 h-1 w-1 rounded-full bg-[#d8b081] shadow-[0_0_6px_rgba(216,176,129,0.5)]" />
                              <p className="text-[11px] text-gray-300 leading-snug">{benefit}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="detail-section-card h-[110px] flex items-center justify-center">
                      <img
                        src={
                          selectedDetailItem.type === 'producto'
                            ? selectedDetailItem.imagenProduc || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'
                            : selectedDetailItem.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600'
                        }
                        alt={selectedDetailItem.nombre}
                        style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px', maxWidth: '80px', maxHeight: '80px' }}
                        className="object-cover rounded-lg shadow-lg shadow-black/30 border border-[#d8b081]/15"
                      />
                    </div>
                  </div>

                  {/* ── Experience callout (full width, compact) ── */}
                  <div className="detail-experience-callout">
                    <Sparkles className="h-4 w-4 text-[#d8b081] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f2d6b3] mb-0.5">
                        {selectedDetailItem.type === 'producto' ? 'Experiencia sugerida' : 'La promesa Manito'}
                      </p>
                      <p className="text-[12px] leading-relaxed text-gray-300">
                        {selectedDetailItem.type === 'producto'
                          ? 'Complementa la experiencia Manito y prolonga tu estilo entre visitas.'
                          : 'Enfoque en detalle, comodidad y asesoría para una imagen que te haga sentir único.'}
                      </p>
                    </div>
                  </div>

                  {/* ── Action buttons (centered, compact) ── */}
                  <div className="flex items-center justify-center gap-3 pt-1">
                    {selectedDetailItem.type === 'producto' ? (
                      <button
                        type="button"
                        onClick={() => handleDetailDialogChange(false)}
                        className="px-7 py-2.5 bg-transparent text-[#d8b081] text-[12px] font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] transition-all duration-300 gold-hover-transition"
                      >
                        Seguir Explorando
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleDetailDialogChange(false);
                          if (isAuthenticated) {
                            onSelectReservation?.(selectedDetailItem);
                          } else {
                            onRequestLogin?.();
                          }
                        }}
                        className="px-7 py-2.5 bg-transparent text-[#d8b081] text-[12px] font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] transition-all duration-300 gold-hover-transition"
                      >
                        Agendar Ahora
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDetailDialogChange(false)}
                      className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-[12px] font-semibold uppercase tracking-widest text-gray-400 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-gray-200"
                    >
                      Cerrar
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Footer */}
      <footer id="footer" className="overflow-hidden border-t border-white/10" style={{ position: 'relative', zIndex: 2, backgroundColor: '#080808' }}>
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
                Estilo, elegancia y profesionalismo en cada corte. Más de 2 años transformando estilos en el corazón de Medellín.
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
                    <span className="text-[11px] text-gray-600">Barrio El Bosque, Medellín</span>
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
