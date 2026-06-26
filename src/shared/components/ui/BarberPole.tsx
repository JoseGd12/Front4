import React from "react";

interface BarberPoleProps {
    className?: string;
}

export const BarberPole: React.FC<BarberPoleProps> = ({ className }) => {
    return (
        <div className={`relative overflow-hidden ${className}`} style={{ width: '20px', height: '24px' }}>
            <svg
                viewBox="0 0 24 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                {/* Cuerpo del poste */}
                <rect x="6" y="4" width="12" height="24" rx="6" fill="var(--black-secondary)" stroke="currentColor" strokeWidth="1" />

                {/* Contenedor de rayas animadas */}
                <mask id="pole-mask">
                    <rect x="6" y="4" width="12" height="24" rx="6" fill="white" />
                </mask>

                <g mask="url(#pole-mask)">
                    <g className="animate-barber-slide">
                        {[...Array(8)].map((_, i) => (
                            <rect
                                key={i}
                                x="-5"
                                y={i * 8 - 10}
                                width="40"
                                height="4"
                                fill={i % 2 === 0 ? "var(--orange-primary, #F97316)" : "#FFFFFF"}
                                transform="rotate(-25)"
                            />
                        ))}
                    </g>
                </g>

                {/* Tapas superior e inferior */}
                <path d="M6 4C6 1.79086 8.68629 0 12 0C15.3137 0 18 1.79086 18 4H6Z" fill="currentColor" />
                <path d="M6 28C6 30.2091 8.68629 32 12 32C15.3137 32 18 30.2091 18 28H6Z" fill="currentColor" />

                {/* Soportes */}
                <rect x="4" y="4" width="16" height="1.5" fill="currentColor" />
                <rect x="4" y="26.5" width="16" height="1.5" fill="currentColor" />
            </svg>

            <style>{`
        @keyframes barber-slide {
          from { transform: translateY(0); }
          to { transform: translateY(8px); }
        }
        .animate-barber-slide {
          animation: barber-slide 0.8s linear infinite;
        }
      `}</style>
        </div>
    );
};
