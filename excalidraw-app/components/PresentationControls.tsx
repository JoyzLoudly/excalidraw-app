import React, { useCallback, useEffect, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  ExcalidrawFrameElement,
} from "@excalidraw/excalidraw/element/types";

interface PresentationControlsProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  onClose: () => void;
}

export const PresentationControls: React.FC<PresentationControlsProps> = ({
  excalidrawAPI,
  onClose,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);

  const navigateToFrame = useCallback(
    (frameId: string) => {
      excalidrawAPI.scrollToContent(
        excalidrawAPI.getSceneElements().filter((el) => el.id === frameId),
        {
          animate: true,
          fitToViewport: true,
        },
      );
    },
    [excalidrawAPI],
  );

  // 初始化时设置查看模式和禅模式，并导航到第一个 frame
  useEffect(() => {
    const elements = excalidrawAPI.getSceneElements();
    const frameElements = elements
      .filter(
        (el: ExcalidrawElement): el is ExcalidrawFrameElement =>
          el.type === "frame",
      )
      .sort((a, b) => {
        const nameA = (a as any).name || "";
        const nameB = (b as any).name || "";
        return nameA.localeCompare(nameB);
      });

    const frameIds = frameElements.map((frame) => frame.id);
    setFrames(frameIds);

    // 设置查看模式和禅模式
    excalidrawAPI.updateScene({ appState: { viewModeEnabled: true } });
    excalidrawAPI.updateScene({ appState: { zenModeEnabled: true } });
    excalidrawAPI.updateScene({
      appState: {
        frameRendering: {
          enabled: true,
          name: false,
          outline: false,
          clip: true,
        },
      },
    });

    // 如果有 frame，导航到第一个
    if (frameIds.length > 0) {
      navigateToFrame(frameIds[0]);
    }
  }, [excalidrawAPI, navigateToFrame]);

  const handlePrevious = useCallback(() => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex((prev) => {
        const newIndex = prev - 1;
        navigateToFrame(frames[newIndex]);
        return newIndex;
      });
    }
  }, [currentFrameIndex, frames, navigateToFrame]);

  const handleNext = useCallback(() => {
    if (currentFrameIndex < frames.length - 1) {
      setCurrentFrameIndex((prev) => {
        const newIndex = prev + 1;
        navigateToFrame(frames[newIndex]);
        return newIndex;
      });
    }
  }, [currentFrameIndex, frames, navigateToFrame]);

  const handleClose = useCallback(() => {
    // 退出演示模式时关闭查看模式和禅模式
    excalidrawAPI.updateScene({ appState: { viewModeEnabled: false } });
    excalidrawAPI.updateScene({ appState: { zenModeEnabled: false } });
    excalidrawAPI.updateScene({
      appState: {
        frameRendering: {
          enabled: true,
          name: true,
          outline: true,
          clip: false,
        },
      },
    });

    // 缩放以显示所有内容
    excalidrawAPI.scrollToContent(excalidrawAPI.getSceneElements(), {
      animate: true,
      fitToViewport: true,
    });

    // 导航到第一个 Frame
    // if (frames.length > 0) {
    //   navigateToFrame(frames[0]);
    //   setCurrentFrameIndex(0);
    // }
    onClose();
  }, [excalidrawAPI, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        handlePrevious();
      } else if (event.key === "ArrowRight") {
        handleNext();
      } else if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevious, handleNext, handleClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "-70px",
        transform: "translateX(-50%)",
        background: "var(--island-bg-color)",
        padding: "12px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <button onClick={handlePrevious} disabled={currentFrameIndex === 0}>
        ←
      </button>
      <span>
        {currentFrameIndex + 1} / {frames.length}
      </span>
      <button
        onClick={handleNext}
        disabled={currentFrameIndex === frames.length - 1}
      >
        →
      </button>
      <button onClick={handleClose}>×</button>
    </div>
  );
};
