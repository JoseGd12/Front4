import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, type ReactElement } from 'react';
import ReactDOM from 'react-dom';
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
  Instagram,
  X,
  RotateCcw,
  Download,
  Smartphone,
  Menu,
  Home,
  Image,
  LayoutGrid
} from 'lucide-react';
import { useCustomAlert } from '../../../shared/components/ui/custom-alert';
import { apiService } from '../../../shared/services/api';
import { formatDuracion } from '../../../shared/utils/dateUtils';
import { barberosService } from '../../administracion/services/barberosService';
import { horariosService } from '../../agendamiento/services/horariosService';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', fecha: '', hora: '', servicio: '' });

  // WhatsApp Chat Widget
  const [waChatOpen, setWaChatOpen] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waBarbers, setWaBarbers] = useState<{ nombre: string; foto: string | null; telefono: string; rol: string }[]>([]);

  useEffect(() => {
    const fetchWaBarbers = async () => {
      try {
        const [barbers, horarios] = await Promise.all([
          barberosService.getBarberos(),
          horariosService.getHorarios().catch(() => []),
        ]);

        const barberosConHorario = new Set(
          horarios.map(h => Number(h.barberoId))
        );

        const activeWithPhone = barbers
          .filter(b => {
            if (b.status !== 'active') return false;
            if (!b.telefono || b.telefono.trim() === '') return false;
            if (barberosConHorario.size > 0 && !barberosConHorario.has(Number(b.id))) return false;
            return true;
          })
          .map(b => {
            let foto: string | null = null;
            if (b.fotoPerfil && b.fotoPerfil.startsWith('http')) {
              foto = b.fotoPerfil;
            } else {
              const lowerName = b.nombre.toLowerCase();
              if (lowerName.includes('christian')) foto = imgChristian;
              else if (lowerName.includes('eduardo')) foto = imgEduardo;
              else if (lowerName.includes('edwin')) foto = imgEdwin;
              else if (lowerName.includes('juan')) foto = imgJuan;
              else if (lowerName.includes('maicol')) foto = imgMaicol;
            }

            let formattedPhone = b.telefono.replace(/\D/g, '');
            if (formattedPhone.length === 10) formattedPhone = '57' + formattedPhone;

            return {
              nombre: b.nombre,
              foto,
              telefono: formattedPhone,
              rol: b.especialidad || b.rol || 'Barbero'
            };
          });
        setWaBarbers(activeWithPhone);
      } catch (error) {
        console.error('Error fetching barbers for WA chat:', error);
      }
    };
    fetchWaBarbers();
  }, []);

  const [waSelectedBarber, setWaSelectedBarber] = useState(0);
  const waInputRef = useRef<HTMLInputElement>(null);

  const WaAvatar = ({ foto, nombre, size, border }: { foto: string | null; nombre: string; size: number; border: string }) =>
    foto ? (
      <img src={foto} alt={nombre} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border, flexShrink: 0 }} />
    ) : (
      <div style={{ width: size, height: size, borderRadius: '50%', border, flexShrink: 0, background: 'rgba(37,211,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#25D366', textTransform: 'uppercase' }}>
        {nombre.split(' ').map(w => w[0]).join('').slice(0, 2)}
      </div>
    );

  const handleWaSend = useCallback(() => {
    const barber = waBarbers[waSelectedBarber];
    if (!barber) return;
    const encodedMsg = encodeURIComponent(waMessage.trim() || `Hola ${barber.nombre}, me gustaría agendar una cita.`);
    window.open(`https://wa.me/${barber.telefono}?text=${encodedMsg}`, '_blank');
    setWaMessage('');
  }, [waSelectedBarber, waMessage, waBarbers]);


  const [servicios, setServicios] = useState<any[]>([]);
  const [paquetes, setPaquetes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesView, setServicesView] = useState<'servicios' | 'paquetes'>('servicios');
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  // Fondo único a todo el ancho para “Lo que ofrecemos” (barbería)
  const ofrecemosHeroBg =
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop';

  // Instagram feed for gallery
  const { feed: instagramFeed, loading: instagramLoading, error: instagramError } = useInstagramFeed(15);
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

  useEffect(() => {
    if (instagramLoading || instagramError) return;
    const track = heroGalleryRef.current;
    if (!track) return;
    let last = 0;
    galleryOffsetRef.current = 0;
    galleryTargetRef.current = 0;
    const tick = (time: number) => {
      if (!last) last = time;
      const dt = time - last;
      last = time;
      if (!carouselPausedRef.current) {
        galleryTargetRef.current -= 0.4 * (dt / 16);
      }
      const diff = galleryTargetRef.current - galleryOffsetRef.current;
      galleryOffsetRef.current += diff * Math.min(1, 0.08 * (dt / 16));
      const hw = track.scrollWidth / 2;
      if (hw > 0) {
        while (galleryOffsetRef.current <= -hw) { galleryOffsetRef.current += hw; galleryTargetRef.current += hw; }
        while (galleryOffsetRef.current > 0) { galleryOffsetRef.current -= hw; galleryTargetRef.current -= hw; }
      }
      track.style.transform = `translateX(${galleryOffsetRef.current}px)`;
      galleryFrameRef.current = requestAnimationFrame(tick);
    };
    galleryFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(galleryFrameRef.current);
  }, [instagramLoading, instagramError]);

  const lenisRef = useRef<Lenis | null>(null);
  const heroGalleryRef = useRef<HTMLDivElement>(null);
  const galleryOffsetRef = useRef(0);
  const galleryTargetRef = useRef(0);
  const galleryFrameRef = useRef<number>(0);
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
        const [serviciosAll, productosAll, paquetesAll] = await Promise.all([
          apiService.getServicios().catch(() => []),
          productoService.getProductos().catch(() => []),
          apiService.getPaquetes().catch(() => [])
        ]);

        const serviciosList = serviciosAll.filter((s: any) => s.estado !== false).map((s: any) => ({ ...s, type: 'servicio' }));
        const paquetesList = paquetesAll.filter((p: any) => p.activo !== false).map((p: any) => ({ ...p, type: 'paquete' }));
        setServicios(serviciosList);
        setPaquetes(paquetesList);
        setProductos(productosAll.filter((p: any) => p.activo !== false));
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
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('active');
        } else {
          e.target.classList.remove('active');
        }
      }),
      { threshold: 0.05, rootMargin: '50px 0px' }
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

  // Escape key + body scroll lock + Lenis pause while detail modal is open
  useEffect(() => {
    if (!isDetailDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleDetailDialogChange(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenisRef.current?.stop();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      lenisRef.current?.start();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isDetailDialogOpen]);

  const activeServiceItems = useMemo(
    () => (servicesView === 'servicios' ? servicios : paquetes),
    [servicesView, servicios, paquetes]
  );

  useEffect(() => {
    servOffsetRef.current = 0;
  }, [servicesView]);

  return (
    <div className="min-h-screen bg-black text-white font-body landing-page-container force-dark" style={{ overflowX: 'clip' }}>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[120] transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className="fixed top-0 left-0 h-full z-[130] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
        style={{
          width: '288px',
          backgroundColor: '#111111',
          boxShadow: mobileMenuOpen ? '4px 0 25px rgba(0,0,0,0.8)' : 'none',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
        aria-hidden={!mobileMenuOpen}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="w-10 h-10 rounded-full object-cover shadow-lg" />
            <div>
              <p className="text-white font-bold text-base leading-tight">MANITO</p>
              <p className="text-[#d8b081] text-xs font-semibold tracking-widest">BARBERSHOP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-md transition-colors hover:bg-white/10"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Navegación principal */}
          <div className="px-4 mb-2">
            <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 px-2 mb-2">Navegación</p>
            {[
              { id: 'inicio', label: 'Inicio', icon: Home },
              { id: 'nosotros', label: 'Nosotros', icon: Users },
              { id: 'servicios', label: 'Servicios', icon: Scissors },
              { id: 'productos', label: 'Productos', icon: Package },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { scrollToSection(item.id); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-[#d8b081] transition-colors"
                >
                  <Icon className="w-4 h-4 text-[#d8b081] shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Separador */}
          <div className="mx-6 my-3 h-px bg-white/5" />

          {/* Sección de cuenta */}
          <div className="px-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-gray-500 px-2 mb-2">Cuenta</p>
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => { onRequestDashboard?.(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-[#d8b081] transition-colors"
                >
                  <LayoutGrid className="w-4 h-4 text-[#d8b081] shrink-0" />
                  <span className="text-sm font-medium">Dashboard</span>
                </button>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">Cerrar sesión</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { onRequestLogin?.(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-[#d8b081] transition-colors"
                >
                  <User className="w-4 h-4 text-[#d8b081] shrink-0" />
                  <span className="text-sm font-medium">Ingresar</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onRequestRegister?.(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-gray-300 hover:bg-white/5 hover:text-[#d8b081] transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-[#d8b081] shrink-0" />
                  <span className="text-sm font-medium">Registrarse</span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Footer del drawer */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs text-gray-600 text-center">© 2025 Manito Barbershop</p>
        </div>
      </aside>

      {/* Navbar */}
      <nav
        className={`landing-nav fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'landing-nav--scrolled py-4' : 'py-6'}`}
      >
        <div className="content-max-width flex justify-between items-center">
          <div className="flex items-center gap-8 sm:gap-12 lg:gap-16">
            {/* Hamburger — solo en mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex md:hidden items-center justify-center p-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={() => scrollToSection('inicio')}
              className="flex items-center gap-4 transition-all duration-300 group"
            >
              <img src={LOGO_URL} alt="Logo" className="w-12 h-12 rounded-full object-cover shadow-lg" />
              <div className="text-3xl font-title font-bold tracking-tight landing-wordmark-text">Manito<span>Barbershop</span></div>
            </button>
            {/* Links de navegación — ocultos en mobile */}
            <div className="hidden md:flex items-center gap-8 sm:gap-12 lg:gap-16">
              {[
                { id: 'nosotros', label: 'Nosotros' },
                { id: 'servicios', label: 'Servicios' },
                { id: 'productos', label: 'Productos' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="landing-nav-link font-title text-lg py-1 relative group transition-all duration-300"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
                </button>
              ))}
            </div>
          </div>

          {/* Botones de auth — ocultos en mobile (están en el drawer) */}
          <div className="hidden md:flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={onRequestDashboard}
                  className="nav-link-hover text-base font-semibold tracking-wide relative group py-1 transition-all duration-300"
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
              <div className="flex items-center gap-6 lg:gap-8">
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="nav-link-hover landing-auth-btn text-base font-semibold tracking-wide relative group py-1 transition-all duration-300"
                >
                  Ingresar
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
                </button>
                <button
                  type="button"
                  onClick={onRequestRegister}
                  className="nav-link-hover landing-auth-btn text-base font-semibold tracking-wide relative group py-1 transition-all duration-300"
                >
                  Registrar
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#d8b081] group-hover:w-full transition-all duration-300" />
                </button>
              </div>
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
            const scrollGallery = (direction: number) => {
              galleryTargetRef.current += direction * -600;
            };

            const renderPlaceholderSets = (isError: boolean) =>
              Array.from({ length: 10 }, (_, i) => (
                <div key={`ph-${i}`} className="flex shrink-0 h-full" style={{ gap: '3px' }}>
                  <div
                    style={{ width: '300px', height: '100%', flexShrink: 0, position: 'relative', overflow: 'hidden', background: 'var(--gray-darker)' }}
                    className="flex items-center justify-center"
                  >
                    {isError
                      ? <span className="text-gray-500 text-xs text-center px-4">Error al cargar</span>
                      : <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                    }
                  </div>
                  <div className="flex flex-col shrink-0 h-full" style={{ width: '210px', gap: '3px' }}>
                    <div
                      style={{ flex: '1 1 0%', position: 'relative', overflow: 'hidden', background: 'var(--gray-darker)' }}
                      className="flex items-center justify-center"
                    >
                      {isError
                        ? <span className="text-gray-500 text-[10px]">Error</span>
                        : <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                      }
                    </div>
                    <div
                      style={{ flex: '1 1 0%', position: 'relative', overflow: 'hidden', background: 'var(--gray-darker)' }}
                      className="flex items-center justify-center"
                    >
                      {isError
                        ? <span className="text-gray-500 text-[10px]">Error</span>
                        : <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                      }
                    </div>
                  </div>
                </div>
              ));

            let innerContent: ReactElement[] = [];

            if (instagramLoading) {
              innerContent = renderPlaceholderSets(false);
            } else if (instagramError) {
              innerContent = renderPlaceholderSets(true);
            } else {
              const galleryItems: GalleryItem[] = instagramFeed.map((item: InstagramMedia) => ({
                url: item.media_url,
                caption: item.caption,
                permalink: item.permalink,
                media_type: item.media_type,
                id: item.id,
                videoUrl: item.video_url,
              }));

              while (galleryItems.length % 3 !== 0) {
                galleryItems.push(galleryItems[galleryItems.length - 1] ?? galleryItems[0]);
              }

              const sets: GalleryItem[][] = [];
              for (let i = 0; i < galleryItems.length; i += 3) {
                sets.push(galleryItems.slice(i, i + 3));
              }

              galleryItemsListRef.current = galleryItems;
              const allSets = [...sets, ...sets];

              innerContent = allSets.map((set, si) => (
                <div key={`hero-set-${si}`} className="flex shrink-0 h-full" style={{ gap: '3px' }}>
                  <GalleryCell
                    item={set[0]}
                    style={{ width: '300px', height: '100%', flexShrink: 0 }}
                    onMouseDown={handleGalleryMouseDown}
                    onClick={(e) => handleGalleryClick(set[0], e)}
                  />
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
              ));
            }

            return (
              <div className="flex items-stretch gap-8 sm:gap-10 md:gap-14 lg:gap-16">
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
                  <div
                    ref={heroGalleryRef}
                    className="gallery-scroll"
                    style={{ display: 'flex', gap: '3px', height: '380px' }}
                  >
                    {innerContent}
                  </div>

                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--left" aria-hidden />
                  <div className="hero-gallery-wall-glow hero-gallery-wall-glow--right" aria-hidden />
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
            paddingBottom: 'clamp(8rem, 13vw, 12rem)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-[#d8b081]/5 blur-[100px] animate-float-slow" />
            <div className="absolute bottom-20 left-[5%] w-96 h-96 rounded-full bg-[#d8b081]/3 blur-[120px]" style={{ animationDelay: '3s' }} />
          </div>

        <div className="content-max-width relative z-10">
          {/* Dos columnas con títulos independientes */}
          <div className="grid lg:grid-cols-2 gap-16 items-center" style={{ paddingTop: '1rem' }}>

            {/* Columna izquierda: Tarjetas de acciones */}
            <div className="reveal-item">
              <div className="mb-8 text-center">
                <h2 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient">
                  Qué puedes hacer
                </h2>
                <p className="text-gray-400 text-base leading-relaxed mt-4">
                  Todo lo que necesitas, al alcance de un clic
                </p>
              </div>
              <div className="flex flex-col" style={{ gap: '10px', maxWidth: '420px', margin: '0 auto' }}>
                {/* Card -- Gestión de Citas */}
                <button
                  onClick={() => { if (isAuthenticated) { onRequestDashboard?.(); } else { onRequestLogin?.(); } }}
                  className="flex items-center text-left hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                  style={{ background: 'rgba(216,176,129,0.04)', border: '1px solid rgba(216,176,129,0.12)', borderRadius: '14px', padding: '18px 20px', gap: '14px' }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(216,176,129,0.12)' }}>
                    <Calendar className="w-5 h-5" style={{ color: '#d8b081' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8e8' }}>Gestión de Citas</h3>
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>Agenda tu cita y revisa tu historial</p>
                  </div>
                  <span className="shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: 'rgba(216,176,129,0.6)', fontSize: '16px' }}>&rarr;</span>
                </button>

                {/* Card -- Catálogo */}
                <button
                  onClick={() => scrollToSection('servicios')}
                  className="flex items-center text-left hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                  style={{ background: 'rgba(216,176,129,0.04)', border: '1px solid rgba(216,176,129,0.12)', borderRadius: '14px', padding: '18px 20px', gap: '14px' }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(216,176,129,0.12)' }}>
                    <Scissors className="w-5 h-5" style={{ color: '#d8b081' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8e8' }}>Catálogo</h3>
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>Explora servicios y productos</p>
                  </div>
                  <span className="shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: 'rgba(216,176,129,0.6)', fontSize: '16px' }}>&rarr;</span>
                </button>

                {/* Card -- Mi Perfil */}
                <button
                  onClick={() => { if (isAuthenticated) { onRequestDashboard?.(); } else { onRequestLogin?.(); } }}
                  className="flex items-center text-left hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                  style={{ background: 'rgba(216,176,129,0.04)', border: '1px solid rgba(216,176,129,0.12)', borderRadius: '14px', padding: '18px 20px', gap: '14px' }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(216,176,129,0.12)' }}>
                    <User className="w-5 h-5" style={{ color: '#d8b081' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8e8' }}>Mi Perfil</h3>
                    <p style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>Gestiona tu cuenta y preferencias</p>
                  </div>
                  <span className="shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: 'rgba(216,176,129,0.6)', fontSize: '16px' }}>&rarr;</span>
                </button>
              </div>
            </div>

            {/* Columna derecha: esencia + stats */}
            <div className="reveal-item" style={{ transitionDelay: '0.15s' }}>
              <div className="mb-8 text-center">
                <h2 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient">
                  Nosotros
                </h2>
                <p className="text-gray-400 text-base leading-relaxed mt-4">
                  Más de 2 años transformando estilos en el corazón de Medellín
                </p>
              </div>
              <div className="space-y-6">
              {/* Card principal - Nuestra esencia */}
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl icon-float flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#d8b081]" />
                  </div>
                  <div>
                    <span className="text-[21px] uppercase tracking-[0.5em] text-[#d8b081] font-black block">Nuestra esencia</span>
                    <span className="text-xs text-gray-500">Desde abril 2023</span>
                  </div>
                </div>

                <p className="text-gray-200 text-base leading-relaxed mb-8" style={{ textAlign: 'justify' }}>
                  Somos una barbería ubicada en Medellín, dedicada al cuidado de la apariencia masculina.
                  Contamos con un equipo de
                  <span className="text-[#d8b081] font-black"> 6 colaboradores</span>,
                  entre ellos
                  <span className="text-[#d8b081] font-black"> 5 barberos.</span>.
                  Cada servicio combina técnica, criterio estilístico y atención 100% personalizada.
                </p>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-card rounded-2xl p-5 text-center">
                    <div className="w-10 h-10 rounded-xl icon-float flex items-center justify-center mx-auto mb-3">
                      <Users className="w-5 h-5 text-[#d8b081]" />
                    </div>
                    <div className="text-3xl font-black font-title text-white leading-none">5</div>
                    <div className="text-xs text-gray-400 mt-2 tracking-wider font-semibold">Barberos profesionales</div>
                  </div>
                  <div className="stat-card rounded-2xl p-5 text-center">
                    <div className="w-10 h-10 rounded-xl icon-float flex items-center justify-center mx-auto mb-3">
                      <Trophy className="w-5 h-5 text-[#d8b081]" />
                    </div>
                    <div className="text-3xl font-black font-title text-white leading-none">6</div>
                    <div className="text-xs text-gray-400 mt-2 tracking-wider font-semibold">Colaboradores en total</div>
                  </div>
                </div>
              </div>
              </div>
            </div>

          </div>

        </div>
        </section>
      </div>

      {/* Supertítulo — fondo barbería a todo el ancho (sin foto equipo) */}
      <div
        className="relative flex items-center justify-center overflow-hidden bg-black"
        style={{ zIndex: 2, minHeight: 'clamp(200px, 28vh, 280px)', padding: '0 0 2rem 0', marginTop: 'clamp(-5rem, -5vw, -3rem)' }}
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black">
            <img
              src={ofrecemosHeroBg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover animate-slow-zoom pointer-events-none"
              style={{ opacity: 0.35, filter: 'contrast(1.1) brightness(0.7)', objectPosition: 'center center' }}
              draggable={false}
            />
          </div>
          {/* Overlay oscuro uniforme sobre la foto */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.62)' }}
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
            <h2 className="section-supertitle font-title font-bold tracking-tight leading-none landing-wordmark-text drop-shadow-[0_4px_30px_rgba(0,0,0,1)]">
              Lo Que Ofrecemos
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

            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient " style={{ paddingTop: '1rem', marginBottom: '1rem' }}>
              Servicios
            </h3>
            <div className="mt-8 mb-10 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setServicesView('servicios')}
                data-selected={servicesView === 'servicios'}
                className="min-w-[210px] px-6 py-3 text-lg font-bold  tracking-widest rounded-xl border-2 border-[#d8b081] bg-transparent text-[#d8b081] transition-all duration-300 shadow-lg gold-hover-transition"
              >
                Individuales
              </button>
              <button
                type="button"
                onClick={() => setServicesView('paquetes')}
                data-selected={servicesView === 'paquetes'}
                className=" min-w-[210px] px-6 py-3 text-lg font-bold  tracking-widest rounded-xl border-2 border-[#d8b081] bg-transparent text-[#d8b081] transition-all duration-300 shadow-lg gold-hover-transition"
                
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
                        <div
                          className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover h-full cursor-pointer flex flex-col"
                          onClick={() => handleOpenDetail(servicio, 'servicio')}
                        >
                          <div className="relative overflow-hidden bg-[#111]" style={{ height: '240px' }}>
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
                          <div className="px-6 pt-5 pb-6 flex flex-col flex-1">
                            <span className="text-xs font-black tracking-[0.5em] text-gray-500 block mb-2">
                              {servicio.type === 'paquete' ? 'Paquete' : 'Servicio'}
                            </span>
                            <div className="flex items-baseline justify-between mb-3">
                              <h3 className="text-lg font-black font-title tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{servicio.nombre}</h3>
                              <span className="text-xl font-black text-[#d8b081] ml-3">${formatCurrency(servicio.precio)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 mb-3">
                              <Clock className="w-3.5 h-3.5 text-[#d8b081]" />
                              <span className="text-xs font-bold tracking-widest">{formatDuracion(servicio.duracion)}</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-2">{servicio.descripcion}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isAuthenticated) {
                                  onSelectReservation?.(servicio);
                                } else {
                                  onRequestLogin?.();
                                }
                              }}
                              className="mt-auto w-full py-3 bg-transparent text-[#d8b081] text-sm font-bold tracking-widest rounded-xl border-2 border-[#d8b081] hover:scale-105 transition-all duration-300 shadow-lg relative z-10 gold-hover-transition"
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

            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient " style={{ paddingTop: '1rem' }}>
              Nuestra Tienda Física
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
                  <div className="relative flex gap-6" style={{ width: 'max-content', marginBottom: '4rem' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
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
                        <div
                          className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-[#d8b081]/20 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(216,176,129,0.08)] glow-on-hover h-full cursor-pointer"
                          onClick={() => handleOpenDetail(producto, 'producto')}
                        >
                          <div className="relative overflow-hidden bg-[#111]" style={{ height: '240px' }}>
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
                            <span className="text-xs font-black tracking-[0.5em] text-gray-500 block mb-2">{producto.categoria?.nombre || 'Producto'}</span>
                            <div className="flex items-baseline justify-between mb-3">
                              <h3 className="text-lg font-black font-title tracking-tight text-white group-hover:text-[#d8b081] transition-colors">{producto.nombre}</h3>
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
            <h3 className="section-title-fill font-bold font-title tracking-tight leading-none text-gradient">
              Nuestros Barberos
            </h3>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto text-lg mb-4 leading-relaxed">Conoce a los artistas detrás de tu imagen. Nuestra dedicación se refleja en cada detalle.</p>
          </div>
          
          <div className="barber-grid w-full max-w-[850px] mx-auto overflow-hidden" style={{ height: '480px' }}>
            {[
              { nombre: 'Maicol', foto: imgMaicol, imageClass: 'barber-crop-default' },
              { nombre: 'Juan', foto: imgJuan, imageClass: 'barber-crop-juan' },
              { nombre: 'Edwin', foto: imgEdwin, imageClass: 'barber-crop-edwin' },
              { nombre: 'Eduardo', foto: imgEduardo, imageClass: 'barber-crop-eduardo' },
              { nombre: 'Christian', foto: imgChristian, imageClass: 'barber-crop-christian' },
            ].map((barbero, idx) => (
              <div
                key={idx}
                className="barber-panel relative flex flex-col bg-[#141414] rounded-2xl overflow-hidden shadow-2xl group"
              >
                {/* Nombre arriba */}
                <div className="py-5 text-center px-2 flex flex-col justify-center items-center bg-[#141414] z-10">
                  <h3 className="text-2xl md:text-3xl font-black font-title tracking-tight text-white group-hover:text-[#d8b081] transition-colors duration-200">
                    {barbero.nombre}
                  </h3>
                </div>

                {/* Imagen rellenando el espacio medio */}
                <div className="flex-1 w-full relative overflow-hidden bg-[#141414]">
                  <img
                    src={barbero.foto}
                    alt={barbero.nombre}
                    className={`barber-card-img w-full h-full object-cover transition-all duration-250 ${barbero.imageClass}`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/55 transition-all duration-250 pointer-events-none" />
                </div>

                {/* Botón de agendar */}
                <button
                  className="barber-panel-btn relative z-10 w-full py-6 font-bold tracking-[0.2em] text-xs outline-none border-t border-white/10 bg-transparent text-white cursor-pointer"
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
                <span className="text-[11px] font-black tracking-[0.5em] text-[#d8b081] block"></span>
                <h3 className="text-2xl mt-6 mb-6 font-title font-black uppercase tracking-tight text-white">Datos relevantes</h3>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 reveal-item">
            {/* Ubicación */}
            <a
              href="https://www.google.com/maps/search/?api=1&query=Calle+79+%2352-12%2C+Barrio+El+Bosque%2C+Medell%C3%ADn"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card-dark rounded-2xl p-6 mb-8 relative group transition-all duration-500 hover:border-[#d8b081]/30 block"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center group-hover:bg-[#d8b081]/10 transition-colors">
                  <MapPin className="w-5 h-5 text-[#d8b081]" />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.4em] text-white font-medium mb-2">Ubicación</p>
                  <p className="text-lg font-bold text-gray-400 group-hover:text-white transition-colors">Calle 79 #52-12</p>
                  <p className="text-sm text-gray-500 mt-0.5">Barrio El Bosque, Medellín</p>
                </div>
              </div>
            </a>

            {/* Contacto */}
            <div className="glass-card-dark rounded-2xl p-6 mb-8">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 p-3 rounded-xl icon-float flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#d8b081]" />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.4em] text-white font-medium mb-2">Contacto</p>
                  <p className="text-lg font-bold text-gray-400">301 483 6189</p>
                  <p className="text-sm text-gray-500 mt-0.5">WhatsApp / Llamadas</p>
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
                  <p className="text-[10px] tracking-[0.4em] text-white font-medium mb-2">Horario</p>
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
                  <p className="text-[10px] tracking-[0.4em] text-white font-medium mb-2">Equipo</p>
                  <div className="flex -space-x-2 justify-center mb-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-black bg-gray-800 flex items-center justify-center overflow-hidden">
                        <Users className="w-3 h-3 text-gray-500" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">5 Barberos Expertos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Detail Modal ── */}
      {isDetailDialogOpen && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={() => handleDetailDialogChange(false)}
          />
          {/* Modal content */}
          <div
            className="detail-modal-content border border-[#d8b081]/15 text-white overflow-hidden rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(216,176,129,0.08)]"
            style={{
              position: 'relative',
              zIndex: 1,
              background: '#0e0e13',
              width: 'min(96vw, 750px)',
              height: 'min(90vh, 720px)',
              maxWidth: '750px',
              maxHeight: '90vh',
            }}
          >

          {/* Close button */}
          <button
            type="button"
            onClick={() => handleDetailDialogChange(false)}
            style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: '0.75rem', padding: '0.4rem', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(216,176,129,0.2)'; e.currentTarget.style.color = '#d8b081'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          >
            <X className="w-4 h-4" />
          </button>

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
                  <h3 className="font-black font-title tracking-tight text-white leading-tight mb-2" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)' }}>
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
                        {formatDuracion(selectedDetailItem.duracion)}
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
                      <p className="text-[10px] font-black tracking-widest text-gray-500 mb-3">¿Qué incluye?</p>
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
                        <div className="rounded-xl mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                          <div className="px-4 pt-4 pb-3">
                            <p className="text-[11px] font-black tracking-[0.18em]" style={{ color: '#d8b081' }}>
                              Servicios incluidos
                            </p>
                          </div>
                          <div className="px-2 pb-2">
                            {selectedDetailItem.servicios.map((s: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between px-3 py-3 rounded-lg transition-colors duration-150 hover:bg-white/[0.04] cursor-default"
                                style={i < selectedDetailItem.servicios.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full shrink-0" style={{ background: 'rgba(216,176,129,0.12)' }}>
                                    <Check className="w-3 h-3" style={{ color: '#d8b081' }} />
                                  </span>
                                  <span className="text-sm text-white font-medium">{s.nombre || s}</span>
                                </div>
                                {s.duracion && (
                                  <span className="text-[11px] tabular-nums font-semibold ml-4 shrink-0" style={{ color: '#d8b081' }}>
                                    {formatDuracion(s.duracion)}
                                  </span>
                                )}
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
                        className="h-12 px-8 rounded-xl text-sm font-bold tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)]"
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
                          className="h-12 px-8 rounded-xl text-sm font-bold tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(216,176,129,0.25)] hover:shadow-[0_8px_30px_rgba(216,176,129,0.35)]"
                          style={{ background: '#d8b081', color: '#000' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#e8c091'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#d8b081'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          Agendar Ahora
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDetailDialogChange(false)}
                          className="h-12 px-6 rounded-xl border text-sm font-semibold tracking-wider transition-all duration-300"
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
          </div>
        </div>,
        document.body
      )}


      {/* Footer */}
      <footer id="footer" className="overflow-hidden border-t border-white/10" style={{ position: 'relative', zIndex: 2, backgroundColor: '#080808' }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[52rem] h-[24rem] rounded-full bg-[#d8b081]/6 blur-[130px]" />
        </div>

        {/* CTA Banner */}
        <div className="relative border-b border-white/5">
          <div className="content-max-width relative z-10 px-8 md:px-12 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-7" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
            <div className="max-w-2xl text-center">
              <p className="text-[11px] tracking-[0.45em] text-[#d8b081] font-black mt-4">Reserva tu momento</p>
              <h3 className="font-title text-white mb-2" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em' }}>¿Listo para tu próximo look?</h3>
              <p className="text-gray-400 text-sm md:text-base mb-8">Agenda tu cita y vive la experiencia Manito Barbershop con atención profesional.</p>
            </div>
            <button
              onClick={isAuthenticated ? onRequestDashboard : onRequestLogin}
              className="inline-flex items-center gap-3 px-10 pl-4 mb-4 py-4 bg-transparent text-[#d8b081] border-2 border-[#d8b081] font-bold text-sm tracking-widest rounded-xl shadow-2xl shadow-[#d8b081]/10 hover:scale-105 transition-all duration-300 shrink-0 gold-hover-transition"
            >
              {isAuthenticated ? 'Mi Panel' : 'Reservar Cita'}
              <ChevronRight className="w-4 h-5" />
            </button>
          </div>
        </div>

        {/* Descargar App */}
        <div className="relative border-b border-white/5">
          <div className="content-max-width relative z-10 px-8 md:px-12 lg:px-16 flex flex-col items-center justify-center gap-3" style={{ paddingTop: '28px', paddingBottom: '28px' }}>
            <p className="font-title text-white mb-6" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em' }}>También tenemos aplicación móvil</p>
            <a
              href="/downloads/manito-barbershop.apk"
              download
              className="inline-flex items-center gap-3 pl-4 pr-10 py-4 bg-transparent text-white border-2 border-white font-bold text-sm tracking-widest rounded-xl shadow-2xl hover:scale-105 transition-all duration-300 shrink-0 gold-hover-transition no-underline cursor-pointer"
            >
              <Smartphone className="w-5 h-5" />
              Descargar App
              <span className="inline-flex pr-2">
                <Download className="w-4 h-5" />
              </span>
            </a>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="content-max-width relative z-10 py-40 px-8 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-16 gap-x-12 lg:gap-8">
            {/* Marca */}
            <div className="flex flex-col items-center text-center space-y-6 py-12">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Manito Barbershop" className="w-12 h-12 rounded-full object-cover border-2 border-[#d8b081]/20" />
                <div className="text-left">
                  <span className="text-lg font-black font-title tracking-tight text-white uppercase block">Manito</span>
                  <span className="text-[10px] text-gray-500 tracking-widest">Barbershop</span>
                </div>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed max-w-[200px]">
                Estilo y elegancia en cada corte. Más de 2 años transformando estilos en el corazón de Medellín.
              </p>
            </div>

            {/* Redes Sociales */}
            <div className="flex flex-col items-center text-center space-y-5 py-12">
              <span className="text-sm font-bold tracking-[0.3em] text-[#d8b081]">Siguenos</span>
              <div className="flex flex-col gap-3">
                <a href="https://www.instagram.com/manito.barberia/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group text-xs">
                  <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#d8b081]/10 flex items-center justify-center transition-colors">
                    <Instagram className="w-3.5 h-3.5 text-[#d8b081]" />
                  </div>
                  <span>@manito.barberia</span>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61584534151053" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group text-xs">
                  <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#d8b081]/10 flex items-center justify-center transition-colors">
                    <svg className="w-3.5 h-3.5 text-[#d8b081]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span>Manito Barbershop</span>
                </a>
              </div>
            </div>

            {/* Contacto */}
            <div className="flex flex-col items-center text-center space-y-5 py-12">
              <span className="text-sm font-bold tracking-[0.3em] text-[#d8b081]">Contacto</span>
              <div className="space-y-4">
                <a href="tel:3014836189" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group text-xs">
                  <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#d8b081]/10 flex items-center justify-center transition-colors">
                    <Phone className="w-3.5 h-3.5 text-[#d8b081]" />
                  </div>
                  <span>301 483 6189</span>
                </a>
                <a href="mailto:manitobarbershop@gmail.com" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group text-xs">
                  <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#d8b081]/10 flex items-center justify-center transition-colors">
                    <Mail className="w-3.5 h-3.5 text-[#d8b081]" />
                  </div>
                  <span>Email Empresa</span>
                </a>
              </div>
            </div>

            {/* Ubicación con Mapa */}
            <div className="flex flex-col items-center text-center space-y-5 py-12">
              <span className="text-sm font-bold tracking-[0.3em] text-[#d8b081]">Ubicación</span>
              <div className="w-full max-w-[280px] h-44 rounded-xl overflow-hidden border border-white/10 relative group transition-all duration-500 hover:border-[#d8b081]/40">
                <iframe
                  title="Ubicación Footer"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.921974521102!2d-75.56745502586936!3d6.273989926014324!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4428dc83181e4f%3A0x23aa0248d2178036!2sCl.%2079%20%2352-12%2C%20Aranjuez%2C%20Medell%C3%ADn%2C%20Aranjuez%2C%20Medell%C3%ADn%2C%20Antioquia!5e0!3m2!1ses!2sco!4v1778521540179!5m2!1ses!2sco"
                  className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
                />
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Calle+79+%2352-12%2C+Barrio+El+Bosque%2C+Medell%C3%ADn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3"
                >
                  <p className="text-[10px] text-white font-bold tracking-wide">Calle 79 #52-12</p>
                  <p className="text-[8px] text-gray-400 tracking-tighter">Medellín, Colombia</p>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="relative z-10 border-t border-white/5">
          <div className="content-max-width py-8 px-8 md:px-12 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600 mt-4">© {new Date().getFullYear()} Manito Barbershop. Todos los derechos reservados.</p>
            <div className="flex items-center gap-3 mb-4">
              <Scissors className="w-3.5 h-3.5 text-[#d8b081]/40" />
              <span className="text-xs text-gray-600 tracking-widest">Hecho con pasión</span>
              <Scissors className="w-3.5 h-3.5 text-[#d8b081]/40 rotate-180" />
            </div>
          </div>
        </div>
      </footer>


      {/* WhatsApp Chat Widget — portal */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          {/* Chat Panel */}
          {waChatOpen && (
            <div
              style={{
                position: 'fixed',
                bottom: '96px',
                right: '24px',
                zIndex: 99998,
                width: '460px',
                maxWidth: 'calc(100vw - 48px)',
                height: '420px',
                maxHeight: 'calc(100vh - 140px)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
                animation: 'waSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {/* Sidebar — Lista de barberos */}
              <div style={{
                width: '140px',
                minWidth: '140px',
                minHeight: 0,
                background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ padding: '14px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.15em', color: '#25D366' }}>Barberos</span>
                </div>
                <div
                  style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}
                  onWheel={(e) => e.stopPropagation()}
                >
                  {waBarbers.map((b, i) => (
                    <button
                      key={i}
                      onClick={() => { setWaSelectedBarber(i); setTimeout(() => waInputRef.current?.focus(), 100); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px',
                        border: 'none',
                        background: waSelectedBarber === i ? 'rgba(37,211,102,0.12)' : 'transparent',
                        borderLeft: waSelectedBarber === i ? '3px solid #25D366' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: '100%',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (waSelectedBarber !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={e => { if (waSelectedBarber !== i) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <WaAvatar foto={b.foto} nombre={b.nombre} size={32} border={waSelectedBarber === i ? '2px solid #25D366' : '2px solid rgba(255,255,255,0.1)'} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: waSelectedBarber === i ? '#fff' : '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nombre}</div>
                        <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.05em' }}>{b.rol}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.4)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <WaAvatar foto={waBarbers[waSelectedBarber]?.foto ?? null} nombre={waBarbers[waSelectedBarber]?.nombre ?? ''} size={36} border="2px solid #25D366" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{waBarbers[waSelectedBarber]?.nombre}</div>
                    <div style={{ fontSize: '10px', color: '#25D366', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366', display: 'inline-block' }} />
                      Disponible en WhatsApp
                    </div>
                  </div>
                  <button
                    onClick={() => setWaChatOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px', padding: '4px', lineHeight: 1 }}
                    aria-label="Cerrar chat"
                  >
                    ✕
                  </button>
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '10px' }}>
                  {/* Welcome message from barber */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <WaAvatar foto={waBarbers[waSelectedBarber]?.foto ?? null} nombre={waBarbers[waSelectedBarber]?.nombre ?? ''} size={24} border="none" />
                    <div style={{
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: '12px 12px 12px 4px',
                      padding: '10px 14px',
                      maxWidth: '80%',
                    }}>
                      <p style={{ fontSize: '12px', color: '#ddd', margin: 0, lineHeight: 1.5 }}>
                        ¡Hola! Soy <strong style={{ color: '#25D366' }}>{waBarbers[waSelectedBarber]?.nombre}</strong> de Manito Barbershop 💈
                      </p>
                      <p style={{ fontSize: '12px', color: '#ddd', margin: '4px 0 0', lineHeight: 1.5 }}>
                        Escríbeme y te responderé por WhatsApp.
                      </p>
                      <span style={{ fontSize: '9px', color: '#555', display: 'block', marginTop: '4px', textAlign: 'right' }}>Ahora</span>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}>
                  <input
                    ref={waInputRef}
                    type="text"
                    value={waMessage}
                    onChange={e => setWaMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleWaSend(); } }}
                    placeholder={`Escribe un mensaje a ${waBarbers[waSelectedBarber]?.nombre}...`}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px',
                      padding: '10px 16px',
                      fontSize: '12px',
                      color: '#fff',
                      outline: 'none',
                      transition: 'border 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(37,211,102,0.4)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                  <button
                    onClick={handleWaSend}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#25D366',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    aria-label="Enviar mensaje"
                  >
                    <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'white', transform: 'rotate(-30deg)' }}>
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAB Button */}
          <button
            onClick={() => { setWaChatOpen(prev => !prev); if (!waChatOpen) setTimeout(() => waInputRef.current?.focus(), 400); }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: waChatOpen ? '#333' : '#25D366',
              boxShadow: waChatOpen ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 24px rgba(37,211,102,0.4)',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            aria-label={waChatOpen ? 'Cerrar chat' : 'Abrir chat de WhatsApp'}
          >
            {waChatOpen ? (
              <svg viewBox="0 0 24 24" style={{ width: '22px', height: '22px', fill: 'white' }}>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            ) : (
              <svg viewBox="0 0 32 32" style={{ width: '28px', height: '28px', fill: 'white' }}>
                <path d="M16.004 2.667A13.28 13.28 0 0 0 2.672 15.946a13.17 13.17 0 0 0 1.782 6.632L2.667 29.333l6.98-1.83A13.3 13.3 0 0 0 16.004 29.3 13.32 13.32 0 1 0 16.004 2.667Zm0 24.31a11 11 0 0 1-5.61-1.535l-.403-.239-4.175 1.095 1.114-4.07-.263-.418a10.95 10.95 0 0 1-1.685-5.864A10.99 10.99 0 1 1 16.004 26.977Zm6.03-8.228c-.33-.166-1.956-.965-2.26-1.075-.303-.11-.524-.166-.744.166-.22.33-.855 1.075-1.048 1.296-.193.22-.386.248-.716.083-.33-.166-1.394-.514-2.656-1.638-.982-.874-1.644-1.954-1.836-2.284-.193-.33-.02-.51.145-.674.148-.148.33-.386.496-.58.166-.192.22-.33.33-.55.11-.22.055-.412-.028-.578-.083-.166-.744-1.793-1.02-2.455-.268-.644-.54-.557-.744-.567l-.634-.012a1.214 1.214 0 0 0-.882.414c-.303.33-1.158 1.131-1.158 2.758s1.186 3.2 1.352 3.42c.166.22 2.335 3.565 5.66 5 .79.342 1.408.546 1.888.699.794.252 1.517.217 2.088.131.637-.095 1.956-.8 2.232-1.573.275-.772.275-1.434.193-1.573-.083-.138-.303-.22-.634-.386Z" />
              </svg>
            )}
          </button>

          {/* Animation keyframes */}
          <style>{`
            @keyframes waSlideUp {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </>,
        document.body
      )}

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
