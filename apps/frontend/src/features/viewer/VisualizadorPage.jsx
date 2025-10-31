import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageSelector from "./ImageSelector";
import ImageViewer from "./ImageViewer";

export default function VisualizadorPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();

  return (
    <>
      {selectedImage ? (
        <ImageViewer
          imageFile={{
            // lo que pasamos desde ImageSelector.handleVisualize
            fullUrl: selectedImage.fullUrl,
            filename: selectedImage.filename,
          }}
          onClose={() => {
            setSelectedImage(null); // volver a selector
            // o navigate(-1) si quieres salir de la ruta
          }}
          isEmbedded={false}
        />
      ) : (
        <ImageSelector
          onImageSelected={(imgInfo) => {
            // imgInfo = { filename, fullUrl, ... }
            setSelectedImage(imgInfo);
          }}
        />
      )}
    </>
  );
}
