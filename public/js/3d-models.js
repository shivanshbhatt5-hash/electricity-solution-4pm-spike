/**
 * VOLTGUARD IoT // High-Fidelity 3D Model Viewer & Anti-Gravity Physics Engine
 * Powered by Three.js (r128) - Local & CDN resilient
 * Features procedural photorealistic hardware digital twins, dynamic shadow casting,
 * interactive 360° orbital controls, wireframe modes, and anti-gravity levitation physics.
 */

(function () {
  'use strict';

  // Ensure Three.js is loaded (local or CDN fallback)
  function ensureThreeLoaded(callback) {
    if (window.THREE) {
      callback();
      return;
    }
    // Try loading local script first
    const script = document.createElement('script');
    script.src = 'js/three.min.js';
    script.onload = () => {
      console.log('[VoltGuard 3D] Three.js loaded from local bundle');
      callback();
    };
    script.onerror = () => {
      console.warn('[VoltGuard 3D] Local Three.js failed, trying CDN fallback...');
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      cdnScript.onload = () => callback();
      cdnScript.onerror = () => {
        console.error('[VoltGuard 3D] Failed to load Three.js. Triggering SVG fallbacks.');
      };
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  }

  const VoltGuard3D = {
    scenes: new Map(),

    // Shared Studio Lighting Setup with Rich Specular & Ambient Fill
    setupStudioLighting(scene, hasPointLights = true) {
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.95);
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
      keyLight.position.set(12, 22, 14);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6); // Cyan tint
      fillLight.position.set(-16, 12, -10);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x10b981, 0.4); // Subtle emerald rim
      rimLight.position.set(0, -8, -14);
      scene.add(rimLight);

      if (hasPointLights) {
        // Glowing onboard ESP32 LED Light (Cyan)
        const cyanLed = new THREE.PointLight(0x00f0ff, 2.5, 6);
        cyanLed.position.set(-3.5, 1.5, 0.8);
        scene.add(cyanLed);

        // Warning bypass hook LED (Crimson)
        const redLed = new THREE.PointLight(0xff3366, 1.8, 5);
        redLed.position.set(3.8, 2.5, 0.2);
        scene.add(redLed);
      }
    },

    // -------------------------------------------------------------------------
    // PAGE 1: Complete Miniature Testbed Prototype 3D Digital Twin
    // -------------------------------------------------------------------------
    initPrototypeViewer(containerId) {
      ensureThreeLoaded(() => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clean previous content
        container.innerHTML = '';

        const width = container.clientWidth || 650;
        const height = container.clientHeight || 480;

        const scene = new THREE.Scene();
        scene.background = null; // Transparent background for seamless glassmorphism

        const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
        camera.position.set(13, 11, 15);
        camera.lookAt(0, 0.5, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        this.setupStudioLighting(scene, true);

        // Ground Plane with Dynamic Shadow Projection
        const shadowGeo = new THREE.PlaneGeometry(18, 12);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x0f172a,
          transparent: true,
          opacity: 0.12,
          side: THREE.DoubleSide
        });
        const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
        groundShadow.rotation.x = -Math.PI / 2;
        groundShadow.position.y = -2.2;
        scene.add(groundShadow);

        // Circular anti-gravity shadow blob under platform
        const blobGeo = new THREE.CircleGeometry(6.5, 32);
        const blobMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: 0.08
        });
        const blobShadow = new THREE.Mesh(blobGeo, blobMat);
        blobShadow.rotation.x = -Math.PI / 2;
        blobShadow.position.y = -2.18;
        scene.add(blobShadow);

        // Root Group that Levitate
        const levitateGroup = new THREE.Group();
        scene.add(levitateGroup);

        // 1. Acrylic / PCB Testbed Baseplate
        const baseGeo = new THREE.BoxGeometry(15, 0.45, 10);
        const baseMat = new THREE.MeshPhysicalMaterial({
          color: 0x1e293b,
          metalness: 0.35,
          roughness: 0.25,
          clearcoat: 0.9,
          clearcoatRoughness: 0.15
        });
        const basePlate = new THREE.Mesh(baseGeo, baseMat);
        basePlate.castShadow = true;
        basePlate.receiveShadow = true;
        levitateGroup.add(basePlate);

        // Glowing Blue Grid Lines on Acrylic Plate
        const grid = new THREE.GridHelper(14, 14, 0x00f0ff, 0x334155);
        grid.position.y = 0.24;
        levitateGroup.add(grid);

        // 2. ESP32-WROOM-32 Microcontroller Subassembly
        const espGroup = new THREE.Group();
        espGroup.position.set(-4.2, 0.3, 1.8);

        // Dark Emerald PCB
        const espPcb = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.2, 5.0),
          new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.45, metalness: 0.1 })
        );
        espPcb.castShadow = true;
        espGroup.add(espPcb);

        // Laser-etched Metal RF Shield
        const rfShield = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.3, 2.5),
          new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 })
        );
        rfShield.position.set(0, 0.25, 0.8);
        rfShield.castShadow = true;
        espGroup.add(rfShield);

        // Golden Dual-Row Header Pins
        for (let z = -2.2; z <= 2.2; z += 0.35) {
          [-1.5, 1.5].forEach(side => {
            const pin = new THREE.Mesh(
              new THREE.BoxGeometry(0.08, 0.4, 0.08),
              new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.1 })
            );
            pin.position.set(side, -0.15, z);
            espGroup.add(pin);
          });
        }

        // On-board Glowing LED (Cyan)
        const pwrLed = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.15, 0.2),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        );
        pwrLed.position.set(-0.9, 0.18, -1.8);
        espGroup.add(pwrLed);

        // Micro-USB Port
        const usbPort = new THREE.Mesh(
          new THREE.BoxGeometry(1.0, 0.35, 0.8),
          new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.85, roughness: 0.25 })
        );
        usbPort.position.set(0, 0.22, -2.5);
        espGroup.add(usbPort);

        levitateGroup.add(espGroup);

        // 3. Step-Down AC/DC Transformer
        const transGroup = new THREE.Group();
        transGroup.position.set(-4.2, 0.3, -2.8);

        // Iron Core Laminations
        const core = new THREE.Mesh(
          new THREE.BoxGeometry(3.0, 2.4, 2.6),
          new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.6, roughness: 0.4 })
        );
        core.castShadow = true;
        transGroup.add(core);

        // Copper Coil Winding
        const coil = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.2, 2.0, 24),
          new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.25 })
        );
        coil.rotation.z = Math.PI / 2;
        coil.position.y = 0.2;
        transGroup.add(coil);

        levitateGroup.add(transGroup);

        // 4. Dual Channel 5V Relay Module (Songle Blue Cubes)
        const relayGroup = new THREE.Group();
        relayGroup.position.set(0.0, 0.3, -2.8);

        const relayPcb = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.18, 2.6),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
        );
        relayGroup.add(relayPcb);

        [-0.8, 0.8].forEach(x => {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 1.2, 1.6),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25 }) // Songle blue
          );
          cube.position.set(x, 0.68, -0.2);
          cube.castShadow = true;
          relayGroup.add(cube);

          // Green screw terminal block
          const term = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.8, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 })
          );
          term.position.set(x, 0.48, 0.95);
          relayGroup.add(term);
        });

        levitateGroup.add(relayGroup);

        // 5. Source Current Sensor (SCT-013 Split Core Clip-On)
        const sctGroup = new THREE.Group();
        sctGroup.position.set(2.0, 1.4, 2.0);

        const sctBody = new THREE.Mesh(
          new THREE.TorusGeometry(1.25, 0.45, 16, 32),
          new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
        );
        sctBody.rotation.x = Math.PI / 2;
        sctBody.castShadow = true;
        sctGroup.add(sctBody);

        const hinge = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.6, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
        );
        hinge.position.set(0, 0, 1.4);
        sctGroup.add(hinge);

        levitateGroup.add(sctGroup);

        // 6. Consumer Current Sensor (ACS712 Purple PCB)
        const acsGroup = new THREE.Group();
        acsGroup.position.set(5.5, 0.3, 2.0);

        const acsPcb = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 0.18, 2.8),
          new THREE.MeshStandardMaterial({ color: 0x6b21a8, roughness: 0.4 })
        );
        acsGroup.add(acsPcb);

        const acsIc = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.2, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 })
        );
        acsIc.position.set(0, 0.15, 0.2);
        acsGroup.add(acsIc);

        const acsTerm = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.85, 0.9),
          new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 })
        );
        acsTerm.position.set(0, 0.48, -0.9);
        acsGroup.add(acsTerm);

        levitateGroup.add(acsGroup);

        // 7. Overhead Feeder Utility Line Busbars
        const poleGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.8, 16);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.5 });

        [-1, 1].forEach(side => {
          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.set(3.2 * side + 3.0, 1.9, -0.8);
          pole.castShadow = true;
          levitateGroup.add(pole);

          // Ceramic insulator bell
          const bell = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.15, 0.45, 12),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.1 })
          );
          bell.position.set(3.2 * side + 3.0, 3.7, -0.8);
          levitateGroup.add(bell);
        });

        // Overhead Live Copper Feeder Cable
        const mainLineCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.5, 3.7, -0.8),
          new THREE.Vector3(2.5, 3.5, -0.8),
          new THREE.Vector3(5.5, 3.52, -0.8),
          new THREE.Vector3(6.8, 3.7, -0.8)
        ]);
        const mainWireGeo = new THREE.TubeGeometry(mainLineCurve, 32, 0.08, 8, false);
        const mainWireMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.2 });
        const mainWire = new THREE.Mesh(mainWireGeo, mainWireMat);
        levitateGroup.add(mainWire);

        // Clandestine Tapping Bypass Wire (Theft Hook Wire)
        const hookCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(3.8, 3.5, -0.8),
          new THREE.Vector3(4.0, 2.4, 0.6),
          new THREE.Vector3(4.4, 0.8, 1.4)
        ]);
        const hookWireGeo = new THREE.TubeGeometry(hookCurve, 24, 0.06, 8, false);
        const hookWireMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e }); // Alert Pink/Crimson
        const hookWire = new THREE.Mesh(hookWireGeo, hookWireMat);
        levitateGroup.add(hookWire);

        // Orbit Interaction Handler
        let isDragging = false;
        let prevMouse = { x: 0, y: 0 };
        let rotY = -0.45;
        let rotX = 0.25;
        let autoRotate = true;
        let isWireframe = false;

        container.addEventListener('mousedown', (e) => {
          isDragging = true;
          prevMouse = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => { isDragging = false; });

        container.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - prevMouse.x;
          const dy = e.clientY - prevMouse.y;
          rotY += dx * 0.007;
          rotX += dy * 0.007;
          rotX = Math.max(-0.25, Math.min(1.0, rotX));
          prevMouse = { x: e.clientX, y: e.clientY };
        });

        // Wheel Zoom
        container.addEventListener('wheel', (e) => {
          e.preventDefault();
          const zoomDelta = e.deltaY * 0.015;
          camera.position.z = Math.max(9, Math.min(24, camera.position.z + zoomDelta));
          camera.position.x = Math.max(7, Math.min(20, camera.position.x + zoomDelta * 0.8));
          camera.position.y = Math.max(6, Math.min(18, camera.position.y + zoomDelta * 0.6));
        }, { passive: false });

        // Overlay Controls Binding
        const resetBtn = document.getElementById('btnResetPrototypeCamera');
        if (resetBtn) {
          resetBtn.onclick = () => {
            rotY = -0.45;
            rotX = 0.25;
            camera.position.set(13, 11, 15);
            camera.lookAt(0, 0.5, 0);
          };
        }

        const autoBtn = document.getElementById('btnTogglePrototypeAutoRotate');
        if (autoBtn) {
          autoBtn.onclick = () => {
            autoRotate = !autoRotate;
            autoBtn.textContent = autoRotate ? 'Auto-Orbit: ON' : 'Auto-Orbit: OFF';
            autoBtn.style.color = autoRotate ? '#0284c7' : '#64748b';
          };
        }

        const wireframeBtn = document.getElementById('btnTogglePrototypeWireframe');
        if (wireframeBtn) {
          wireframeBtn.onclick = () => {
            isWireframe = !isWireframe;
            levitateGroup.traverse((child) => {
              if (child.isMesh && child.material) {
                child.material.wireframe = isWireframe;
              }
            });
            wireframeBtn.textContent = isWireframe ? 'Shaded Mode' : 'Wireframe';
          };
        }

        // Animation Loop with Anti-Gravity Levitation & Dynamic Shadow Scaling
        const clock = new THREE.Clock();
        const animate = () => {
          requestAnimationFrame(animate);
          const t = clock.getElapsedTime();

          if (autoRotate && !isDragging) {
            rotY += 0.005;
          }

          // Anti-Gravity Levitation Math: Harmonic Vertical Float + Gentle Tilt
          const floatY = Math.sin(t * 1.5) * 0.42;
          const floatPitch = Math.sin(t * 1.1) * 0.025;
          const floatRoll = Math.cos(t * 1.3) * 0.02;

          levitateGroup.position.y = floatY;
          levitateGroup.rotation.y = rotY + floatRoll;
          levitateGroup.rotation.x = rotX + floatPitch;

          // Shadow dynamically shrinks and fades as the prototype floats up
          const shadowScale = 1.0 - (floatY * 0.15);
          groundShadow.scale.set(shadowScale, shadowScale, 1);
          blobShadow.scale.set(shadowScale, shadowScale, 1);

          camera.lookAt(0, 0.5, 0);
          renderer.render(scene, camera);
        };
        animate();

        // Responsive Resize
        window.addEventListener('resize', () => {
          const w = container.clientWidth || 650;
          const h = container.clientHeight || 480;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        });
      });
    },

    // -------------------------------------------------------------------------
    // PAGE 2: Individual Hardware Component Levitating 3D Digital Twins
    // -------------------------------------------------------------------------
    initSingleComponentViewer(containerId, componentType) {
      ensureThreeLoaded(() => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        const width = container.clientWidth || 340;
        const height = container.clientHeight || 240;

        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
        camera.position.set(0, 2.5, 5.8);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        this.setupStudioLighting(scene, false);

        // Ground shadow dot
        const shadowDot = new THREE.Mesh(
          new THREE.CircleGeometry(1.8, 24),
          new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.12 })
        );
        shadowDot.rotation.x = -Math.PI / 2;
        shadowDot.position.y = -1.6;
        scene.add(shadowDot);

        const compGroup = new THREE.Group();
        scene.add(compGroup);

        // Procedural High-Fidelity Geometry per Component
        if (componentType === 'esp32') {
          // ESP32 Microcontroller
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.16, 4.2),
            new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.4 })
          );
          compGroup.add(pcb);

          const shield = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.28, 2.0),
            new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 })
          );
          shield.position.set(0, 0.22, 0.6);
          compGroup.add(shield);

          // Golden Pins
          for (let z = -1.6; z <= 1.6; z += 0.32) {
            [-1.15, 1.15].forEach(x => {
              const pin = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.35, 0.06),
                new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95 })
              );
              pin.position.set(x, -0.16, z);
              compGroup.add(pin);
            });
          }

          // Glowing Cyan Active LED
          const led = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.12, 0.16),
            new THREE.MeshBasicMaterial({ color: 0x00f0ff })
          );
          led.position.set(-0.7, 0.14, -1.4);
          compGroup.add(led);

        } else if (componentType === 'source-ct') {
          // SCT-013 Split-Core Current Sensor
          const clamp = new THREE.Mesh(
            new THREE.TorusGeometry(1.3, 0.45, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3 })
          );
          compGroup.add(clamp);

          const core = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 2.7, 16),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
          );
          core.position.set(-1.15, 0, 0);
          compGroup.add(core);

          const cord = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
            new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 })
          );
          cord.position.set(0, -1.8, 0);
          compGroup.add(cord);

        } else if (componentType === 'consumer-ct') {
          // ACS712 Hall-Effect Sensor
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.16, 3.2),
            new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.4 }) // Purple PCB
          );
          compGroup.add(pcb);

          const term = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.8, 0.9),
            new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 })
          );
          term.position.set(0, 0.45, -1.0);
          compGroup.add(term);

          const ic = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.18, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 })
          );
          ic.position.set(0, 0.14, 0.3);
          compGroup.add(ic);

        } else if (componentType === 'voltage-module') {
          // ZMPT101B Voltage Transformer Module
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.16, 3.0),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
          );
          compGroup.add(pcb);

          const trans = new THREE.Mesh(
            new THREE.CylinderGeometry(0.75, 0.75, 1.25, 20),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
          );
          trans.position.set(0, 0.68, -0.4);
          compGroup.add(trans);

          // Blue Trimpot
          const pot = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 })
          );
          pot.position.set(0.6, 0.32, 0.8);
          compGroup.add(pot);

        } else if (componentType === 'relay-module') {
          // 5V Dual Relay Module
          const pcb = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 0.16, 2.6),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
          );
          compGroup.add(pcb);

          [-0.7, 0.7].forEach(x => {
            const cube = new THREE.Mesh(
              new THREE.BoxGeometry(1.1, 1.0, 1.3),
              new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25 })
            );
            cube.position.set(x, 0.55, -0.2);
            compGroup.add(cube);
          });

        } else if (componentType === 'power-line') {
          // Utility Distribution Pole
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.22, 3.8, 16),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 })
          );
          compGroup.add(pole);

          const crossarm = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.22, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 })
          );
          crossarm.position.set(0, 1.3, 0);
          compGroup.add(crossarm);

          [-1.3, 0, 1.3].forEach(x => {
            const ins = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.16, 0.45, 12),
              new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.1 })
            );
            ins.position.set(x, 1.6, 0);
            compGroup.add(ins);
          });
        }

        // Interactive Mouse Orbit for Component
        let isDragging = false;
        let prevX = 0;
        let rotY = 0;

        container.addEventListener('mousedown', (e) => {
          isDragging = true;
          prevX = e.clientX;
        });

        window.addEventListener('mouseup', () => { isDragging = false; });

        container.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - prevX;
          rotY += dx * 0.012;
          prevX = e.clientX;
        });

        // Animation Loop with Anti-Gravity Levitation
        const clock = new THREE.Clock();
        const animate = () => {
          requestAnimationFrame(animate);
          const t = clock.getElapsedTime();

          if (!isDragging) {
            rotY += 0.01;
          }

          const floatY = Math.sin(t * 1.8) * 0.22;
          compGroup.position.y = floatY;
          compGroup.rotation.y = rotY;
          compGroup.rotation.x = 0.28 + Math.sin(t * 1.4) * 0.06;

          // Shadow blob adjusts with float
          const sScale = 1.0 - floatY * 0.3;
          shadowDot.scale.set(sScale, sScale, 1);

          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        };
        animate();
      });
    }
  };

  window.VoltGuard3D = VoltGuard3D;
})();
