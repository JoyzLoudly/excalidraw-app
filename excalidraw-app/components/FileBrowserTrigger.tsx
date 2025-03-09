import React from "react";
import "./FileBrowserTrigger.scss";
// 导入文件夹图标组件
import { LoadIcon as folderIcon } from "@excalidraw/excalidraw/components/icons";

// 定义 FileBrowserTrigger 组件的属性接口
interface FileBrowserTriggerProps {
  // 点击触发器时的回调函数
  onClick: () => void;
  // 文件浏览器是否处于激活状态
  isActive: boolean;
}

// 文件浏览器触发器组件
// 用于打开/关闭文件浏览器侧边栏
export const FileBrowserTrigger: React.FC<FileBrowserTriggerProps> = ({
  onClick,
  isActive,
}) => {
  return (
    <button
      // 根据激活状态添加不同的样式类名
      className={`FileBrowserTrigger ${isActive ? "active" : ""}`}
      onClick={onClick}
      title="文件浏览器"
      aria-label="文件浏览器"
    >
      {folderIcon}
    </button>
  );
};
