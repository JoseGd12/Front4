export function generatePasswordResetHTML(email: string, token: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - Manito Barbershop</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #d8b081;
      --primary-hover: #e8c091;
      --bg-dark: #0a0a0a;
      --bg-panel: #1a1a1a;
      --text-main: #FFFFFF;
      --text-muted: #9ca3af;
      --border: rgba(255, 255, 255, 0.1);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Outfit', sans-serif;
    }

    body {
      background: var(--bg-dark);
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
    }

    .main-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    /* Panel Izquierdo */
    .left-panel {
      flex: 0 0 50%;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #000;
    }

    .bg-image {
      position: absolute;
      inset: 0;
      background-image: url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1920&h=1080&fit=crop');
      background-size: cover;
      background-position: center;
      filter: grayscale(1) opacity(0.5);
      transform: scale(1.25);
      animation: slow-zoom 25s ease-in-out infinite alternate;
    }

    .bg-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(26,26,26,0.4) 0%, rgba(13,13,13,0.7) 70%, #000 100%);
    }

    .left-content {
      position: relative;
      z-index: 10;
      padding: 0 3rem;
      max-width: 600px;
      text-align: center;
    }

    .logo-container {
      margin-bottom: 2rem;
    }

    .logo-img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--bg-panel);
      padding: 4px;
      border: 2px solid rgba(216, 176, 129, 0.3);
      box-shadow: 0 0 40px rgba(216, 176, 129, 0.2);
    }

    .brand-title {
      font-size: clamp(2rem, 4vw, 3.5rem);
      font-weight: 700;
      line-height: 1;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #fff 0%, var(--primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      color: var(--text-muted);
      font-size: 1.125rem;
      font-weight: 300;
      margin-bottom: 2.5rem;
      line-height: 1.6;
    }

    .separator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 2.5rem;
    }

    .sep-line {
      width: 64px;
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(216, 176, 129, 0.6));
    }

    .sep-line.reverse {
      background: linear-gradient(to left, transparent, rgba(216, 176, 129, 0.6));
    }

    .testimonial {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      padding: 1.5rem;
      border-radius: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .stars {
      color: var(--primary);
      margin-bottom: 0.75rem;
      font-size: 0.875rem;
    }

    .testimonial-text {
      font-style: italic;
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* Panel Derecho */
    .right-panel {
      flex: 0 0 50%;
      background: var(--bg-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }

    .subtle-blobs {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.3;
    }

    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
    }

    .blob-1 { top: 25%; right: 0; width: 300px; height: 300px; background: rgba(216, 176, 129, 0.05); }
    .blob-2 { bottom: 25%; left: 0; width: 250px; height: 250px; background: rgba(216, 176, 129, 0.03); }

    .form-container {
      width: 100%;
      max-width: 400px;
      position: relative;
      z-index: 10;
    }

    .header { margin-bottom: 2rem; }
    .title { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 0.875rem; }

    .card {
      background: rgba(255,255,255,0.03);
      padding: 1.5rem;
      border-radius: 1rem;
      border: 1px solid var(--border);
      margin-bottom: 1.5rem;
    }

    .details-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .detail-label { color: var(--text-muted); }
    .detail-value { font-family: monospace; font-size: 0.75rem; }

    .timer-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: rgba(216, 176, 129, 0.1);
      border: 1px solid rgba(216,176,129,0.2);
      border-radius: 0.5rem;
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .form-group { margin-bottom: 1.25rem; }
    .form-label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); }

    .input-wrapper { position: relative; }
    .form-input {
      width: 100%;
      height: 48px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 0 1rem;
      color: white;
      transition: border-color 0.2s;
    }

    .form-input:focus { outline: none; border-color: rgba(216, 176, 129, 0.5); }

    .toggle-password {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
    }

    .submit-btn {
      width: 100%;
      height: 48px;
      background: var(--primary);
      color: black;
      border: none;
      border-radius: 0.75rem;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
      margin-top: 1rem;
      box-shadow: 0 4px 20px rgba(216, 176, 129, 0.2);
    }

    .submit-btn:hover { background: var(--primary-hover); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(216, 176, 129, 0.3); }
    .submit-btn:active { transform: translateY(0); }
    .submit-btn:disabled { background: #333; color: #666; cursor: not-allowed; transform: none; box-shadow: none; }

    .error-msg {
      background: rgba(248, 113, 113, 0.1);
      border: 1px solid rgba(248, 113, 113, 0.2);
      color: #f87171;
      padding: 0.75rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      display: none;
    }

    .success-panel { text-align: center; display: none; }
    .success-icon { font-size: 4rem; margin-bottom: 1.5rem; color: #4ade80; }

    .validation-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      padding: 1rem;
      border-radius: 0.75rem;
      margin-top: 1rem;
      display: none;
    }

    .validation-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
      color: var(--text-muted);
    }

    .val-dot { width: 6px; height: 6px; border-radius: 50%; background: #444; }
    .val-active .val-dot { background: #4ade80; }
    .val-active { color: #4ade80; }

    @keyframes slow-zoom {
      0% { transform: scale(1.25); }
      100% { transform: scale(1.35); }
    }

    @media (max-width: 1024px) {
      .left-panel { display: none; }
      .right-panel { flex: 0 0 100%; }
    }
  </style>
</head>
<body>
  <div class="main-container">
    <!-- Panel Izquierdo -->
    <div class="left-panel">
      <div class="bg-image"></div>
      <div class="bg-overlay"></div>
      <div class="left-content">
        <div class="logo-container">
          <svg class="logo-img" viewBox="0 0 512 512">
            <circle cx="256" cy="256" r="240" fill="#1a1a1a" />
            <path d="M160 140L352 372M160 372L352 140" stroke="#d8b081" stroke-width="20" stroke-linecap="round"/>
          </svg>
        </div>
        <h1 class="brand-title">MANITO BARBERSHOP</h1>
        <p class="brand-subtitle">Estilo, Elegancia y Profesionalismo en Cada Corte</p>
        <div class="separator">
          <div class="sep-line"></div>
          <span>✂️</span>
          <div class="sep-line reverse"></div>
        </div>
        <div class="testimonial">
          <div class="stars">★★★★★</div>
          <p class="testimonial-text">"La mejor barbería de Medellín. Atención profesional y un ambiente increíble."</p>
        </div>
      </div>
    </div>

    <!-- Panel Derecho -->
    <div class="right-panel">
      <div class="subtle-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
      </div>

      <!-- Verificación Inicial -->
      <div id="verify-section" class="form-container">
        <div class="card" style="text-align: center;">
          <div style="width: 40px; height: 40px; border: 3px solid var(--primary); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem;"></div>
          <h2 class="title" style="font-size: 1.25rem;">Verificando enlace...</h2>
          <p class="subtitle">Estamos validando tu enlace de recuperación</p>
        </div>
      </div>

      <!-- Formulario principal -->
      <div id="reset-section" class="form-container" style="display: none;">
        <div class="header">
          <h1 class="title">Restablecer Contraseña</h1>
          <p class="subtitle">Crea una nueva contraseña para tu cuenta</p>
        </div>

        <div class="card">
          <div class="details-row">
            <span class="detail-label">Cuenta:</span>
            <span class="detail-value">${email}</span>
          </div>
          <div class="details-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${new Date().toLocaleDateString('es-ES')}</span>
          </div>
        </div>

        <div class="timer-badge">
          <span>🕒</span>
          <span>El enlace expira en: <span id="timer">24:00:00</span></span>
        </div>

        <div id="error-box" class="error-msg"></div>

        <form id="resetForm">
          <div class="form-group">
            <label class="form-label">Nueva Contraseña</label>
            <div class="input-wrapper">
              <input type="password" id="newPassword" class="form-input" placeholder="Mínimo 6 caracteres" required>
              <button type="button" class="toggle-password" id="toggleNew">👁️</button>
            </div>
            
            <div id="val-card" class="validation-card">
              <div class="validation-item" id="val-len">
                <div class="val-dot"></div> Mínimo 6 caracteres
              </div>
              <div class="validation-item" id="val-num">
                <div class="val-dot"></div> Al menos un número
              </div>
              <div class="validation-item" id="val-cap">
                <div class="val-dot"></div> Al menos una mayúscula
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirmar Contraseña</label>
            <div class="input-wrapper">
              <input type="password" id="confirmPassword" class="form-input" placeholder="Repite tu nueva contraseña" required>
              <button type="button" class="toggle-password" id="toggleConfirm">👁️</button>
            </div>
            <p id="match-error" style="color: #f87171; font-size: 0.75rem; margin-top: 0.5rem; display: none;">Las contraseñas no coinciden</p>
          </div>

          <button type="submit" id="submitBtn" class="submit-btn" disabled>Restablecer Contraseña</button>
        </form>
      </div>

      <!-- Éxito -->
      <div id="success-section" class="form-container success-panel">
        <div class="success-icon">✓</div>
        <h1 class="title">¡Actualizado!</h1>
        <p class="subtitle" style="margin-bottom: 2rem;">Tu contraseña ha sido cambiada exitosamente.</p>
        <button class="submit-btn" onclick="window.close()">Cerrar Ventana</button>
      </div>
    </div>
  </div>

  <style>
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>

  <script>
    let timeLeft = 24 * 3600;
    const timerElem = document.getElementById('timer');
    const form = document.getElementById('resetForm');
    const submitBtn = document.getElementById('submitBtn');
    const newPass = document.getElementById('newPassword');
    const confPass = document.getElementById('confirmPassword');

    function formatTime(s) {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      return \`\${h.toString().padStart(2,'0')}:\${m.toString().padStart(2,'0')}:\${ss.toString().padStart(2,'0')}\`;
    }

    setInterval(() => {
      if(timeLeft > 0) {
        timeLeft--;
        timerElem.textContent = formatTime(timeLeft);
      }
    }, 1000);

    function validate() {
      const val = newPass.value;
      const len = val.length >= 6;
      const num = /[0-9]/.test(val);
      const cap = /[A-Z]/.test(val);
      const match = val === confPass.value && val !== '';

      document.getElementById('val-card').style.display = val ? 'block' : 'none';
      document.getElementById('val-len').classList.toggle('val-active', len);
      document.getElementById('val-num').classList.toggle('val-active', num);
      document.getElementById('val-cap').classList.toggle('val-active', cap);
      
      document.getElementById('match-error').style.display = (confPass.value && !match) ? 'block' : 'none';

      submitBtn.disabled = !(len && match);
    }

    newPass.addEventListener('input', validate);
    confPass.addEventListener('input', validate);

    document.getElementById('toggleNew').onclick = () => {
      newPass.type = newPass.type === 'password' ? 'text' : 'password';
    };
    document.getElementById('toggleConfirm').onclick = () => {
      confPass.type = confPass.type === 'password' ? 'text' : 'password';
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Procesando...';
      
      // Simulación de envío
      setTimeout(() => {
        document.getElementById('reset-section').style.display = 'none';
        document.getElementById('success-section').style.display = 'block';
      }, 1500);
    };

    // Simulación de carga inicial
    setTimeout(() => {
      document.getElementById('verify-section').style.display = 'none';
      document.getElementById('reset-section').style.display = 'block';
    }, 1000);
  </script>
</body>
</html>`;
}

