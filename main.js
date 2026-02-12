// main.js --- Infinity Paper demo
// Author: katahiromz
// License: MIT

document.addEventListener('DOMContentLoaded', function(){
  const displayCanvas = document.getElementById('my-canvas');
  const displayCtx = displayCanvas.getContext('2d');
  let paper = null;

  // 状態管理
  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;
  let isFirstResize = true; // 初回配置フラグを追加

  // タッチ管理用のマップ
  const activePointers = new Map();
  let lastTouchDistance = 0;
  let isDragging = false; // 中央ボタン移動用
  let isDrawing = false;  // 左ボタン描画用
  let isErasing = false; // 右ボタン消しゴム用フラグ
  let lastMouseX = 0;
  let lastMouseY = 0;

  // スクリーン座標をPaper上の座標に変換する関数
  function getPaperCoord(clientX, clientY) {
    const rect = displayCanvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale
    };
  }

  function resize() {
    let width = window.innerWidth, height = window.innerHeight;
    displayCanvas.width = width;
    displayCanvas.height = height;

    if (isFirstResize) {
      isFirstResize = false;

      paper = new Paper(width, height, "white");
      paper.fillStyle = "black";
      paper.font = "20px sans-serif";
      paper.textAlign = "center";
      paper.textBaseline = "middle";
      paper.fillText("Infinity Paper", width / 2, height / 3);
      paper.fillText("Draw something", width / 2, height / 2);
    }

    draw();
  }
  window.addEventListener('resize', resize);

  function draw() {
    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.save();
    displayCtx.translate(offsetX, offsetY);
    displayCtx.scale(scale, scale);
    displayCtx.drawImage(paper.canvas, paper.originX, paper.originY);
    displayCtx.restore();
  }

  // --- ズーム ---
  // マウスホイールでのズームも維持
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const factor = Math.pow(0.999, e.deltaY);
    const newScale = scale * factor;
    offsetX = e.clientX - (e.clientX - offsetX) * (newScale / scale);
    offsetY = e.clientY - (e.clientY - offsetY) * (newScale / scale);
    scale = newScale;
    draw();
  }, { passive: false });

  // --- マウス操作 ---
  // ポインターダウン (マウス・指・ペン共通)
  window.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, e);
    const coord = getPaperCoord(e.clientX, e.clientY);

    if (activePointers.size === 1) {
      if (e.pointerType === 'touch') {
        // タッチの場合、1本指は描画
        isDrawing = true;
      } else {
        // マウスの場合、既存のボタン判定
        if (e.button === 0) isDrawing = true;
        if (e.button === 1) isDragging = true;
        if (e.button === 2) isErasing = true;
      }
      lastMouseX = (e.pointerType === 'touch') ? coord.x : (isDragging ? e.clientX : coord.x);
      lastMouseY = (e.pointerType === 'touch') ? coord.y : (isDragging ? e.clientY : coord.y);
    } else if (activePointers.size === 2) {
      // 2本指になったら描画を中断して移動・ズームモードへ
      isDrawing = false;
      isErasing = false;
      isDragging = true;
      
      const pts = Array.from(activePointers.values());
      lastTouchDistance = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
      // 2本指の中間点を前回の位置とする
      lastMouseX = (pts[0].clientX + pts[1].clientX) / 2;
      lastMouseY = (pts[0].clientY + pts[1].clientY) / 2;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, e);

    if (activePointers.size === 1) {
      const coord = getPaperCoord(e.clientX, e.clientY);
      if (isDrawing || isErasing) {
        paper.strokeStyle = isErasing ? (paper.bgColor || "white") : "black";
        paper.lineWidth = isErasing ? 40 : 5;
        paper.line(lastMouseX, lastMouseY, coord.x, coord.y);
        lastMouseX = coord.x; lastMouseY = coord.y;
        draw();
      } else if (isDragging) {
        offsetX += e.clientX - lastMouseX;
        offsetY += e.clientY - lastMouseY;
        lastMouseX = e.clientX; lastMouseY = e.clientY;
        draw();
      }
    } else if (activePointers.size === 2 && isDragging) {
      const pts = Array.from(activePointers.values());
      const midX = (pts[0].clientX + pts[1].clientX) / 2;
      const midY = (pts[0].clientY + pts[1].clientY) / 2;
      const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);

      // ピンチズーム計算
      const zoomFactor = dist / lastTouchDistance;
      const newScale = scale * zoomFactor;
      
      // 中間点を基準にズーム
      offsetX = midX - (midX - offsetX) * (newScale / scale);
      offsetY = midY - (midY - offsetY) * (newScale / scale);
      
      // 移動分も加算
      offsetX += midX - lastMouseX;
      offsetY += midY - lastMouseY;

      scale = newScale;
      lastTouchDistance = dist;
      lastMouseX = midX;
      lastMouseY = midY;
      draw();
    }
  });

  const stopAction = (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) lastTouchDistance = 0;
    if (activePointers.size === 0) {
      isDrawing = isErasing = isDragging = false;
    }
  };

  window.addEventListener('pointerup', stopAction);
  window.addEventListener('pointercancel', stopAction);

  // --- コンテキストメニューの無効化 ---
  // 右クリック時のメニューを禁止することで、右ドラッグ消しゴムをスムーズにします
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // エクスポート機能
  const exportBtn = document.getElementById('export-btn');
  exportBtn.addEventListener('click', () => {
    // 1. Paperクラスが保持している実体キャンバスからDataURL（画像データ）を取得
    // ※ 画面上の displayCanvas ではなく、描画の本体である paper.canvas を使用します
    const dataURL = paper.canvas.toDataURL("image/png");

    // 2. 一時的なリンク要素を作成してダウンロードを実行
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `infinity-paper-${new Date().getTime()}.png`; // ファイル名にタイムスタンプを付与
    
    // 3. クリックをシミュレートしてダウンロード開始
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  resize();
});
