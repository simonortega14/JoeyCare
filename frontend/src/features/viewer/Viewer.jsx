import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/Volume';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkImageMapper from '@kitware/vtk.js/Rendering/Core/ImageMapper';
import vtkImageSlice from '@kitware/vtk.js/Rendering/Core/ImageSlice';

import controlPanel from './controlPanel.html';


const selectedEcografia = JSON.parse(localStorage.getItem('selectedEcografia'));


const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
  background: [0, 0, 0],
});


const renderWindow = fullScreenRenderWindow.getRenderWindow();
const renderer = fullScreenRenderWindow.getRenderer();
fullScreenRenderWindow.addController(controlPanel);

const imageActorI = vtkImageSlice.newInstance();

renderer.addActor(imageActorI);

function updateColorLevel(e) {
  const colorLevel = Number(
    (e ? e.target : document.querySelector('.colorLevel')).value
  );
  imageActorI.getProperty().setColorLevel(colorLevel);
  renderWindow.render();
}

function updateColorWindow(e) {
  const colorLevel = Number(
    (e ? e.target : document.querySelector('.colorWindow')).value
  );
  imageActorI.getProperty().setColorWindow(colorLevel);
  renderWindow.render();
}

const reader = vtkHttpDataSetReader.newInstance({
  fetchGzip: true,
});
reader
  .setUrl(`http://localhost:4000/api/uploads/${selectedEcografia.filename}`, { loadData: true })
  .then(() => {
    const data = reader.getOutputData();
    const dataRange = data.getPointData().getScalars().getRange();
    const extent = data.getExtent();

    const imageMapperI = vtkImageMapper.newInstance();
    imageMapperI.setInputData(data);
    imageMapperI.setISlice(30);
    imageActorI.setMapper(imageMapperI);

    renderer.resetCamera();
    renderer.resetCameraClippingRange();
    renderWindow.render();

    ".sliceI".forEach((selector, idx) => {
      const el = document.querySelector(selector);
      el.setAttribute('min', extent[idx * 2 + 0]);
      el.setAttribute('max', extent[idx * 2 + 1]);
      el.setAttribute('value', 30);
    });

    ['.colorLevel', '.colorWindow'].forEach((selector) => {
      document.querySelector(selector).setAttribute('max', dataRange[1]);
      document.querySelector(selector).setAttribute('value', dataRange[1]);
    });
    document
      .querySelector('.colorLevel')
      .setAttribute('value', (dataRange[0] + dataRange[1]) / 2);
    updateColorLevel();
    updateColorWindow();
  });

document
  .querySelector('.colorLevel')
  .addEventListener('input', updateColorLevel);
document
  .querySelector('.colorWindow')
  .addEventListener('input', updateColorWindow);

