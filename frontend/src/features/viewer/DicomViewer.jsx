// DicomViewer.jsx
import { useRef, useEffect } from "react";
import "@kitware/vtk.js/Rendering/Profiles/All";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkImageSlice from "@kitware/vtk.js/Rendering/Core/ImageSlice";
import vtkImageMapper from "@kitware/vtk.js/Rendering/Core/ImageMapper";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import dicomParser from "dicom-parser";

function DicomViewer({ dicomUrl = "/100002A3.dcm" }) {
  const vtkContainerRef = useRef(null);
  const context = useRef(null);

  useEffect(() => {
    async function loadDicom() {
      try {
        const res = await fetch(dicomUrl);
        const buffer = await res.arrayBuffer();
        const byteArray = new Uint8Array(buffer);

        // Parse DICOM
        const dataSet = dicomParser.parseDicom(byteArray);

        // Useful debugging info:
        const transferSyntax = dataSet.string('x00020010') || "unknown";
        console.log("TransferSyntaxUID:", transferSyntax);
        // If compressed, we cannot decode pixel data here:
        const compressedPrefix = "1.2.840.10008.1.2.4"; // JPEG family prefix
        if (transferSyntax.startsWith(compressedPrefix) || transferSyntax === "1.2.840.10008.1.2.5") {
          throw new Error(`DICOM compressed (TransferSyntax=${transferSyntax}). Use itk.js/dcmjs or decode server-side.`);
        }

        const rows = dataSet.uint16("x00280010");
        const cols = dataSet.uint16("x00280011");
        const samplesPerPixel = dataSet.uint16("x00280002") || 1;
        const bitsAllocated = dataSet.uint16("x00280100");
        const pixelRepresentation = dataSet.uint16("x00280103") || 0; // 0 unsigned, 1 signed
        const photometric = dataSet.string("x00280004") || "MONOCHROME2";
        const numberOfFrames = parseInt(dataSet.string("x00280008") || "1", 10);

        const pixelDataElement = dataSet.elements.x7fe00010;
        if (!pixelDataElement) throw new Error("No Pixel Data found in DICOM");

        // Window/Level might be multi-valued
        const wcRaw = dataSet.string("x00281050");
        const wwRaw = dataSet.string("x00281051");
        const windowCenter = wcRaw ? parseFloat(wcRaw.split('\\')[0]) : null;
        const windowWidth = wwRaw ? parseFloat(wwRaw.split('\\')[0]) : null;

        // Rescale
        const rescaleIntercept = parseFloat(dataSet.string("x00281052") || dataSet.string("x00281052") || dataSet.string("x00280120") || "0") || 0;
        const rescaleSlope = parseFloat(dataSet.string("x00281053") || "1") || 1; // sometimes tags differ, check later if needed

        // Prepare pixel array
        const byteOffset = pixelDataElement.dataOffset;
        const byteLength = pixelDataElement.length; // length in bytes

        const nPixels = (byteLength / (bitsAllocated / 8)) / Math.max(samplesPerPixel, 1);

        let rawValues;
        if (bitsAllocated === 16) {
          // signed or unsigned 16
          if (pixelRepresentation === 1) {
            rawValues = new Int16Array(buffer, byteOffset, nPixels * samplesPerPixel);
          } else {
            rawValues = new Uint16Array(buffer, byteOffset, nPixels * samplesPerPixel);
          }
        } else {
          // assume 8 bits
          rawValues = new Uint8Array(buffer, byteOffset, nPixels * samplesPerPixel);
        }

        // Convert to float array applying rescale, and handle photometric inversion if necessary
        const out = new Float32Array(nPixels * (samplesPerPixel || 1));
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < out.length; i++) {
          let v = rawValues[i];
          // If photometric MONOCHROME1 invert
          if (photometric === "MONOCHROME1") {
            // for inversion we need the maximum possible value.
            // If bitsAllocated=16 -> max = 2^16 -1 or based on signed range.
            let maxPossible = bitsAllocated === 16 ? (pixelRepresentation === 1 ? 32767 : 65535) : 255;
            v = maxPossible - v;
          }
          // apply rescale
          v = v * rescaleSlope + rescaleIntercept;
          out[i] = v;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        console.log({ rows, cols, samplesPerPixel, bitsAllocated, pixelRepresentation, numberOfFrames, photometric, windowCenter, windowWidth, min, max });

        // Build vtkImageData
        const imageData = vtkImageData.newInstance();
        imageData.setOrigin(0, 0, 0);
        imageData.setSpacing(1, 1, 1);
        imageData.setDimensions(cols, rows, 1);

        // Create vtk scalars from Float32Array
        const vtkArray = vtkDataArray.newInstance({
          values: out,
          numberOfComponents: samplesPerPixel || 1,
        });
        imageData.getPointData().setScalars(vtkArray);

        // VTK pipeline (image slice)
        const mapper = vtkImageMapper.newInstance();
        mapper.setInputData(imageData);
        mapper.setSlicingMode(vtkImageMapper.SlicingMode.Z);

        const actor = vtkImageSlice.newInstance();
        actor.setMapper(mapper);

        // Window/Level: if available, apply; otherwise use min/max
        const ww = windowWidth || (max - min);
        const wc = windowCenter || (min + (max - min) / 2);
        actor.getProperty().setColorWindow(ww);
        actor.getProperty().setColorLevel(wc);

        // Create renderer
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
          rootContainer: vtkContainerRef.current,
          containerStyle: { width: "100%", height: "100%", position: "relative" },
        });
        const renderer = fullScreenRenderer.getRenderer();
        const renderWindow = fullScreenRenderer.getRenderWindow();

        renderer.addActor(actor);
        renderer.resetCamera();
        renderWindow.render();

        context.current = { fullScreenRenderer, renderer, renderWindow, actor };
      } catch (err) {
        console.error("Error al cargar DICOM:", err);
        alert("Error cargando DICOM: " + (err.message || err));
      }
    }

    loadDicom();

    return () => {
      if (context.current) {
        context.current.fullScreenRenderer.delete();
        context.current = null;
      }
    };
  }, [dicomUrl]);

  return <div ref={vtkContainerRef} style={{ width: "100%", height: "100vh", background: "black" }} />;
}

export default DicomViewer;
