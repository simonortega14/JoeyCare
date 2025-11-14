import { useState } from "react";
import ImageSelector from "./ImageSelector";
import ImageViewer from "./ImageViewer";
import "./viewer.css";

function VtkViewer({ user }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageSelected = (imageFile) => {
    setSelectedImage(imageFile);
  };

  const handleClose = () => {
    setSelectedImage(null);
    // Si hay parámetros en la URL (vino desde dashboard o paciente), volver a la página anterior
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('patient') && urlParams.has('file')) {
      window.history.back();
    } else {
      // Si no hay parámetros, limpiar la URL y mostrar el selector
      window.history.replaceState(null, '', '/visualizar-ecografias');
    }
  };

  return (
    <>
      {!selectedImage ? (
        <ImageSelector onImageSelected={handleImageSelected} />
      ) : (
        <div className="vtk-fullscreen">
          <ImageViewer imageFile={selectedImage} onClose={handleClose} user={user} />
        </div>
      )}
    </>
  );
}

export default VtkViewer;