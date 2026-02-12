// Paper.js --- 無限に広がりうる紙
// Author: katahiromz, Improved by Gemini
// License: MIT

"use strict";

class Paper {
  static g_sizingOnly = false;

  constructor(width_ = 1, height_ = 1, bgColor_ = 'white') {
    this.canvas = document.createElement('canvas');
    this.originX = 0;
    this.originY = 0;
    this.cx = 0;
    this.cy = 0;
    this.bgColor = bgColor_;
    this.lineWidth = 1.0;
    this.strokeStyle = "#000";
    this.fillStyle = "#000";
    this.font = "16px sans-serif";
    this.textAlign = "left"; // "left", "right", "center", "start", "end"
    this.textBaseline = "alphabetic"; // "top", "hanging", "middle", "alphabetic", "ideographic", "bottom"
    this.setSize(width_, height_);
  }

  setSize(width_, height_) {
    if (width_ <= 0 || height_ <= 0) return this;
    this.cx = width_;
    this.cy = height_;
    this.canvas.width = width_;
    this.canvas.height = height_;
    this.clear();
    return this;
  }

  clear() {
    const ctx = this.canvas.getContext('2d');
    if (this.bgColor) {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, this.cx, this.cy);
    } else {
      ctx.clearRect(0, 0, this.cx, this.cy);
    }
    return this;
  }

  // 現在のオフセットを考慮したコンテキストを取得
  getContext(contentType = '2d', options = {}) {
    const ctx = this.canvas.getContext(contentType, options);
    if (contentType === '2d') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(-this.originX, -this.originY);
    }
    return ctx;
  }

  // 領域を確保する
  ensureRect(x, y, w, h) {
    // 1. 描画対象の矩形範囲を計算
    let x0 = Math.min(x, x + w), y0 = Math.min(y, y + h);
    let x1 = Math.max(x, x + w), y1 = Math.max(y, y + h);

    const left = Math.floor(x0), top = Math.floor(y0);
    const right = Math.ceil(x1), bottom = Math.ceil(y1);

    const curLeft = this.originX, curRight = this.originX + this.cx;
    const curTop = this.originY, curBottom = this.originY + this.cy;

    // 現在の範囲に収まっているなら何もしない
    if (left >= curLeft && right <= curRight && top >= curTop && bottom <= curBottom)
      return this;

    // 2. 新しい境界を計算（バッファを追加）
    const buffer = 256; 
    const newLeft = (left < curLeft) ? Math.min(left, curLeft - buffer) : curLeft;
    const newRight = (right > curRight) ? Math.max(right, curRight + buffer) : curRight;
    const newTop = (top < curTop) ? Math.min(top, curTop - buffer) : curTop;
    const newBottom = (bottom > curBottom) ? Math.max(bottom, curBottom + buffer) : curBottom;

    const newWidth = newRight - newLeft;
    const newHeight = newBottom - newTop;

    // 3. メモリの再割り当てとコピー
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.cx;
    tempCanvas.height = this.cy;
    tempCanvas.getContext('2d').drawImage(this.canvas, 0, 0);

    this.cx = newWidth;
    this.cy = newHeight;
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    this.clear(); // 背景色で初期化

    // 4. 元の絵を新しい位置（オフセット）に合わせて再描画
    const offsetX = curLeft - newLeft;
    const offsetY = curTop - newTop;
    this.canvas.getContext('2d').drawImage(tempCanvas, offsetX, offsetY);

    this.originX = newLeft;
    this.originY = newTop;

    return this;
  }

  drawImage(image, ...args) {
    let sx, sy, sW, sH, dx, dy, dW, dH;
    const img = (image instanceof Paper) ? image.canvas : image;

    if (args.length === 2) { // dx, dy
      [dx, dy] = args;
      [sx, sy, sW, sH, dW, dH] = [0, 0, img.width, img.height, img.width, img.height];
    } else if (args.length === 4) { // dx, dy, dw, dh
      [dx, dy, dW, dH] = args;
      [sx, sy, sW, sH] = [0, 0, img.width, img.height];
    } else {
      [sx, sy, sW, sH, dx, dy, dW, dH] = args;
    }

    this.ensureRect(dx, dy, dW, dH);
    if (!Paper.g_sizingOnly) {
      this.getContext().drawImage(img, sx, sy, sW, sH, dx, dy, dW, dH);
    }
    return this;
  }

  line(x0, y0, x1, y1) {
    const lw = this.lineWidth;
    this.ensureRect(Math.min(x0, x1) - lw, Math.min(y0, y1) - lw, Math.abs(x1 - x0) + lw * 2, Math.abs(y1 - y0) + lw * 2);

    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.lineWidth = lw;
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    return this;
  }

  strokeRect(x, y, w, h) {
    const lw = this.lineWidth;
    this.ensureRect(x - lw, y - lw, w + lw * 2, h + lw * 2);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.lineWidth = lw;
      ctx.strokeStyle = this.strokeStyle;
      ctx.strokeRect(x, y, w, h);
    }
    return this;
  }

  fillRect(x, y, w, h) {
    this.ensureRect(x, y, w, h);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.fillStyle = this.fillStyle;
      ctx.fillRect(x, y, w, h);
    }
    return this;
  }

  strokeCircle(x, y, radius) {
    const lw = this.lineWidth;
    const r = radius + lw;
    this.ensureRect(x - r, y - r, r * 2, r * 2);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.lineWidth = lw;
      ctx.strokeStyle = this.strokeStyle;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    return this;
  }

  fillCircle(x, y, radius) {
    this.ensureRect(x - radius, y - radius, radius * 2, radius * 2);
    if (!Paper.g_sizingOnly) {
      const ctx = this.getContext();
      ctx.fillStyle = this.fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    return this;
  }

  // テキスト描画
  fillText(text, x, y, maxWidth = undefined) {
    const ctx = this.getContext();
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    // 1. 描画サイズを計測
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;

    // --- フォントサイズ抽出の堅牢化 ---
    // 正規表現で "30px" や "1.5rem" などの数値部分を抽出する
    // マッチしない場合のフォールバックとして 16px を使用
    const fontSizeMatch = this.font.match(/(\d+(?:\.\d+)?)(px|pt|em|rem|vh|vw|dvh|dvw)/);
    const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : 16;
    
    // 配置（Alignment）に応じたx座標のオフセット調整
    let offsetX = 0;
    if (this.textAlign === 'center') offsetX = -textWidth / 2;
    else if (this.textAlign === 'right' || this.textAlign === 'end') offsetX = -textWidth;

    // ベースラインに応じたy座標のオフセット調整
    let offsetY = -fontSize; 
    if (this.textBaseline === 'top') offsetY = 0;
    else if (this.textBaseline === 'middle') offsetY = -fontSize / 2;
    else if (this.textBaseline === 'bottom') offsetY = -fontSize;

    // 2. 領域確保（少し余裕を持たせる）
    this.ensureRect(x + offsetX, y + offsetY, textWidth, fontSize * 1.2);

    // 3. 描画
    if (!Paper.g_sizingOnly) {
      const drawCtx = this.getContext(); // リサイズされた可能性があるため再取得
      drawCtx.font = this.font;
      drawCtx.textAlign = this.textAlign;
      drawCtx.textBaseline = this.textBaseline;
      drawCtx.fillStyle = this.fillStyle;
      drawCtx.fillText(text, x, y, maxWidth);
    }
    return this;
  }
}
