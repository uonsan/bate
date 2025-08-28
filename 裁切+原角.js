(function (Scratch) {
  'use strict';

  const vm = Scratch.vm;

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('圖片載入失敗：' + url));
      img.src = String(url);
    });
  }

  function fmtToMime(fmt) {
    const f = String(fmt || 'png').toLowerCase();
    if (f === 'jpeg' || f === 'jpg') return 'image/jpeg';
    if (f === 'webp') return 'image/webp';
    return 'image/png';
  }

  function toNum(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }

  class CropURL {
    getInfo() {
      return {
        id: 'cropURL',
        name: '裁切URL',
        color1: '#2f80ed',
        color2: '#1c6dd0',
        color3: '#185fb6',
        blocks: [
          {
            opcode: 'crop',
            blockType: Scratch.BlockType.REPORTER,
            text: '裁切URL [URL] x [X] y [Y] 寬 [W] 高 [H] 單位 [UNIT] 圓角 [R] 格式 [FMT] 品質 [Q]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              UNIT: { type: Scratch.ArgumentType.STRING, menu: 'units', defaultValue: 'px' },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              FMT: { type: Scratch.ArgumentType.STRING, menu: 'fmts', defaultValue: 'png' },
              Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.92 }
            }
          },
          {
            opcode: 'circleCrop',
            blockType: Scratch.BlockType.REPORTER,
            text: '圓形裁切URL [URL] 中心x [CX] y [CY] 半徑 [RAD] 單位 [UNIT] 格式 [FMT] 品質 [Q]',
            arguments: {
              URL: { type: Scratch.ArgumentType.STRING, defaultValue: 'https://extensions.turbowarp.org/dango.png' },
              CX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              CY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              RAD: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              UNIT: { type: Scratch.ArgumentType.STRING, menu: 'units', defaultValue: '%' },
              FMT: { type: Scratch.ArgumentType.STRING, menu: 'fmts', defaultValue: 'png' },
              Q: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.92 }
            }
          }
        ],
        menus: {
          units: {
            acceptReporters: true,
            items: [
              { text: '像素(px)', value: 'px' },
              { text: '百分比(%)', value: '%' }
            ]
          },
          fmts: {
            acceptReporters: true,
            items: [
              { text: 'PNG', value: 'png' },
              { text: 'JPEG', value: 'jpeg' },
              { text: 'WebP', value: 'webp' }
            ]
          }
        }
      };
    }

    async crop(args) {
      const url = String(args.URL || '');
      const X = toNum(args.X, 0);
      const Y = toNum(args.Y, 0);
      const W = Math.max(1, toNum(args.W, 1));
      const H = Math.max(1, toNum(args.H, 1));
      const unit = String(args.UNIT || 'px').toLowerCase();
      const R = Math.max(0, toNum(args.R, 0));
      const fmt = fmtToMime(args.FMT);
      const q = Math.max(0, Math.min(1, toNum(args.Q, 0.92)));
      try {
        const img = await loadImage(url);
        let sx = X, sy = Y, sw = W, sh = H;
        if (unit === '%') {
          sx = img.width * (X / 100);
          sy = img.height * (Y / 100);
          sw = img.width * (W / 100);
          sh = img.height * (H / 100);
        }

        sx = Math.max(0, Math.min(img.width, sx));
        sy = Math.max(0, Math.min(img.height, sy));
        sw = Math.max(1, Math.min(img.width - sx, sw));
        sh = Math.max(1, Math.min(img.height - sy, sh));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');

        if (R > 0) {
          ctx.beginPath();
          ctx.moveTo(R, 0);
          ctx.lineTo(sw - R, 0);
          ctx.quadraticCurveTo(sw, 0, sw, R);
          ctx.lineTo(sw, sh - R);
          ctx.quadraticCurveTo(sw, sh, sw - R, sh);
          ctx.lineTo(R, sh);
          ctx.quadraticCurveTo(0, sh, 0, sh - R);
          ctx.lineTo(0, R);
          ctx.quadraticCurveTo(0, 0, R, 0);
          ctx.closePath();
          ctx.clip();
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        return (fmt === 'image/png')
          ? canvas.toDataURL(fmt)
          : canvas.toDataURL(fmt, q);
      } catch (e) {
        return '' + e.message;
      }
    }

    async circleCrop(args) {
      const url = String(args.URL || '');
      let CX = toNum(args.CX, 50);
      let CY = toNum(args.CY, 50);
      let RAD = Math.max(1, toNum(args.RAD, 50));
      const unit = String(args.UNIT || '%').toLowerCase();
      const fmt = fmtToMime(args.FMT);
      const q = Math.max(0, Math.min(1, toNum(args.Q, 0.92)));

      try {
        const img = await loadImage(url);
        if (unit === '%') {
          CX = img.width * (CX / 100);
          CY = img.height * (CY / 100);
          RAD = Math.min(img.width, img.height) * (RAD / 100);
        }

        const canvas = document.createElement('canvas');
        canvas.width = RAD * 2;
        canvas.height = RAD * 2;
        const ctx = canvas.getContext('2d');

        ctx.beginPath();
        ctx.arc(RAD, RAD, RAD, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, CX - RAD, CY - RAD, RAD * 2, RAD * 2, 0, 0, RAD * 2, RAD * 2);

        return (fmt === 'image/png')
          ? canvas.toDataURL(fmt)
          : canvas.toDataURL(fmt, q);
      } catch (e) {
        return '' + e.message;
      }
    }
  }

  Scratch.extensions.register(new CropURL());
})(Scratch);
