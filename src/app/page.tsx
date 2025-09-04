"use client";
import { useState, useEffect, useRef } from "react";
import CanvasImage, { type PixelCoords, type PixelColor } from "react-canvas-img";

export default function App() {
  const [previewMode, setPreviewMode] = useState(false);
  const [activePreview, setActivePreview] = useState<number | null>(null);


  const [imageSrc, setImageSrc] = useState<string | File>("/sample.png"); // default image
  const [width] = useState("900");
  const [height] = useState<string>("auto");
  const [showAllMode, setShowAllMode] = useState(false);

  const [clickedPixel, setClickedPixel] = useState<{
    coords: PixelCoords;
    color: PixelColor;
  } | null>(null);

  const [hoverPixel, setHoverPixel] = useState<{
    coords: PixelCoords;
    color: PixelColor;
  } | null>(null);

  const [clickedPoints, setClickedPoints] = useState<PixelCoords[]>([]);
  const [lines, setLines] = useState<{ from: PixelCoords; to: PixelCoords }[]>([]);
  const [savedPreviews, setSavedPreviews] = useState<
    { id: number; points: PixelCoords[] }[]
  >([]);

  const [status, setStatus] = useState<string>("Idle");

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const parseSize = (val: string): number | undefined =>
    val === "auto" || val.trim() === "" ? undefined : parseInt(val, 10);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.src = typeof imageSrc === "string" ? imageSrc : URL.createObjectURL(imageSrc);
    img.onload = () => {
      imgRef.current = img;
      drawExtras();
    };
  }, [imageSrc]);

  const drawExtras = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imgRef.current;
    if (!ctx || !canvas || !img) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / img.width;
    const scaleY = canvas.height / img.height;

    if (previewMode) {
      ctx.save();

      if (showAllMode && savedPreviews.length > 0) {

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        savedPreviews.forEach((preview) => {
          const pts = preview.points;

          ctx.strokeStyle = "purple";
          ctx.lineWidth = 2;
          for (let i = 0; i < pts.length; i++) {
            const from = pts[i];
            const to = pts[(i + 1) % pts.length];
            ctx.beginPath();
            ctx.moveTo(from.x * scaleX, from.y * scaleY);
            ctx.lineTo(to.x * scaleX, to.y * scaleY);
            ctx.stroke();
          }

          ctx.fillStyle = "purple";
          pts.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x * scaleX, point.y * scaleY, 3, 0, 2 * Math.PI);
            ctx.fill();
          });
        });

        ctx.restore();
        return;
      }

      // Single polygon preview (normal clipping)
      if (clickedPoints.length > 2) {
        ctx.beginPath();
        ctx.moveTo(clickedPoints[0].x * scaleX, clickedPoints[0].y * scaleY);
        for (let i = 1; i < clickedPoints.length; i++) {
          ctx.lineTo(clickedPoints[i].x * scaleX, clickedPoints[i].y * scaleY);
        }
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      ctx.restore();
      return;
    }


    // --- Normal Mode ---
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (showAllMode && savedPreviews.length > 0) {
      savedPreviews.forEach((preview) => {
        const pts = preview.points;

        ctx.strokeStyle = "purple";
        ctx.lineWidth = 2;
        for (let i = 0; i < pts.length; i++) {
          const from = pts[i];
          const to = pts[(i + 1) % pts.length];
          ctx.beginPath();
          ctx.moveTo(from.x * scaleX, from.y * scaleY);
          ctx.lineTo(to.x * scaleX, to.y * scaleY);
          ctx.stroke();
        }

        ctx.fillStyle = "purple";
        pts.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x * scaleX, point.y * scaleY, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    }

    // Normal clicked points + lines
    ctx.strokeStyle = "red";
    lines.forEach(({ from, to }) => {
      ctx.beginPath();
      ctx.moveTo(from.x * scaleX, from.y * scaleY);
      ctx.lineTo(to.x * scaleX, to.y * scaleY);
      ctx.stroke();
    });

    ctx.fillStyle = "blue";
    clickedPoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x * scaleX, point.y * scaleY, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  };


  useEffect(() => {
    drawExtras();
  }, [clickedPoints, lines, previewMode, activePreview, savedPreviews]);


  const handleSaveArea = () => {
    if (clickedPoints.length < 3) {
      alert("Need at least 3 points to save!");
      return;
    }

    if (activePreview !== null) {
      setSavedPreviews((prev) =>
        prev.map((p) =>
          p.id === activePreview ? { ...p, points: [...clickedPoints] } : p
        )
      );
      setStatus(`Preview updated!`);
    } else {
      const newId = Date.now();
      setSavedPreviews((prev) => [...prev, { id: newId, points: [...clickedPoints] }]);
      setStatus("New area saved!");
    }
    setClickedPoints([]);
    setLines([]);
    setPreviewMode(false);
    setShowAllMode(false);
    setActivePreview(null);
  };


  return (

    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <h2 className="text-2xl md:text-3xl font-bold text-center text-purple-700 drop-shadow-sm">
          🎨 React Canvas Image Demo
        </h2>

        {/* Upload Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setImageSrc(e.target.files[0]);
                setClickedPoints([]);
                setStatus("New image loaded");
              }
            }}
            className="file:px-3 file:py-2 file:rounded-lg file:border-none file:bg-purple-200 
                   file:text-purple-800 hover:file:bg-purple-300 transition cursor-pointer
                   w-full sm:w-auto"
          />
        </div>

        {/* Canvas */}
        <div className="w-full flex justify-center">
          <div className="relative rounded-2xl overflow-hidden shadow-lg bg-white/60 backdrop-blur-md border border-purple-200">
            <CanvasImage
              src={imageSrc}
              width={parseSize(width)}
              height={parseSize(height)}
              divClassName="bg-[#f0f0f0]"
              divStyle={{ backgroundColor: "#f0f0f0" }}
              useOriginalCoords={true}
              onClickPixel={(coords: { x: number; y: number }, color: PixelColor) => {
                if (previewMode) return;
                setClickedPixel({ coords, color });
                setStatus(`Clicked pixel at (${coords.x}, ${coords.y})`);
                setClickedPoints((prev) => {
                  const newPoints = [...prev, coords];
                  if (newPoints.length > 1) {
                    const from = newPoints[newPoints.length - 2];
                    const to = newPoints[newPoints.length - 1];
                    setLines((prevLines) => [...prevLines, { from, to }]);
                  }
                  return newPoints;
                });
              }}
              onHoverPixel={(coords: { x: number; y: number }, color: PixelColor) =>
                setHoverPixel({ coords, color })
              }
              onCanvasReady={(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
                ctxRef.current = ctx;
                canvasRef.current = canvas;
                drawExtras();
              }}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-sm space-y-2 border border-purple-100">
          <p className="text-sm md:text-base">
            <strong>Status:</strong> {status}
          </p>
          {clickedPixel && (
            <p className="text-sm md:text-base text-purple-700">
              <strong>Clicked:</strong> ({clickedPixel.coords.x}, {clickedPixel.coords.y}) →{" "}
              {clickedPixel.color.rgb} | {clickedPixel.color.hex}
            </p>
          )}
          {hoverPixel && (
            <p className="text-sm md:text-base text-blue-700">
              <strong>Hover:</strong> ({hoverPixel.coords.x}, {hoverPixel.coords.y}) →{" "}
              {hoverPixel.color.rgb} | {hoverPixel.color.hex}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => {
              setClickedPixel(null);
              setHoverPixel(null);
              setClickedPoints([]);
              setLines([]);
              setPreviewMode(false);
              setActivePreview(null);
              setStatus("Points cleared");
            }}
            className="px-4 py-2 bg-gray-200 rounded-xl shadow hover:bg-gray-300 transition"
          >
            Reset Points
          </button>

          <button
            onClick={() => {
              if (clickedPoints.length > 2) {
                const first = clickedPoints[0];
                const last = clickedPoints[clickedPoints.length - 1];
                setLines((prev) => [...prev, { from: last, to: first }]);
              }
            }}
            className="px-4 py-2 bg-green-200 rounded-xl shadow hover:bg-green-300 transition"
          >
            Complete Draw
          </button>

          {!previewMode ? (
            <button
              onClick={() => {
                setPreviewMode(true);
                setStatus("Preview mode enabled");
              }}
              className="px-4 py-2 bg-purple-200 rounded-xl shadow hover:bg-purple-300 transition"
            >
              Preview
            </button>
          ) : (
            <button
              onClick={() => {
                setPreviewMode(false);
                setStatus("Exited preview mode");
              }}
              className="px-4 py-2 bg-orange-200 rounded-xl shadow hover:bg-orange-300 transition"
            >
              Exit Preview
            </button>
          )}

          <button
            onClick={handleSaveArea}
            className="px-4 py-2 bg-blue-200 rounded-xl shadow hover:bg-blue-300 transition"
          >
            Save This Area
          </button>


        </div>

        {/* Saved previews */}
        <div className="bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow border border-purple-100">
          <h3 className="font-semibold text-lg text-purple-700">Saved Previews:</h3>
          {savedPreviews.length === 0 && <p className="text-gray-500">No previews saved yet.</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            {savedPreviews.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  setActivePreview(p.id);
                  setClickedPoints(p.points);
                  setLines(
                    p.points
                      .map((pt, i) => (i > 0 ? { from: p.points[i - 1], to: pt } : null))
                      .filter(Boolean) as { from: PixelCoords; to: PixelCoords }[]
                  );
                  setPreviewMode(false);
                  setStatus(`Loaded Preview ${idx + 1} (polygon only)`);
                }}
                className={`px-3 py-1 rounded-lg shadow transition ${activePreview === p.id
                  ? "bg-yellow-300 text-black"
                  : "bg-gray-100 hover:bg-yellow-100"
                  }`}
              >
                Preview {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Show all previews */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setShowAllMode(true);
              setClickedPoints([]);
              setLines([]);
            }}
            className="px-4 py-2 bg-indigo-200 rounded-xl shadow hover:bg-indigo-300 transition"
          >
            Show All Saved
          </button>
        </div>

        {(previewMode || showAllMode || activePreview !== null) && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                setPreviewMode(false);
                setShowAllMode(false);
                setActivePreview(null);
                setClickedPoints([]);
                setLines([]);
                setStatus("Exited preview/show all mode");
              }}
              className="px-4 py-2 bg-red-200 rounded-xl shadow hover:bg-red-300 transition"
            >
              Exit Preview / Show All
            </button>
          </div>
        )}
      </div>
    </div>


  );
}
