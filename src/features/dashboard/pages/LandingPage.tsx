import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useInstagramFeed, type InstagramMedia } from '../../../shared/hooks/useInstagramFeed';
import { InstagramPostModal, type GalleryItem } from '../components/InstagramPostModal';
import { GalleryCell } from '../components/GalleryCell';
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
  ShieldCheck,
  CheckCircle,
  Eye,
  User,
  Instagram
} from 'lucide-react';
import { Dialog, DialogContent } from '../../../shared/components/ui/dialog';
import { useCustomAlert } from '../../../shared/components/ui/custom-alert';
import { apiService } from '../../../shared/services/api';
import { productoService } from '../../productos/services/productos';
import manitoLogo from '../../../assets/Manito.jpeg';
import heroVideo from '../../../assets/hero-video.mp4';
import imgChristian from '../../../assets/Christian.jpg';
import imgEduardo from '../../../assets/Eduardo.jpg';
import imgEdwin from '../../../assets/Edwin.jpg';
import imgJuan from '../../../assets/Juan.jpg';
import imgMaicol from '../../../assets/Maicol.jpg';
import imgTeam from '../../../assets/Team.jpg';
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
  const [heroVideoReady, setHeroVideoReady] = useState(false);
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
  // Fondo único a todo el ancho para “Lo que ofrecemos” (barbería)
  const ofrecemosHeroBg =
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop';

  // Instagram feed for gallery
  const { feed: instagramFeed, error: instagramError } = useInstagramFeed(15);
  if (instagramError) {
    console.warn('[Gallery] Instagram feed no disponible:', instagramError);
  }

  // Modal state for gallery post preview
  const [selectedGalleryPost, setSelectedGalleryPost] = useState<GalleryItem | null>(null);
  const galleryItemsListRef = useRef<GalleryItem[]>([]);

  // Drag-vs-click detection: prevent modal opening after dragging
  const galleryDragStartX = useRef<number | null>(null);
  const handleGalleryMouseDown = (e: React.MouseEvent) => {
    galleryDragStartX.current = e.clientX;
  };
  const handleGalleryClick = (item: GalleryItem, e: React.MouseEvent) => {
    // If user dragged more than 5px, treat as scroll — don't open modal
    if (galleryDragStartX.current !== null && Math.abs(e.clientX - galleryDragStartX.current) > 5) {
      return;
    }
    setSelectedGalleryPost(item);
  };

  // Transform-based infinite carousels (no scrollLeft — seamless loop)
  const servTrackRef = useRef<HTMLDivElement>(null);
  const prodTrackRef = useRef<HTMLDivElement>(null);
  const servOffsetRef = useRef(0);
  const prodOffsetRef = useRef(0);
  const servFrameRef = useRef<number>(0);
  const prodFrameRef = useRef<number>(0);

  const servTargetRef = useRef(0);
  const prodTargetRef = useRef(0);
  const carouselPausedRef = useRef(false);

  const nudgeCarousel = (targetRef: React.MutableRefObject<number>, amount: number) => {
    targetRef.current += amount;
  };

  useEffect(() => {
    if (loading) return;
    const track = servTrackRef.current;
    if (!track) return;
    let last = 0;
    servOffsetRef.current = 0;
    servTargetRef.current = 0;
    const tick = (time: number) => {
      if (!last) last = time;
      const dt = time - last;
      last = time;
      if (!carouselPausedRef.current) {
        servTargetRef.current -= 0.5 * (dt / 16);
      }
      const diff = servTargetRef.current - servOffsetRef.current;
      servOffsetRef.current += diff * Math.min(1, 0.08 * (dt / 16));
      const hw = track.scrollWidth / 2;
      if (hw > 0) {
        while (servOffsetRef.current <= -hw) { servOffsetRef.current += hw; servTargetRef.current += hw; }
        while (servOffsetRef.current > 0) { servOffsetRef.current -= hw; servTargetRef.current -= hw; }
      }
      track.style.transform = `translateX(${servOffsetRef.current}px)`;
      servFrameRef.current = requestAnimationFrame(tick);
    };
    servFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(servFrameRef.current);
  }, [loading, servicesView]);

  useEffect(() => {
    if (loading) return;
    const track = prodTrackRef.current;
    if (!track) return;
    let last = 0;
    prodOffsetRef.current = 0;
    prodTargetRef.current = 0;
    const tick = (time: number) => {
      if (!last) last = time;
      const dt = time - last;
      last = time;
      if (!carouselPausedRef.current) {
        prodTargetRef.current += 0.5 * (dt / 16);
      }
      const diff = prodTargetRef.current - prodOffsetRef.current;
      prodOffsetRef.current += diff * Math.min(1, 0.08 * (dt / 16));
      const hw = track.scrollWidth / 2;
      if (hw > 0) {
        while (prodOffsetRef.current >= 0) { prodOffsetRef.current -= hw; prodTargetRef.current -= hw; }
        while (prodOffsetRef.current < -hw) { prodOffsetRef.current += hw; prodTargetRef.current += hw; }
      }
      track.style.transform = `translateX(${prodOffsetRef.current}px)`;
      prodFrameRef.current = requestAnimationFrame(tick);
    };
    prodFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(prodFrameRef.current);
  }, [loading]);

  const lenisRef = useRef<Lenis | null>(null);
  const heroGalleryRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  /** Título + CTAs del hero: solo montados dentro de la primera sección (menos trabajo de render al bajar). */
  const [heroCopyMounted, setHeroCopyMounted] = useState(true);

  const applyHeroParallax = useCallback((y: number) => {
    const el = heroCopyRef.current;
    if (!el) return;
    const opacity = Math.max(0, 1 - y / 600);
    const ty = (1 - opacity) * 40;
    el.style.opacity = String(opacity);
    el.style.transform = `translate3d(0, ${ty}px, 0)`;
  }, []);

  // Smooth scroll with Lenis + hero parallax sin re-renders de React en cada frame
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 0.8,
      lerp: 0.18,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    let lastScrolled = false;
    let lastInHero = true;

    const applyHeroFromScroll = (y: number) => {
      const nextScrolled = y > 50;
      if (nextScrolled !== lastScrolled) {
        lastScrolled = nextScrolled;
        setScrolled(nextScrolled);
      }

      const heroH = heroSectionRef.current?.offsetHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800);
      const inHero = y < heroH;
      if (inHero !== lastInHero) {
        lastInHero = inHero;
        setHeroCopyMounted(inHero);
      }

      if (inHero) applyHeroParallax(y);
    };

    const unsub = lenis.on('scroll', (l) => applyHeroFromScroll(l.scroll));
    applyHeroFromScroll(lenis.scroll);

    return () => {
      unsub();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [applyHeroParallax]);

  // Al volver arriba el ref se crea de nuevo: aplicar parallax al scroll actual sin esperar otro evento
  useLayoutEffect(() => {
    if (!heroCopyMounted) return;
    const y = lenisRef.current?.scroll ?? 0;
    applyHeroParallax(y);
  }, [heroCopyMounted, applyHeroParallax]);

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
    carouselPausedRef.current = true;

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
    carouselPausedRef.current = open;
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
    servOffsetRef.current = 0;
  }, [servicesView]);

  return (
    <div className="min-h-screen bg-black text-white font-body landing-page-container" style={{ overflowX: 'clip' }}>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 backdrop-blur-md ${scrolled ? 'bg-black/80 border-b border-white/5 py-4' : 'bg-black/20 py-6'}`}>
        <div className="content-max-width flex justify-between items-center">
          <div className="flex items-center gap-8 sm:gap-12 lg:gap-16">
            <button
              onClick={() => scrollToSection('inicio')}
             
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
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={onRequestDashboard}
                  className="nav-link-hover text-base font-semibold uppercase tracking-wide relative group py-1 transition-all duration-300"
                >
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
                </Link>
                <button
                  onClick={logout}
                  className="nav-link-hover text-base font-semibold uppercase tracking-wide relative group py-1 transition-all duration-300 flex items-center gap-2"
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

      {/* Hero Section — Video Background */}
      <header id="inicio" ref={heroSectionRef} className="hero-video-section">
        {/* Capa 1: Local video background + fallback image */}
        <div className={`hero-video-container ${heroVideoReady ? 'video-ready' : ''}`}>
          <img src={imgTeam} alt="" className="hero-video-fallback" loading="eager" aria-hidden="true" />
          <video
            className="hero-bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={imgTeam}
            disablePictureInPicture
            onLoadedData={() => setHeroVideoReady(true)}
            onCanPlay={() => setHeroVideoReady(true)}
            aria-hidden="true"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>

        {/* Capa 2: Overlay oscuro con gradiente */}
        <div className="hero-video-overlay" />

        {/* Capa 3: Patrón diagonal (scanlines) — textura premium */}
        <div className="hero-video-pattern" />

        {/* Capa 4: Contenido central (sin reveal-item: visible al instante; se desmonta al salir del hero) */}
        <div className="hero-video-content">
          {heroCopyMounted ? (
            <div ref={heroCopyRef} className="hero-video-copy">
              <h1 className="hero-main-title font-title text-gradient">MANITO</h1>
              <span className="hero-bg-text font-title">BARBERSHOP</span>
              <p className="hero-services-text">CORTE · BARBA · CEJAS · ESTILO MASCULINO</p>
              <p className="hero-tagline">ESTILO, ELEGANCIA Y PROFESIONALISMO</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={() => scrollToSection('nosotros')}
                  className="hero-cta-button"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(216, 176, 129, 0.5)' }}
                >
                  Conócenos
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('servicios')}
                  className="hero-cta-button"
                >
                  Lo que ofrecemos
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>
        {/* Black transition line */}
        <div className="bg-black" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d8b081]/20 to-transparent" />
        </div>

        {/* Gallery Mosaic */}
        <div
          className="bg-black px-8 sm:px-14 lg:px-24 xl:px-32 2xl:px-40"
          style={{ paddingBottom: '0' }}
        >
          {/* Título de sección */}
          <div className="text-center mb-10 reveal-item gallery-title-block">
            <div className="gallery-section-heading">
              <h2 className="section-title-fill section-title-fill--pair font-bold font-title tracking-tight leading-none text-gradient uppercase">
                Nuestro trabajo
              </h2>
              <span className="gallery-heading-separator" aria-hidden="true" />
              <span className="instagram-gallery-script text-gradient" translate="no">
                Instagram
              </span>
            </div>
            <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
              El arte de la barbería reflejado en cada detalle
            </p>
          </div>

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

            let galleryItems: GalleryItem[] = [];

            if (instagramFeed && instagramFeed.length > 0) {
              // Feed oficial de Instagram — conservar metadatos completos
              galleryItems = instagramFeed.map((item: InstagramMedia) => ({
                url: item.media_url,
                caption: item.caption,
                permalink: item.permalink,
                media_type: item.media_type,
                id: item.id,
                // Para videos, el hook ya normalizó media_url al thumbnail; video_url tiene el original
                videoUrl: item.video_url,
              }));
            } else {
              // Fallback a imágenes de base de datos (sin metadatos de IG)
              paquetes.forEach((p: any) => {
                const img = p.imagen || p.imagenUrl;
                if (img && typeof img === 'string' && img.startsWith('http')) galleryItems.push({ url: img });
              });
              servicios.forEach((s: any) => {
                if (s.imagen && typeof s.imagen === 'string' && s.imagen.startsWith('http')) galleryItems.push({ url: s.imagen });
              });
              productos.forEach((p: any) => {
                if (p.imagenProduc && typeof p.imagenProduc === 'string' && p.imagenProduc.startsWith('http')) galleryItems.push({ url: p.imagenProduc });
              });
            }

            // Asegurar un llenado mínimo para que el grid mosaico funcione idealmente
            const minDesiredCount = instagramFeed.length > 0 ? instagramFeed.length : 15;
            while (galleryItems.length < minDesiredCount || galleryItems.length % 3 !== 0) {
              galleryItems.push({ url: fallbackImages[galleryItems.length % fallbackImages.length] });
            }

            // Group into sets of 3: [Large, Small1, Small2]
            const sets: GalleryItem[][] = [];
            for (let i = 0; i < galleryItems.length; i += 3) {
              const set = galleryItems.slice(i, i + 3);
              while (set.length < 3) set.push({ url: fallbackImages[set.length % fallbackImages.length] });
              sets.push(set);
            }

            // Guardar lista para navegación en modal (sin duplicados)
            galleryItemsListRef.current = galleryItems;

            const allSets = [...sets, ...sets]; // Duplicate sets for loop

            const scrollGallery = (direction: number) => {
              const el = heroGalleryRef.current;
              if (!el) return;
              const scrollAmount = 800; // Scroll multiple columns
              const newPos = el.scrollLeft + direction * scrollAmount;

              const midpoint = el.scrollWidth / 2;
              if (direction > 0 && newPos >= midpoint) {
                el.scrollLeft = newPos - midpoint;
                el.scrollTo({ left: el.scrollLeft + scrollAmount, behavior: 'smooth' });
              } else if (direction < 0 && newPos <= 0) {
                el.scrollLeft = midpoint + newPos;
                el.scrollTo({ left: el.scrollLeft - scrollAmount, behavior: 'smooth' });
              } else {
                el.scrollTo({ left: newPos, behavior: 'smooth' });
              }
            };

            return (
              <div className="flex items-stretch gap-8 sm:gap-10 md:gap-14 lg:gap-16">
                {/* Columna lateral: hueco + botón circular blanco (mismo tamaño que antes) */}
                <div className="flex shrink-0 items-center justify-center self-center min-w-[3rem] sm:min-w-[4rem] md:min-w-[4.5rem] px-1 sm:px-2">
                  <button
                    type="button"
                    onClick={() => scrollGallery(-1)}
                    aria-label="Ver imágenes anteriores"
                    className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>

                <div className="hero-gallery-carousel hero-gallery-carousel--mosaic relative flex-1 min-w-0">
                  {/* Mosaic gallery row (capa base) */}
                  <div
                    ref={heroGalleryRef}
                    className="relative z-[1] flex gallery-scroll"
                    style={{ height: '380px', gap: '3px', overflowX: 'auto', scrollBehavior: 'auto' }}
                  >
                    {allSets.map((set, si) => (
                      <div key={`hero-set-${si}`} className="flex shrink-0 h-full" style={{ gap: '3px' }}>
                        {/* Large Image Column */}
                        <GalleryCell
                          item={set[0]}
                          style={{ width: '300px', height: '100%', flexShrink: 0 }}
                          onMouseDown={handleGalleryMouseDown}
                          onClick={(e) => handleGalleryClick(set[0], e)}
                        />

                        {/* Small Images Column (Stacked) */}
                        <div className="flex flex-col shrink-0 h-full" style={{ width: '210px', gap: '3px' }}>
                          <GalleryCell
                            item={set[1]}
                            style={{ flex: '1 1 0%' }}
                            onMouseDown={handleGalleryMouseDown}
                            onClick={(e) => handleGalleryClick(set[1], e)}
                          />
                          <GalleryCell
                            item={set[2]}
                            style={{ flex: '1 1 0%' }}
                            onMouseDown={handleGalleryMouseDown}
                            onClick={(e) => handleGalleryClick(set[2], e)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Luz desde los bordes hacia el centro (recortada por .hero-gallery-carousel) */}
                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--left" aria-hidden />
                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--right" aria-hidden />

                  {/* Fade hacia el centro; bordes = paredes junto a las flechas (sin padding en el carrusel) */}
                  <div className="hero-gallery-fade-in hero-gallery-fade-in--left" aria-hidden />
                  <div className="hero-gallery-fade-in hero-gallery-fade-in--right" aria-hidden />
                </div>

                <div className="flex shrink-0 items-center justify-center self-center min-w-[3rem] sm:min-w-[4rem] md:min-w-[4.5rem] px-1 sm:px-2">
                  <button
                    type="button"
                    onClick={() => scrollGallery(1)}
                    aria-label="Ver más imágenes"
                    className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
        
        {/* Fade to Nosotros */}
        <div style={{ background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)', paddingTop: '4rem', paddingBottom: '4rem', position: 'relative', zIndex: 10, marginTop: '-2px', marginBottom: '-2px' }}>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d8b081]/20 to-transparent" />
        </div>
      </div>{/* end of Hero + Gallery wrapper */}

      {/* Nosotros — scrolls naturally; zIndex:1 lets following sections (zIndex:2) slide over it */}
      <div id="nosotros" style={{ position: 'relative', zIndex: 1 }}>
        <section
          className="nosotros-section relative"
          style={{
            paddingTop: '1rem',
            /* Más aire bajo la CTA para que quede sobre el gradiente de Nosotros (el supertítulo siguiente tiene z-2 y marginTop negativo) */
            paddingBottom: 'clamp(8rem, 13vw, 12rem)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-[#d8b081]/5 blur-[100px] animate-float-slow" />
            <div className="absolute bottom-20 left-[5%] w-96 h-96 rounded-full bg-[#d8b081]/3 blur-[120px]" style={{ animationDelay: '3s' }} />
          </div>

        <div className="content-max-width relative z-10">
          {/* Título de sección */}
          <div className="text-center mb-8 reveal-item">
            <h2 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase" style={{ paddingTop: '1rem' }}>
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
                const nosotrosItems: GalleryItem[] = [
                  ...servicios.filter((s: any) => s.imagen?.startsWith('http')).map((s: any) => ({ url: s.imagen })),
                  ...paquetes.filter((p: any) => (p.imagen || p.imagenUrl)?.startsWith('http')).map((p: any) => ({ url: p.imagen || p.imagenUrl })),
                  ...productos.filter((p: any) => p.imagenProduc?.startsWith('http')).map((p: any) => ({ url: p.imagenProduc })),
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
                while (nosotrosItems.length < 9) {
                  nosotrosItems.push({ url: fallbacks[nosotrosItems.length % fallbacks.length] });
                }

                const totalPages = Math.ceil(nosotrosItems.length / 3);
                const pageIndex = nosotrosSlide % totalPages;

                // Build all page sets
                const pages: GalleryItem[][] = [];
                for (let p = 0; p < totalPages; p++) {
                  const set = nosotrosItems.slice(p * 3, p * 3 + 3);
                  while (set.length < 3) set.push(nosotrosItems[set.length % nosotrosItems.length]);
                  pages.push(set);
                }

                const nosotrosMosaicGap = 3;

                return (
                  <div className="min-w-0">
                    <div className="flex items-stretch gap-6 sm:gap-8 md:gap-10 lg:gap-12">
                      <div className="flex shrink-0 items-center justify-center self-center min-w-[2.75rem] sm:min-w-[3.5rem] md:min-w-[4rem] px-0.5 sm:px-1">
                        <button
                          type="button"
                          onClick={() => setNosotrosSlide((prev) => (prev - 1 + totalPages) % totalPages)}
                          aria-label="Página anterior de la galería"
                          className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="hero-gallery-carousel hero-gallery-carousel--mosaic hero-gallery-carousel--nosotros relative flex-1 min-w-0">
                        <div
                          className="nosotros-gallery-mosaic-viewport relative z-[1] overflow-hidden"
                          style={{ height: '380px' }}
                        >
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
                              <div
                                key={pi}
                                className="h-full shrink-0 min-w-0"
                                style={{ width: `${100 / totalPages}%` }}
                              >
                                <div
                                  className="h-full w-full min-w-0"
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 300fr) minmax(0, 210fr)',
                                    gridTemplateRows: '1fr 1fr',
                                    gap: nosotrosMosaicGap,
                                  }}
                                >
                                  <GalleryCell
                                    item={set[0]}
                                    style={{ gridRow: '1 / 3', minHeight: 0 }}
                                    onClick={() => setSelectedGalleryPost(set[0])}
                                  />
                                  <GalleryCell
                                    item={set[1]}
                                    style={{ minHeight: 0 }}
                                    onClick={() => setSelectedGalleryPost(set[1])}
                                  />
                                  <GalleryCell
                                    item={set[2]}
                                    style={{ minHeight: 0 }}
                                    onClick={() => setSelectedGalleryPost(set[2])}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="hero-gallery-wall-glow hero-gallery-wall-glow--left" aria-hidden />
                        <div className="hero-gallery-wall-glow hero-gallery-wall-glow--right" aria-hidden />
                        <div className="hero-gallery-fade-in hero-gallery-fade-in--left" aria-hidden />
                        <div className="hero-gallery-fade-in hero-gallery-fade-in--right" aria-hidden />
                      </div>

                      <div className="flex shrink-0 items-center justify-center self-center min-w-[2.75rem] sm:min-w-[3.5rem] md:min-w-[4rem] px-0.5 sm:px-1">
                        <button
                          type="button"
                          onClick={() => setNosotrosSlide((prev) => (prev + 1) % totalPages)}
                          aria-label="Página siguiente de la galería"
                          className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-center gap-2 mt-4">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNosotrosSlide(i)}
                          aria-label={`Ir a la página ${i + 1} de la galería`}
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
                className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#d8b081] text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-[#e8c091] hover:scale-105 transition-all duration-300 shrink-0 shadow-[0_4px_20px_rgba(216,176,129,0.25)]"
              >
                Ver servicios <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        </section>
      </div>

      {/* Supertítulo — fondo barbería a todo el ancho (sin foto equipo) */}
      <div
        className="relative flex items-center justify-center overflow-hidden bg-black"
        style={{ zIndex: 2, minHeight: 'clamp(200px, 28vh, 280px)', padding: '2rem 0', marginTop: '-2rem' }}
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black">
            <img
              src={ofrecemosHeroBg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover animate-slow-zoom opacity-50 grayscale pointer-events-none"
              style={{ filter: 'contrast(1.12)', objectPosition: 'center center' }}
              draggable={false}
            />
          </div>
          {/* Overlay oscuro uniforme sobre la foto */}
          <div
            className="absolute inset-0 bg-black/55 pointer-events-none"
            aria-hidden
          />
          {/* Fade borde superior — fundido hacia la sección anterior */}
          <div
            className="absolute inset-x-0 top-0 h-[min(45%,10rem)] pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.72) 28%, rgba(0,0,0,0.28) 62%, transparent 100%)',
            }}
            aria-hidden
          />
          {/* Fade borde inferior — fundido hacia Servicios */}
          <div
            className="absolute inset-x-0 bottom-0 h-[min(45%,10rem)] pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.72) 28%, rgba(0,0,0,0.28) 62%, transparent 100%)',
            }}
            aria-hidden
          />
        </div>

        <div className="content-max-width text-center reveal-item relative z-10 px-4">
          <div className="supertitle-wrapper">
            <span className="supertitle-line opacity-70" />
            <h2 className="section-supertitle font-bold font-title tracking-tight leading-none text-white drop-shadow-[0_4px_30px_rgba(0,0,0,1)] uppercase">
              Lo que ofrecemos
            </h2>
            <span className="supertitle-line opacity-70" />
          </div>
          <p className="text-[#f2d6b3] max-w-xl mx-auto text-lg sm:text-xl font-medium leading-relaxed italic mt-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            "La calidad es el único estándar que no admite compromisos."
          </p>
        </div>
      </div>

      {/* Fade from Supertitle to Servicios */}
      <div style={{ background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)', paddingTop: '4rem', paddingBottom: '4rem', position: 'relative', zIndex: 10, marginTop: '-2px', marginBottom: '-2px' }}>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d8b081]/20 to-transparent" />
      </div>

      {/* Servicios Section */}
      <section id="servicios" className="pb-8 pt-0" style={{ backgroundColor: '#0a0a0a', position: 'relative', zIndex: 2 }}>
        <div className="content-max-width relative z-10">
          <div className="text-center mb-10 reveal-item">

            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase" style={{ paddingTop: '1rem', marginBottom: '1rem' }}>
              Servicios
            </h3>
            <div className="mt-8 mb-10 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setServicesView('servicios')}
                data-selected={servicesView === 'servicios'}
                className="min-w-[210px] px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] bg-transparent text-[#d8b081] transition-all duration-300 shadow-lg gold-hover-transition"
              >
                Individuales
              </button>
              <button
                type="button"
                onClick={() => setServicesView('paquetes')}
                data-selected={servicesView === 'paquetes'}
                className="min-w-[210px] px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-xl border-2 border-[#d8b081] bg-transparent text-[#d8b081] transition-all duration-300 shadow-lg gold-hover-transition"
              >
                Paquetes
              </button>
            </div>
          </div>
        </div>

        {/* Carousel de Servicios — mismo layout que “Nuestro trabajo” (padding, flechas laterales, luz + fade) */}
        <div className="px-8 sm:px-14 lg:px-24 xl:px-32 2xl:px-40">
          <div className="flex items-stretch gap-8 sm:gap-10 md:gap-14 lg:gap-16">
            <div className="flex shrink-0 items-center justify-center self-center min-w-[3rem] sm:min-w-[4rem] md:min-w-[4.5rem] px-1 sm:px-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => nudgeCarousel(servTargetRef, 800)}
                aria-label="Anterior servicios"
                className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="hero-gallery-carousel hero-gallery-carousel--cards relative flex-1 min-w-0">
              <div className="hero-gallery-track-wrap">
                {loading ? (
                  <div className="flex gap-6 w-full overflow-hidden" style={{ marginBottom: '2rem' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div
                        key={i}
                        className="shrink-0 rounded-2xl overflow-hidden border border-[#d8b081]/10 bg-[#141414]"
                        style={{ width: '380px', minWidth: '380px', maxWidth: '380px', animationDelay: `${i * 150}ms` }}
                      >
                        <div className="relative h-[240px] bg-[#1a1a1a] overflow-hidden">
                          <div className="absolute inset-0 skeleton-shimmer-gold" />
                          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#141414] to-transparent" />
                          <div className="absolute top-4 right-4 w-20 h-8 rounded-xl bg-[#d8b081]/5 border border-[#d8b081]/10" />
                        </div>
                        <div className="px-6 pt-5 pb-6 space-y-4">
                          <div className="w-16 h-2.5 rounded-full bg-[#d8b081]/8 skeleton-shimmer-gold" />
                          <div className="flex items-baseline justify-between">
                            <div className="w-32 h-5 rounded-md bg-[#d8b081]/10 skeleton-shimmer-gold" />
                            <div className="w-20 h-5 rounded-md bg-[#d8b081]/15 skeleton-shimmer-gold" />
                          </div>
                          <div className="space-y-2">
                            <div className="w-full h-3 rounded-full bg-[#d8b081]/6 skeleton-shimmer-gold" />
                            <div className="w-3/4 h-3 rounded-full bg-[#d8b081]/5 skeleton-shimmer-gold" />
                          </div>
                          <div className="w-full h-12 rounded-xl border-2 border-[#d8b081]/15 bg-[#d8b081]/5 skeleton-shimmer-gold" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    ref={servTrackRef}
                    className="relative flex gap-6"
                    style={{ width: 'max-content', willChange: 'transform', marginBottom: '2rem' }}
                  >
                    {[...activeServiceItems, ...activeServiceItems].map((servicio, idx) => (
                      <div key={`srv-${idx}`} className="shrink-0 group" style={{ width: '380px', minWidth: '380px', maxWidth: '380px' }}>
                        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover h-full">
                          <div className="relative overflow-hidden bg-[#111] cursor-pointer" style={{ height: '240px' }} onClick={() => handleOpenDetail(servicio, 'servicio')}>
                            <img
                              loading="lazy"
                              src={servicio.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600'}
                              alt={servicio.nombre}
                              className="w-full h-full object-cover carousel-card-img"
                              draggable={false}
                              onDragStart={(e) => e.preventDefault()}
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all duration-500 pointer-events-none" />
                          </div>
                          <div className="px-6 pt-5 pb-6">
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-gray-500 block mb-2">
                              {servicio.type === 'paquete' ? 'Paquete' : 'Servicio'}
                            </span>
                            <div className="flex items-baseline justify-between mb-3">
                              <h3 className="text-lg font-black font-title uppercase tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{servicio.nombre}</h3>
                              <span className="text-xl font-black text-[#d8b081] ml-3">${formatCurrency(servicio.precio)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 mb-3">
                              <Clock className="w-3.5 h-3.5 text-[#d8b081]" />
                              <span className="text-xs font-bold uppercase tracking-widest">{servicio.duracion} min</span>
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
              {!loading && (
                <>
                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--left" aria-hidden />
                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--right" aria-hidden />
                  <div className="hero-gallery-fade-in hero-gallery-fade-in--left" aria-hidden />
                  <div className="hero-gallery-fade-in hero-gallery-fade-in--right" aria-hidden />
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-center self-center min-w-[3rem] sm:min-w-[4rem] md:min-w-[4.5rem] px-1 sm:px-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => nudgeCarousel(servTargetRef, -800)}
                aria-label="Siguiente servicios"
                className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Divider Servicios → Productos */}
      <div style={{ background: 'linear-gradient(to bottom, #0a0a0a 0%, #050505 50%, #0d0d0d 100%)', padding: '4rem 0', position: 'relative', zIndex: 10, marginTop: '-2px', marginBottom: '-2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '75%', height: '3px', borderRadius: '2px', background: 'linear-gradient(90deg, transparent, #d8b081, transparent)' }} />
      </div>

      {/* Productos Section */}
      <section id="productos" className="pb-0 pt-0" style={{ position: 'relative', zIndex: 2, backgroundColor: '#0d0d0d' }}>
        <div className="content-max-width relative z-10">
          <div className="text-center mb-14 reveal-item">

            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase" style={{ paddingTop: '1rem' }}>
              Nuestra tienda fisica
            </h3>
            <p className="text-gray-400 max-w-xl mx-auto text-lg leading-relaxed  mb-2">Reserva el producto que deseas y nosotros lo tendremos listo para ti en tu próxima visita.</p>
          </div>
        </div>

        {/* Carousel de Productos — mismo layout que “Nuestro trabajo” */}
        <div className="px-8 sm:px-14 lg:px-24 xl:px-32 2xl:px-40 pb-8">
          <div className="flex items-stretch gap-8 sm:gap-10 md:gap-14 lg:gap-16 ">
            <div className="flex shrink-0 items-center justify-center self-center min-w-[3rem] sm:min-w-[4rem] md:min-w-[4.5rem] px-1 sm:px-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => nudgeCarousel(prodTargetRef, 800)}
                aria-label="Anterior productos"
                className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            <div className="hero-gallery-carousel hero-gallery-carousel--cards relative flex-1 min-w-0">
              <div className="hero-gallery-track-wrap">
                {loading ? (
                  <div className="flex gap-6 w-full overflow-hidden">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div
                        key={i}
                        className="shrink-0 rounded-2xl overflow-hidden border border-[#d8b081]/10 bg-[#141414]"
                        style={{ width: '380px', minWidth: '380px', maxWidth: '380px', animationDelay: `${i * 150}ms` }}
                      >
                        <div className="relative h-[240px] bg-[#1a1a1a] overflow-hidden">
                          <div className="absolute inset-0 skeleton-shimmer-gold" />
                          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#141414] to-transparent" />
                        </div>
                        <div className="px-6 pt-5 pb-6 space-y-4">
                          <div className="w-20 h-2.5 rounded-full bg-[#d8b081]/8 skeleton-shimmer-gold" />
                          <div className="flex items-baseline justify-between">
                            <div className="w-28 h-5 rounded-md bg-[#d8b081]/10 skeleton-shimmer-gold" />
                            <div className="w-20 h-5 rounded-md bg-[#d8b081]/15 skeleton-shimmer-gold" />
                          </div>
                          <div className="space-y-2">
                            <div className="w-full h-3 rounded-full bg-[#d8b081]/6 skeleton-shimmer-gold" />
                            <div className="w-2/3 h-3 rounded-full bg-[#d8b081]/5 skeleton-shimmer-gold" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div ref={prodTrackRef} className="relative flex gap-6" style={{ width: 'max-content', willChange: 'transform', marginBottom: '4rem' }}>
                    {[...productos, ...productos].map((producto, idx) => (
                      <div key={`prod-${idx}`} className="shrink-0 group" style={{ width: '380px', minWidth: '380px', maxWidth: '380px' }}>
                        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover h-full">
                          <div className="relative overflow-hidden bg-[#111] cursor-pointer" style={{ height: '240px' }} onClick={() => handleOpenDetail(producto, 'producto')}>
                            <img
                              loading="lazy"
                              src={producto.imagenProduc || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'}
                              alt={producto.nombre}
                              className="w-full h-full object-cover carousel-card-img"
                              draggable={false}
                              onDragStart={(e) => e.preventDefault()}
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all duration-500 pointer-events-none" />
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
              {!loading && (
                <>
                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--left" aria-hidden />
                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--right" aria-hidden />
                  <div className="hero-gallery-fade-in hero-gallery-fade-in--left" aria-hidden />
                  <div className="hero-gallery-fade-in hero-gallery-fade-in--right" aria-hidden />
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-center self-center min-w-[3rem] sm:min-w-[4rem] md:min-w-[4.5rem] px-1 sm:px-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => nudgeCarousel(prodTargetRef, -800)}
                aria-label="Siguiente productos"
                className="w-12 h-12 shrink-0 rounded-full bg-white text-black shadow-xl flex items-center justify-center hover:bg-gray-100 hover:scale-105 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Barberos / Equipo Section */}
      <section id="equipo" className="relative z-10 w-full overflow-hidden" style={{ background: 'linear-gradient(to bottom, #0d0d0d 0%, #000000 10%, #000000 90%, #080808 100%)', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="content-max-width relative z-10">
          <div className="text-center mb-12">
            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient uppercase">
              Nuestros barberos
            </h3>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto text-lg mb-4 leading-relaxed">Conoce a los artistas detrás de tu imagen. Nuestra dedicación se refleja en cada detalle.</p>
          </div>
          
          <div className="flex w-full max-w-[850px] mx-auto overflow-hidden" style={{ height: '480px', gap: '6px' }}>
            {[
              { nombre: 'Maicol', foto: imgMaicol, imageClass: 'barber-crop-default' },
              { nombre: 'Juan', foto: imgJuan, imageClass: 'barber-crop-juan' },
              { nombre: 'Edwin', foto: imgEdwin, imageClass: 'barber-crop-edwin' },
              { nombre: 'Eduardo', foto: imgEduardo, imageClass: 'barber-crop-eduardo' },
              { nombre: 'Christian', foto: imgChristian, imageClass: 'barber-crop-christian' },
            ].map((barbero, idx) => (
              <div 
                key={idx} 
                className="relative flex flex-col bg-[#fdfdfd] rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group"
                style={{ flex: '1' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.flex = '2';
                  const btn = e.currentTarget.querySelector('button') as HTMLButtonElement | null;
                  if (btn) { btn.style.backgroundColor = '#d8b081'; btn.style.color = '#000'; }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.flex = '1';
                  const btn = e.currentTarget.querySelector('button') as HTMLButtonElement | null;
                  if (btn) { btn.style.backgroundColor = ''; btn.style.color = ''; }
                }}
              >
                {/* Nombre arriba en negro con letra elegante */}
                <div className="py-5 text-center px-2 flex flex-col justify-center items-center bg-[#fdfdfd] z-10">
                  <h3 className="text-2xl md:text-3xl font-black font-title uppercase tracking-tight text-[#111111] group-hover:text-[#d8b081] transition-colors duration-300">
                    {barbero.nombre}
                  </h3>
                </div>

                {/* Imagen rellenando el espacio medio */}
                <div className="flex-1 w-full relative overflow-hidden bg-black">
                  <img
                    src={barbero.foto}
                    alt={barbero.nombre}
                    className={`barber-card-img w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 ${barbero.imageClass}`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all duration-500 pointer-events-none" />
                </div>

                {/* Botón de agendar directo sin contenedor */}
                <button
                  className="relative z-10 w-full py-6 font-bold uppercase tracking-[0.2em] text-xs transition-all duration-300 outline-none border-t border-black/5 bg-transparent text-[#111111] hover:bg-[#d8b081] hover:text-black cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAuthenticated) {
                      onSelectReservation?.({ type: 'barbero', nombre: barbero.nombre });
                    } else {
                      onRequestLogin?.();
                    }
                  }}
                >
                  Agendar Cita
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Datos Clave Section — moved from Nosotros */}
      <section className="pt-10 pb-20" style={{ position: 'relative', zIndex: 2, backgroundColor: '#080808' }}>
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
        <DialogContent
          className="detail-modal-content border border-[#d8b081]/15 !bg-[#0e0e13] !p-0 !gap-0 text-white overflow-hidden rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(216,176,129,0.08)]"
          style={{
            width: 'min(96vw, 750px)',
            height: 'min(90vh, 720px)',
            maxWidth: '750px',
            maxHeight: '90vh',
          }}
        >

          {/* ─── Skeleton / Loading state ─── */}
          {isDetailLoading && !selectedDetailItem?.nombre ? (
            <div className="h-full p-8 space-y-4">
              <div className="w-full h-[220px] rounded-2xl bg-white/5 skeleton-shimmer-gold" />
              <div className="w-2/3 h-6 rounded-lg bg-white/5 skeleton-shimmer-gold" />
              <div className="w-full h-4 rounded-full bg-white/5 skeleton-shimmer-gold" />
              <div className="w-full h-4 rounded-full bg-white/5 skeleton-shimmer-gold" />
              <div className="w-40 h-10 rounded-xl bg-[#d8b081]/10 skeleton-shimmer-gold" />
            </div>
          ) : selectedDetailItem && (
            <div className="h-full overflow-y-auto detail-modal-scroll">
              <div className="relative h-full" style={{ background: '#0a0a0a', padding: '1rem' }}>

                {/* Orbes difuminados dorados (estilo login) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.3 }}>
                  <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full" style={{ background: 'rgba(216,176,129,0.05)', filter: 'blur(120px)' }} />
                  <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full" style={{ background: 'rgba(216,176,129,0.03)', filter: 'blur(100px)' }} />
                </div>

                {/* Imagen principal */}
                <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '260px' }}>
                  <img
                    src={
                      selectedDetailItem.type === 'producto'
                        ? selectedDetailItem.imagenProduc || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600'
                        : selectedDetailItem.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600'
                    }
                    alt={selectedDetailItem.nombre}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0a0a0a 0%, rgba(10,10,10,0.4) 50%, transparent 100%)' }} />
                </div>

                {/* Contenido */}
                <div className="relative" style={{ marginTop: '-3rem', padding: '0 2rem 0' }}>

                  {/* Nombre */}
                  <h3 className="font-black font-title uppercase tracking-tight text-white leading-tight mb-2" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)' }}>
                    {selectedDetailItem.nombre}
                  </h3>

                  {/* Precio + duración + ahorro */}
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <span className="text-2xl font-black font-title" style={{ background: 'linear-gradient(135deg, #fff 0%, #d8b081 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      ${formatCurrency(selectedDetailItem.precio)}
                    </span>
                    {selectedDetailItem.type === 'paquete' && Number(selectedDetailItem.precioOriginal) > Number(selectedDetailItem.precio) && (
                      <>
                        <span className="text-sm text-gray-500 line-through">${formatCurrency(selectedDetailItem.precioOriginal)}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>
                          Ahorras ${formatCurrency(Number(selectedDetailItem.precioOriginal) - Number(selectedDetailItem.precio))}
                        </span>
                      </>
                    )}
                    {selectedDetailItem.type !== 'producto' && selectedDetailItem.duracion && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Clock className="w-3.5 h-3.5 text-[#d8b081]" />
                        {selectedDetailItem.duracion} min
                      </span>
                    )}
                  </div>

                  {/* Separador */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(216,176,129,0.4))' }} />
                    <Scissors className="w-4 h-4" style={{ color: 'rgba(216,176,129,0.5)' }} />
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(216,176,129,0.4))' }} />
                  </div>

                  {/* Descripción */}
                  <p className="text-sm leading-relaxed text-gray-300 mb-4">
                    {selectedDetailItem.descripcion || (
                      selectedDetailItem.type === 'producto'
                        ? 'Producto seleccionado para complementar tu estilo y rutina de cuidado personal.'
                        : 'Una propuesta premium para una experiencia cómoda, precisa y memorable.'
                    )}
                  </p>

                  {/* ── BLOQUE PRODUCTO ── */}
                  {selectedDetailItem.type === 'producto' && (
                    <>
                      <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-3" style={{ background: 'rgba(216,176,129,0.06)', border: '1px solid rgba(216,176,129,0.15)' }}>
                        <MapPin className="w-4 h-4 shrink-0" style={{ color: '#d8b081' }} />
                        <div>
                          <p className="text-xs font-bold text-white">Solo disponible en tienda física</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">No realizamos envíos. Retira tu compra directamente en nuestra barbería.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3.5 mb-6">
                        {[
                          { icon: <CheckCircle className="w-4 h-4" />, text: 'Producto original con calidad garantizada' },
                          { icon: <User className="w-4 h-4" />, text: 'Recomendado por nuestros barberos especializados' },
                          { icon: <Eye className="w-4 h-4" />, text: 'Puedes verlo y consultarlo en persona antes de comprar' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                            <span className="shrink-0" style={{ color: '#d8b081' }}>{item.icon}</span>
                            {item.text}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ── BLOQUE SERVICIO ── */}
                  {selectedDetailItem.type === 'servicio' && (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">¿Qué incluye?</p>
                      <div className="grid grid-cols-1 gap-3.5 mb-4">
                        {[
                          { icon: <CheckCircle className="w-4 h-4" />, text: 'Atención personalizada por un barbero especialista' },
                          { icon: <User className="w-4 h-4" />, text: 'Herramientas y productos profesionales incluidos' },
                          { icon: <Scissors className="w-4 h-4" />, text: 'Espacio premium con ambiente cómodo y exclusivo' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                            <span className="shrink-0" style={{ color: '#d8b081' }}>{item.icon}</span>
                            {item.text}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(216,176,129,0.06)', border: '1px solid rgba(216,176,129,0.12)' }}>
                        <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#d8b081' }} />
                        <div>
                          <p className="text-xs font-bold text-white">Llega 5 minutos antes</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Si necesitas cancelar o reprogramar, avísanos con al menos 2 horas de anticipación.</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── BLOQUE PAQUETE ── */}
                  {selectedDetailItem.type === 'paquete' && (
                    <>
                      {selectedDetailItem.servicios && selectedDetailItem.servicios.length > 0 && (
                        <div className="rounded-xl px-4 py-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5">Servicios incluidos</p>
                          <div className="space-y-2">
                            {selectedDetailItem.servicios.map((s: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5 text-gray-300">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#d8b081' }} />
                                  {s.nombre || s}
                                </div>
                                {s.duracion && <span className="text-gray-500">{s.duracion} min</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(216,176,129,0.06)', border: '1px solid rgba(216,176,129,0.12)' }}>
                        <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#d8b081' }} />
                        <div>
                          <p className="text-xs font-bold text-white">Todo en una sola visita</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Los servicios del paquete se realizan de forma seguida. Reserva el bloque completo al agendar.</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Botones */}
                  <div className="flex items-center gap-3 pb-4">
                    {selectedDetailItem.type === 'producto' ? (
                      <button
                        type="button"
                        onClick={() => handleDetailDialogChange(false)}
                        className="h-12 px-8 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)]"
                        style={{ background: '#d8b081', color: '#000' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e8c091'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#d8b081'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        Seguir Explorando
                      </button>
                    ) : (
                      <>
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
                          className="h-12 px-8 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)]"
                          style={{ background: '#d8b081', color: '#000' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#e8c091'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#d8b081'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          Agendar Ahora
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDetailDialogChange(false)}
                          className="h-12 px-6 rounded-xl border text-sm font-semibold uppercase tracking-wider transition-all duration-300"
                          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#9ca3af' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e5e7eb'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#9ca3af'; }}
                        >
                          Cerrar
                        </button>
                      </>
                    )}
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


      {/* Modal de publicación de Instagram / galería */}
      <InstagramPostModal
        item={selectedGalleryPost}
        allItems={galleryItemsListRef.current}
        onClose={() => setSelectedGalleryPost(null)}
        onSelect={setSelectedGalleryPost}
      />
    </div>
  );
}
