// src/utils/cornerstoneSetup.js

import * as cornerstone from "cornerstone-core";
import * as cornerstoneTools from "cornerstone-tools";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";

// 🔹 Vincular dependencias externas
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneTools.math;
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// 🔹 Inicializar Web Workers del loader WADO
cornerstoneWADOImageLoader.webWorkerManager.initialize({
  maxWebWorkers: navigator.hardwareConcurrency || 2,
  startWebWorkersOnDemand: true,
  webWorkerPath: cornerstoneWADOImageLoader.webWorkerPath || undefined,
  taskConfiguration: {
    decodeTask: {
      codecsPath: cornerstoneWADOImageLoader.wasmCodecsPath || undefined,
    },
  },
});

// 🔹 Inicializar herramientas (una sola vez)
cornerstoneTools.init({
  showSVGCursors: true,
});

// Registrar herramientas básicas
const WwwcTool = cornerstoneTools.WwwcTool;
const PanTool = cornerstoneTools.PanTool;
const ZoomTool = cornerstoneTools.ZoomTool;

cornerstoneTools.addTool(WwwcTool);
cornerstoneTools.addTool(PanTool);
cornerstoneTools.addTool(ZoomTool);

// Exportar instancias configuradas
export { cornerstone, cornerstoneTools };
