import React, { useRef, useEffect, memo } from 'react';

/**
 * Advanced 3D Neural Cloud
 * - Irregular clustered form.
 * - Staggered synaptic growth (lines appear gradually).
 * - Technical labels and green aesthetic.
 */
export default memo(function NeuralCanvas({ active = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    nodes: [],
    connections: [],
    growthProgress: 0,
    time: 0,
    width: 0,
    height: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrame;

    const labels = ['INPUT(A)', 'INPUT(B)', 'RELU', 'SIGMOID', 'BIAS', 'LAYER_1', 'LAYER_2', 'WEIGHTS', 'CORE', 'SYNAPSE', 'GATE_X', 'TENSOR', 'DENSE'];

    const initNetwork = (w, h) => {
      const nodes = [];
      const nodeCount = 180;
      const hubs = [
        { x: 0, y: 0, z: 0 },
        { x: 150, y: -80, z: 50 },
        { x: -120, y: 120, z: -60 },
        { x: 60, y: -150, z: -100 }
      ];
      
      // Create Clusters around hubs
      for (let i = 0; i < nodeCount; i++) {
        const hub = hubs[i % hubs.length];
        const radius = (Math.random() * 120) * (Math.random() > 0.7 ? 2.5 : 1.0); // Mix of tight and loose

        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;

        nodes.push({
          x: hub.x + radius * Math.sin(theta) * Math.cos(phi),
          y: hub.y + radius * Math.sin(theta) * Math.sin(phi),
          z: hub.z + radius * Math.cos(theta),
          size: 0.8 + Math.random() * 1.6,
          label: i < labels.length ? labels[i] : (Math.random() > 0.96 ? `0x${Math.floor(Math.random()*255).toString(16)}` : null)
        });
      }

      // Pre-calculate connections with staggered delays
      const connections = [];
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        const targets = nodes
          .map((n, idx) => ({ idx, d: Math.hypot(n1.x - n.x, n1.y - n.y, n1.z - n.z) }))
          .filter(t => t.idx !== i && t.d < 200)
          .sort((a, b) => a.d - b.d)
          .slice(0, 5);

        targets.forEach(t => {
          if (!connections.find(c => (c.a === i && c.b === t.idx) || (c.a === t.idx && c.b === i))) {
            connections.push({ 
              a: i, 
              b: t.idx, 
              delay: Math.random(), // Random delay factor [0, 1]
              speed: 0.5 + Math.random() * 0.5 // Variable growth speed
            });
          }
        });
      }

      stateRef.current.nodes = nodes;
      stateRef.current.connections = connections;
    };

    const project = (node, time, w, h) => {
      const ry = time * 0.12;
      const rx = time * 0.08;

      let x = node.x * Math.cos(ry) - node.z * Math.sin(ry);
      let z = node.x * Math.sin(ry) + node.z * Math.cos(ry);
      let y = node.y * Math.cos(rx) - z * Math.sin(rx);
      z = node.y * Math.sin(rx) + z * Math.cos(rx);

      const focal = 600;
      const p = focal / (focal + z);
      
      return {
        px: x * p + w / 2,
        py: y * p + h / 2,
        p,
        z
      };
    };

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      
      stateRef.current.width = w;
      stateRef.current.height = h;
      initNetwork(w, h);
    };

    const draw = () => {
      const { width: w, height: h, nodes, connections } = stateRef.current;
      if (w === 0 || h === 0) return;

      stateRef.current.time += 0.003;
      const time = stateRef.current.time;

      // Update growth progress (Slower for smoothness)
      if (active) {
        stateRef.current.growthProgress = Math.min(1.5, stateRef.current.growthProgress + 0.008);
      } else {
        stateRef.current.growthProgress = Math.max(0, stateRef.current.growthProgress - 0.012);
      }

      const growth = stateRef.current.growthProgress;

      ctx.clearRect(0, 0, w, h);
      
      const projected = nodes.map(n => project(n, time, w, h));

      // Draw Connections (Smoother Staggered Neural Growth)
      if (growth > 0.01) {
        ctx.lineWidth = 0.5;
        connections.forEach(c => {
          // Individual progress based on delay
          // Fade in: staggered by delay
          // Fade out: staggered by delay (using 1.5 range to ensure gradual disappearance)
          const range = 0.6; // How long it takes for a single line to grow/fade
          const individualProgress = Math.max(0, Math.min(1, (growth - c.delay) / range));
          
          if (individualProgress <= 0) return;

          const p1 = projected[c.a];
          const p2 = projected[c.b];
          
          const depth = (p1.z + p2.z) / 2;
          // Smooth easing for opacity
          const ease = individualProgress * (2 - individualProgress); // Simple quadratic ease-out
          const opacity = Math.max(0, (250 - depth) / 500) * ease * 0.4;
          
          if (opacity < 0.01) return;

          ctx.strokeStyle = `rgba(0, 255, 120, ${opacity})`;
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          
          // Partial line drawing for "growing" effect
          const tx = p1.px + (p2.px - p1.px) * individualProgress;
          const ty = p1.py + (p2.py - p1.py) * individualProgress;
          ctx.lineTo(tx, ty);
          ctx.stroke();
        });
      }

      // Draw Nodes
      projected.forEach((p, i) => {
        const node = nodes[i];
        const opacity = Math.max(0.1, (350 - p.z) / 700);
        
        ctx.fillStyle = `rgba(0, 255, 102, ${opacity})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, node.size * p.p, 0, Math.PI * 2);
        ctx.fill();

        if (growth > 0.5) {
          ctx.shadowBlur = 4 * p.p * growth;
          ctx.shadowColor = '#0f0';
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Labels
        if (node.label && opacity > 0.4) {
          ctx.font = `${Math.floor(8 * p.p)}px "Fira Code", monospace`;
          ctx.fillStyle = `rgba(0, 255, 150, ${opacity * 0.6})`;
          ctx.fillText(node.label, p.px + 8 * p.p, p.py + 3 * p.p);
        }
      });

      animationFrame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        background: '#010102',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
});
