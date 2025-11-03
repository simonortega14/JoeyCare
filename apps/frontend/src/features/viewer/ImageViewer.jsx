import { useEffect, useState } from "react";
import "./viewer.css";

function getToken() {
  return localStorage.getItem("token") || "";
}

// Endpoint que devuelve la imagen procesada lista para ver
function RENDER_ECOGRAFIA_URL(ecoId) {
  return `/api/ecografias/${encodeURIComponent(ecoId)}/render`;
}

function ImageViewer({ imageRef, onClose }) {
  // imageRef = { neonatoId, ecografiaId, descripcion?, timestamp? }

  const [loading, setLoading] = useState(true);
  const [imgUrl, setImgUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let revokeLater = null;

    const fetchPng = async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await fetch(
          RENDER_ECOGRAFIA_URL(
            imageRef.neonatoId,
            imageRef.ecografiaId
          ),
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );

        if (!resp.ok) {
          throw new Error(
            `Error ${resp.status} generando imagen`
          );
        }

        const blob = await resp.blob();

        // seguridad básica: validar tipo
        if (
          !blob.type.startsWith("image/")
        ) {
          throw new Error(
            `Tipo no soportado: ${blob.type}`
          );
        }

        const localUrl = URL.createObjectURL(
          blob
        );
        revokeLater = localUrl;
        setImgUrl(localUrl);
      } catch (err) {
        console.error(
          "[ImageViewer] render error:",
          err
        );
        setError(
          "No se pudo renderizar la ecografía."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPng();

    return () => {
      if (revokeLater) {
        URL.revokeObjectURL(
          revokeLater
        );
      }
    };
  }, [imageRef.neonatoId, imageRef.ecografiaId]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Barra superior */}
      <div
        style={{
          background:
            "rgba(0,0,0,0.8)",
          padding: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          style={{
            background: "#333",
            color: "#fff",
            border: "none",
            padding:
              "6px 12px",
            borderRadius:
              "4px",
            cursor: "pointer",
            fontSize:
              "13px",
            fontWeight: "500",
          }}
          onClick={onClose}
        >
          ← Volver
        </button>

        <div
          style={{
            color: "#fff",
            fontSize:
              "13px",
          }}
        >
          {imageRef.descripcion ||
            "Ecografía"}
          {imageRef.timestamp
            ? ` • ${new Date(
                imageRef.timestamp
              ).toLocaleString()}`
            : ""}
          {` • ID ${imageRef.ecografiaId}`}
        </div>
      </div>

      {/* Contenido */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          position:
            "relative",
          overflow:
            "hidden",
        }}
      >
        {loading && (
          <div
            style={{
              color: "#fff",
              backgroundColor:
                "rgba(0,0,0,0.7)",
              padding:
                "20px",
              borderRadius:
                "8px",
              fontSize:
                "16px",
            }}
          >
            Cargando
            imagen...
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              color: "red",
              backgroundColor:
                "rgba(0,0,0,0.7)",
              padding:
                "20px",
              borderRadius:
                "8px",
              fontSize:
                "16px",
              maxWidth:
                "80%",
              textAlign:
                "center",
            }}
          >
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          imgUrl && (
            <img
              src={imgUrl}
              alt="Ecografía renderizada"
              style={{
                maxWidth:
                  "100%",
                maxHeight:
                  "100%",
                objectFit:
                  "contain",
                backgroundColor:
                  "black",
              }}
            />
          )}
      </div>
    </div>
  );
}

export default ImageViewer;
