import React, { useEffect, useRef, useState } from "react";
import {
  RenderingEngine,
  Enums,
  volumeLoader,
  type Types,
} from "@cornerstonejs/core";

import { init as csRenderInit } from "@cornerstonejs/core";
import { init as csToolsInit } from "@cornerstonejs/tools";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import { api } from "dicomweb-client";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import * as cornerstone from "@cornerstonejs/core";
import * as cornerstoneTools from "@cornerstonejs/tools";

import createImageIdsAndCacheMetaData from "../lib/createImageIdsAndCacheMetaData";

// Tools
const {
  ToolGroupManager,
  ReferenceCursors,
  CrosshairsTool,
  StackScrollTool,
  Enums: csToolsEnums,
} = cornerstoneTools;

const { ViewportType } = Enums;

const renderingEngineId = "RENDERING_ENGINE_CURSOR";
const toolGroupId = "TOOLGROUP_CURSOR";

const volumeLoaderScheme = "cornerstoneStreamingImageVolume";
const uniqueVolumeId = `${volumeLoaderScheme}:CT_VOLUME_${Date.now()}`;

export default function Referance_cursor() {
  const element1Ref = useRef<HTMLDivElement | null>(null);
  const element2Ref = useRef<HTMLDivElement | null>(null);
  const element3Ref = useRef<HTMLDivElement | null>(null);
  const element4Ref = useRef<HTMLDivElement | null>(null);

  const [toolGroup, setToolGroup] = useState<any>(null);

  useEffect(() => {
    let renderingEngine: RenderingEngine | null = null;

    async function init() {
      if (
        !element1Ref.current ||
        !element2Ref.current ||
        !element3Ref.current ||
        !element4Ref.current
      )
        return;

      // Core init
      await csRenderInit();
      await csToolsInit();
      dicomImageLoaderInit({ maxWebWorkers: 1 });

       // Configure DICOM image loader for WADO-RS
      (cornerstoneDICOMImageLoader as any).external = (cornerstoneDICOMImageLoader as any).external || {};
      (cornerstoneDICOMImageLoader as any).external.cornerstone = cornerstoneDICOMImageLoader;
      (cornerstoneDICOMImageLoader as any).external.dicomwebClient = api.DICOMwebClient;


      // Register tools
      cornerstoneTools.addTool(ReferenceCursors);
    //  cornerstoneTools.addTool(CrosshairsTool);
      cornerstoneTools.addTool(StackScrollTool);

      // ToolGroup
      const tg = ToolGroupManager.getToolGroup(toolGroupId) ?? ToolGroupManager.createToolGroup(toolGroupId);

      tg.addTool(ReferenceCursors.toolName);
      tg.addTool(CrosshairsTool.toolName);
      tg.addTool(StackScrollTool.toolName);

      tg.setToolConfiguration(CrosshairsTool.toolName, {
        viewportIds: [
          "VOLUME_AXIAL",
          "VOLUME_SAGITTAL",
          "VOLUME_CORONAL",
          "STACK_AXIAL",
        ],
        enableReferenceLines: true,
        drawCrosshairs: true,
      });

      tg.setToolConfiguration(ReferenceCursors.toolName, { positionSync: true,});

      setToolGroup(tg);

      // Rendering engine
      renderingEngine = new RenderingEngine(renderingEngineId);

      const viewportIds = [
        "VOLUME_AXIAL",
        "VOLUME_SAGITTAL",
        "VOLUME_CORONAL",
        "STACK_AXIAL",
      ];

      renderingEngine.setViewports([
        {
          viewportId: viewportIds[0],
          type: ViewportType.ORTHOGRAPHIC,
          element: element1Ref.current,
          defaultOptions: { orientation: Enums.OrientationAxis.AXIAL },
        },
        {
          viewportId: viewportIds[1],
          type: ViewportType.ORTHOGRAPHIC,
          element: element2Ref.current,
          defaultOptions: { orientation: Enums.OrientationAxis.SAGITTAL },
        },
        {
          viewportId: viewportIds[2],
          type: ViewportType.ORTHOGRAPHIC,
          element: element3Ref.current,
          defaultOptions: { orientation: Enums.OrientationAxis.CORONAL },
        },
        {
          viewportId: viewportIds[3],
          type: ViewportType.STACK,
          element: element4Ref.current,
        },
      ]);

      viewportIds.forEach((id) =>
        tg.addViewport(id, renderingEngineId)
      );

      // Load images
      const imageIds = await createImageIdsAndCacheMetaData({
        StudyInstanceUID:
          "1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463",
        SeriesInstanceUID:
          "1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561",
        wadoRsRoot: "https://d14fa38qiwhyfd.cloudfront.net/dicomweb",
      });

      // Volume
      const volume = await volumeLoader.createAndCacheVolume(
        uniqueVolumeId,
        { imageIds }
      );
      await volume.load();

      // Volume viewports
      for (let i = 0; i < 3; i++) {
        const vp = renderingEngine.getViewport( viewportIds[i] ) as Types.IVolumeViewport;
        await vp.setVolumes([{ volumeId: uniqueVolumeId }]);
      }

      // Stack viewport
      const stackVp = renderingEngine.getViewport( "STACK_AXIAL" ) as Types.IStackViewport;
      await stackVp.setStack(imageIds);
      stackVp.resetCamera();

      // Tool bindings
      tg.setToolActive(StackScrollTool.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Wheel }],  });
     // tg.setToolActive(CrosshairsTool.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Auxiliary }],});
      tg.setToolActive(ReferenceCursors.toolName, { bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }], });

      renderingEngine.renderViewports(viewportIds);
    }

    init();

    return () => {
      renderingEngine?.destroy();
      ToolGroupManager.destroyToolGroup(toolGroupId);
    };
  }, []);

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div ref={element1Ref} style={{ width: 500, height: 600 }} />
      <div ref={element2Ref} style={{ width: 500, height: 600 }} />
      <div ref={element3Ref} style={{ width: 500, height: 600 }} />
      <div ref={element4Ref} style={{ width: 500, height: 600 }} />
    </div>
  );
}
