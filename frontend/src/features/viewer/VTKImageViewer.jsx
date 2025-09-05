import React, { useRef, useEffect } from 'react';

// VTK + ITK viewer preparado para PNG (test.png en /public) y para futuros DICOM/NIfTI
// Requisitos (instalar en tu proyecto):
// npm install @kitware/vtk.js
// npm install @itk-wasm/image-io   (opcional: puedes usar la versión CDN para evitar configurar workers)

export default function VTKImageViewer({ src = '/test.png', background = [0.08, 0.08, 0.1] }) {
  const containerRef = useRef(null);
  const vtkContextRef = useRef(null); // guardamos objetos para limpiar

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      // Carga de los módulos VTK
      // Usamos imports directos de @kitware/vtk.js (ESM)
      const vtkGenericRenderWindow = (await import('@kitware/vtk.js/Rendering/Misc/GenericRenderWindow')).default;
      const vtkImageMapper = (await import('@kitware/vtk.js/Rendering/Core/ImageMapper')).default;
      const vtkImageSlice = (await import('@kitware/vtk.js/Rendering/Core/ImageSlice')).default;
      const vtkImageProperty = (await import('@kitware/vtk.js/Rendering/Core/ImageProperty')).default;
      const vtkITKHelper = (await import('@kitware/vtk.js/Common/DataModel/ITKHelper')).default;

      // Importar perfiles (carga internals necesarios para render)
      await import('@kitware/vtk.js/Rendering/Profiles/All');

      // Crear ventana genérica dentro del div (no full screen)
      const genericRenderWindow = vtkGenericRenderWindow.newInstance({ background, container: containerRef.current });
      const renderer = genericRenderWindow.getRenderer();
      const renderWindow = genericRenderWindow.getRenderWindow();

      // Guardamos para limpieza
      vtkContextRef.current = { genericRenderWindow, renderer, renderWindow };

      // ---------- Lectura de la imagen con ITK (funciona para PNG y para DICOM/NIfTI si en el futuro usas @itk-wasm/dicom o image-io)
      // Opción 1: si instalaste @itk-wasm/image-io via npm, puedes importarlo directamente:
      //   const { readImage } = await import('@itk-wasm/image-io');
      // Opción 2 (sin instalar): usar bundle desde CDN (ejemplo):
      let readImage;
      try {
        // Intentamos importar paquete local (mejor para producción)
        const pkg = await import('@itk-wasm/image-io');
        readImage = pkg.readImage;
      } catch {
        // Si falla, usamos CDN worker-embedded bundle (con webpackIgnore para saltarnos bundler)
        // Nota: para Vite puede funcionar; si no, instala @itk-wasm/image-io en tu proyecto.
        const cdn = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/@itk-wasm/image-io@1.1.0/dist/bundle/index-worker-embedded.min.js');
        readImage = cdn.readImage;
      }

      // Traer el archivo (desde /public/test.png por defecto). Para DICOM en el futuro, envía un FileList o ZIP de dicoms
      const res = await fetch(src);
      if (!res.ok) throw new Error(`Error fetching ${src}: ${res.status}`);
      const blob = await res.blob();
      const fileName = src.split('/').pop() || 'image';
      const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

      // readImage acepta File/Blob y devuelve { image, webWorker, ... }
      const { image: itkImage } = await readImage(file);
      if (cancelled) return;

      // Convertir imagen ITK --> VTK
      const vtkImage = vtkITKHelper.convertItkToVtkImage(itkImage);

      // Crear mapper/slice para mostrar la imagen 2D (una sola capa)
      const mapper = vtkImageMapper.newInstance();
      // Para imagen 2D el mapper espera vtkImageData como inputData
      mapper.setInputData(vtkImage);

      const slice = vtkImageSlice.newInstance();
      slice.setMapper(mapper);

      // Ajustes de propiedad (contraste/ventana si quieres)
      const imgProp = vtkImageProperty.newInstance();
      slice.setProperty(imgProp);

      renderer.addActor(slice);
      renderer.resetCamera();
      renderWindow.render();

      // Si necesitas controles (zoom/pan), usa InteractorStyleImage o widgets (se pueden añadir)
    }

    init().catch((err) => {
      // En caso de fallo, mostramos el error en consola y dejamos un mensaje en el div
      // No interrumpimos la app completa
      // eslint-disable-next-line no-console
      console.error('VTK viewer init error:', err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="padding:16px;color:#c00;font-family:monospace">Error inicializando VTK viewer: ${String(err.message || err)}</div>`;
      }
    });

    return () => {
      cancelled = true;
      // limpieza: eliminar renderwindow y contextos
      const ctx = vtkContextRef.current;
      if (ctx && ctx.genericRenderWindow && typeof ctx.genericRenderWindow.delete === 'function') {
        try {
          ctx.genericRenderWindow.delete();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Error cleaning vtk context', e);
        }
      } else if (containerRef.current) {
        // fallback: vaciar contenedor
        containerRef.current.innerHTML = '';
      }
    };
  }, [src, background]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div ref={containerRef} className="w-full h-[600px] border rounded-lg shadow" />
    </div>
  );
}
