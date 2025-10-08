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
        <ImageViewer imageFile={selectedImage} onClose={handleClose} />
      )}
    </>
  );
}

export default VtkViewer;