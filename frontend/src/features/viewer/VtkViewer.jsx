import { useState } from "react";
import ImageSelector from "./ImageSelector";
import ImageViewer from "./ImageViewer";

function VtkViewer() {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageSelected = (imageFile) => {
    setSelectedImage(imageFile);
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  return (
    <>
      {!selectedImage ? (
        <ImageSelector onImageSelected={handleImageSelected} />
      ) : (
        <div style={{ width: "100%", height: "100vh", position: "fixed", top: 0, left: 0, background: "#000", overflow: "hidden", zIndex: 9999 }}>
          <ImageViewer imageFile={selectedImage} onClose={handleClose} />
        </div>
      )}
    </>
  );
}

export default VtkViewer;