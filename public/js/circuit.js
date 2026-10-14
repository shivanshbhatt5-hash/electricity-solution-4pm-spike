/**
 * CampusPulse AI // Interactive Campus Electrical & Solar Microgrid Flow Diagram
 * Canvas renderer supporting dynamic Light/Dark mode themes,
 * animated multi-branch energy flow, rooftop solar injection,
 * critical-load safety isolation, and physical ESP32 prototype testbed representation.
 */

class InteractiveCampusMicrogrid {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.solarParticles = [];
    this.particleCount = 36;
    
    // Live State
    this.grossDemandKW = 1215.4;
    this.solarGenKW = 68.2;
    this.netDemandKW = 1147.2;
    this.peakStatus = 'PEAK_THRESHOLD_BREACH';
    this.optimizationActive = false;
    
    // Prototype State
    this.prototypeRelayClosed = true;
    this.prototypeFlexCurrent = 2.18;
    this.prototypeCritCurrent = 1.42;

    this.initCanvasSize();
    this.initParticles();
    this.bindEvents();
    this.startAnimationLoop();

    if (window.app) {
      window.app.on('telemetry', (data) => {
        if (data.telemetry) {
          const t = data.telemetry;
          this.grossDemandKW = t.totalCampusDemandKW;
          this.solarGenKW = t.solarGenerationKW;
          this.netDemandKW = t.netGridDemandKW;
          this.peakStatus = t.peakStatus;
        }
        if (data.prototype) {
          this.prototypeRelayClosed = data.prototype.flexibleRelayState === 'CLOSED';
          this.prototypeFlexCurrent = data.prototype.flexibleCurrentA;
          this.prototypeCritCurrent = data.prototype.criticalCurrentA;
        }
        if (data.optimizationActive !== undefined) {
          this.optimizationActive = data.optimizationActive;
        }
      });

      window.app.on('optimizationChange', (data) => {
        this.optimizationActive = data.optimizationActive;
        if (data.prototype) {
          this.prototypeRelayClosed = data.prototype.flexibleRelayState === 'CLOSED';
        }
      });

      window.app.on('prototypeRelay', (proto) => {
        this.prototypeRelayClosed = proto.flexibleRelayState === 'CLOSED';
      });
    }
  }

  initCanvasSize() {
    const parent = this.canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const w = rect.width || 640;
    const h = rect.height || 420;

    this.canvas.width = w * window.devicePixelRatio;
    this.canvas.height = h * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.w = w;
    this.h = h;

    window.addEventListener('resize', () => {
      const r = parent.getBoundingClientRect();
      const newW = r.width || 640;
      const newH = r.height || 420;
      this.canvas.width = newW * window.devicePixelRatio;
      this.canvas.height = newH * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      this.w = newW;
      this.h = newH;
    });
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.002,
        branch: Math.floor(Math.random() * 3) // 0: Academic, 1: Hostels/HVAC, 2: Protected Servers
      });
    }

    this.solarParticles = [];
    for (let i = 0; i < 16; i++) {
      this.solarParticles.push({
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.002
      });
    }
  }

  bindEvents() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Click on Prototype Relay Switch Box
      const relayX = this.w * 0.78;
      const relayY = this.h * 0.78;
      if (Math.hypot(x - relayX, y - relayY) < 32) {
        if (window.app) {
          window.app.send('TOGGLE_PROTOTYPE_RELAY');
        }
      }
    });
  }

  startAnimationLoop() {
    const render = () => {
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  draw() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    ctx.clearRect(0, 0, w, h);

    // Node Positions
    const gridNode = { x: w * 0.12, y: h * 0.40 };
    const solarNode = { x: w * 0.38, y: h * 0.14 };
    const mainBusNode = { x: w * 0.42, y: h * 0.40 };
    
    // Consumer Branches
    const academicNode = { x: w * 0.78, y: h * 0.20 };
    const hostelHvacNode = { x: w * 0.78, y: h * 0.48 };
    const serverNode = { x: w * 0.78, y: h * 0.76 }; // Strictly Protected!

    // 1. Draw Grid Incomer Feeder Line (Grid -> Main Bus)
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.netDemandKW > 1000 ? '#f43f5e' : (isDark ? '#38bdf8' : '#0284c7');
    ctx.beginPath();
    ctx.moveTo(gridNode.x, gridNode.y);
    ctx.lineTo(mainBusNode.x, mainBusNode.y);
    ctx.stroke();

    // 2. Draw Rooftop Solar Injection Line (Solar -> Main Bus)
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(solarNode.x, solarNode.y);
    ctx.lineTo(mainBusNode.x, mainBusNode.y);
    ctx.stroke();

    // 3. Draw Distribution Branches from Main Bus to Buildings
    ctx.lineWidth = 3;
    ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';

    // To Academic
    ctx.beginPath();
    ctx.moveTo(mainBusNode.x, mainBusNode.y);
    ctx.lineTo(w * 0.58, mainBusNode.y);
    ctx.lineTo(w * 0.58, academicNode.y);
    ctx.lineTo(academicNode.x, academicNode.y);
    ctx.stroke();

    // To Hostels & HVAC
    ctx.beginPath();
    ctx.moveTo(mainBusNode.x, mainBusNode.y);
    ctx.lineTo(w * 0.58, mainBusNode.y);
    ctx.lineTo(w * 0.58, hostelHvacNode.y);
    ctx.lineTo(hostelHvacNode.x, hostelHvacNode.y);
    ctx.stroke();

    // To Protected Mission-Critical Server Data Center
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#10b981'; // Always glowing green protected line!
    ctx.beginPath();
    ctx.moveTo(mainBusNode.x, mainBusNode.y);
    ctx.lineTo(w * 0.58, mainBusNode.y);
    ctx.lineTo(w * 0.58, serverNode.y);
    ctx.lineTo(serverNode.x, serverNode.y);
    ctx.stroke();

    // 4. Draw Animated Energy Particles
    // Grid Main Line Particles
    ctx.fillStyle = this.netDemandKW > 1000 ? '#f43f5e' : '#0284c7';
    this.particles.forEach(p => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;

      // Incomer segment (0.0 to 0.4)
      if (p.progress <= 0.4) {
        const segT = p.progress / 0.4;
        const px = gridNode.x + (mainBusNode.x - gridNode.x) * segT;
        const py = gridNode.y;
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Branching segment (0.4 to 1.0)
        const segT = (p.progress - 0.4) / 0.6;
        let target = hostelHvacNode;
        if (p.branch === 0) target = academicNode;
        else if (p.branch === 2) target = serverNode;

        const cornerX = w * 0.58;
        let px, py;
        if (segT < 0.3) {
          px = mainBusNode.x + (cornerX - mainBusNode.x) * (segT / 0.3);
          py = mainBusNode.y;
        } else if (segT < 0.7) {
          px = cornerX;
          py = mainBusNode.y + (target.y - mainBusNode.y) * ((segT - 0.3) / 0.4);
        } else {
          px = cornerX + (target.x - cornerX) * ((segT - 0.7) / 0.3);
          py = target.y;
        }

        ctx.fillStyle = p.branch === 2 ? '#10b981' : (this.optimizationActive ? '#0284c7' : '#f43f5e');
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Solar Particles (Gold)
    ctx.fillStyle = '#f59e0b';
    this.solarParticles.forEach(sp => {
      sp.progress += sp.speed;
      if (sp.progress > 1) sp.progress = 0;
      const px = solarNode.x + (mainBusNode.x - solarNode.x) * sp.progress;
      const py = solarNode.y + (mainBusNode.y - solarNode.y) * sp.progress;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Draw Component Hub Nodes

    // (A) Utility Grid Substation Node
    this.drawBoxNode(gridNode.x, gridNode.y, 'UTILITY GRID', `${this.netDemandKW.toFixed(0)} kW Import`, '#0284c7', isDark);

    // (B) Rooftop Solar Farm Node
    this.drawBoxNode(solarNode.x, solarNode.y, 'ROOFTOP SOLAR', `${this.solarGenKW.toFixed(0)} kW Generated`, '#f59e0b', isDark);

    // (C) Campus Smart Bus & ESP32 Node
    this.drawCentralBus(mainBusNode.x, mainBusNode.y, isDark);

    // (D) Academic Complex
    this.drawBoxNode(academicNode.x, academicNode.y, 'ACADEMIC BLOCKS', this.optimizationActive ? '245 kW (-2°C AC)' : '282 kW (Peak)', '#38bdf8', isDark);

    // (E) Hostels & Central Chiller
    const hostelLabel = this.optimizationActive ? '392 kW (Staggered)' : '546 kW (Evening Peak)';
    this.drawBoxNode(hostelHvacNode.x, hostelHvacNode.y, 'HOSTELS & CHILLER', hostelLabel, this.optimizationActive ? '#10b981' : '#f43f5e', isDark);

    // (F) Mission-Critical Server Data Center (With Safety Padlock)
    this.drawProtectedServerNode(serverNode.x, serverNode.y, isDark);
  }

  drawBoxNode(x, y, title, subtitle, accentColor, isDark) {
    const ctx = this.ctx;
    const boxW = 145;
    const boxH = 48;
    const rx = x - boxW / 2;
    const ry = y - boxH / 2;

    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(rx, ry, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x, y - 5);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(subtitle, x, y + 12);
  }

  drawCentralBus(x, y, isDark) {
    const ctx = this.ctx;
    const r = 26;

    ctx.fillStyle = this.netDemandKW > 1000 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(2, 132, 199, 0.15)';
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.strokeStyle = this.netDemandKW > 1000 ? '#f43f5e' : '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAMPUS BUS', x, y - 4);

    ctx.fillStyle = this.netDemandKW > 1000 ? '#f43f5e' : '#10b981';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.fillText(`${this.grossDemandKW.toFixed(0)} kW`, x, y + 8);
  }

  drawProtectedServerNode(x, y, isDark) {
    const ctx = this.ctx;
    const boxW = 150;
    const boxH = 52;
    const rx = x - boxW / 2;
    const ry = y - boxH / 2;

    ctx.fillStyle = isDark ? 'rgba(6, 78, 59, 0.3)' : 'rgba(236, 253, 245, 0.95)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(rx, ry, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 SERVER & RESEARCH LABS', x, y - 6);

    ctx.fillStyle = isDark ? '#a7f3d0' : '#065f46';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('96.5 kW [STRICTLY PROTECTED]', x, y + 11);
  }
}

window.InteractiveCampusMicrogrid = InteractiveCampusMicrogrid;
