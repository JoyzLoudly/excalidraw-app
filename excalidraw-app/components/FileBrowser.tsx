// 导入必要的依赖
import React, { useState } from "react";
import "./FileBrowser.scss";
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

// 组件属性接口定义
interface FileBrowserProps {
  excalidrawAPI: ExcalidrawImperativeAPI;  // Excalidraw API 实例
  isOpen: boolean;                          // 文件浏览器是否打开
  onClose: () => void;                      // 关闭文件浏览器的回调函数
}

// 文件系统 API 类型定义
interface FileSystemHandle {
  readonly kind: "file" | "directory";      // 文件系统项类型
  readonly name: string;                    // 文件或目录名称
}

// 文件句柄接口定义
interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: "file";
  getFile(): Promise<File>;                 // 获取文件内容的方法
}

// 目录句柄接口定义
interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: "directory";
  // 获取子目录的方法
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemDirectoryHandle>;
  // 获取文件的方法
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemFileHandle>;
  // 获取目录内容的迭代器
  values(): AsyncIterableIterator<FileSystemHandle>;
}

// 文件系统项数据结构
interface FileSystemItem {
  name: string;                             // 项目名称
  kind: "file" | "directory";               // 类型（文件或目录）
  handle: FileSystemHandle;                 // 文件系统句柄
  children?: FileSystemItem[];              // 子项目（仅目录有）
  isExpanded?: boolean;                     // 目录是否展开
}

// 文件浏览器组件
export const FileBrowser: React.FC<FileBrowserProps> = ({
  excalidrawAPI,
  isOpen,
  onClose,
}) => {
  // 状态管理
  const [rootDirectory, setRootDirectory] = useState<FileSystemItem | null>(null);  // 根目录
  const [isLoading, setIsLoading] = useState(false);                               // 加载状态
  const [error, setError] = useState<string | null>(null);                         // 错误信息

  // 选择目录的处理函数
  const selectDirectory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 请求用户选择一个目录
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: "read",
      });

      // 读取目录内容
      const rootItem: FileSystemItem = {
        name: dirHandle.name,
        kind: "directory",
        handle: dirHandle,
        children: [],
        isExpanded: true,
      };

      await readDirectoryContents(dirHandle, rootItem);
      setRootDirectory(rootItem);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "选择目录时出错");
        console.error("选择目录时出错:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 读取目录内容的函数
  const readDirectoryContents = async (
    dirHandle: FileSystemDirectoryHandle,
    parentItem: FileSystemItem,
  ) => {
    parentItem.children = [];

    try {
      for await (const entry of dirHandle.values()) {
        const item: FileSystemItem = {
          name: entry.name,
          kind: entry.kind,
          handle: entry,
          children: entry.kind === "directory" ? [] : undefined,
        };

        parentItem.children.push(item);
      }

      // 按照文件夹在前，文件在后，然后按名称排序
      parentItem.children.sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (err: any) {
      console.error("读取目录内容时出错:", err);
      setError(`读取目录 "${parentItem.name}" 时出错: ${err.message}`);
    }
  };

  // 切换目录展开/折叠状态的函数
  const toggleDirectory = async (item: FileSystemItem) => {
    if (item.kind !== "directory") {
      return;
    }

    const newRoot = { ...rootDirectory } as FileSystemItem;
    const findAndToggle = (
      items: FileSystemItem[] | undefined,
      target: FileSystemItem,
    ): boolean => {
      if (!items) {
        return false;
      }

      for (let i = 0; i < items.length; i++) {
        if (items[i].handle === item.handle) {
          const newItem = { ...items[i] };
          newItem.isExpanded = !newItem.isExpanded;

          // 如果展开且子项为空，则加载子项
          if (
            newItem.isExpanded && (!newItem.children || newItem.children.length === 0)
          ) {
            // 异步加载子目录内容
            readDirectoryContents(
                newItem.handle as FileSystemDirectoryHandle,newItem
            )
              .then(() => {
                items[i] = newItem;
                setRootDirectory({ ...newRoot });
              })
              .catch(err => {
                setError(`读取目录 "${newItem.name}" 时出错: ${err.message}`);
              });
          }
          
          items[i] = newItem;
          return true;
        }
        
        if (findAndToggle(items[i].children, target)) {
          return true;
        }
      }
      return false;
    };

    if (newRoot && newRoot.children) {
      findAndToggle([newRoot], item);
      setRootDirectory(newRoot);
    }
  };

  // 打开文件的处理函数
  const openFile = async (item: FileSystemItem) => {
    if (item.kind !== "file") {
        return;
    };

    try {
      setIsLoading(true);
      const fileHandle = item.handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();

      // 检查文件类型是否为 Excalidraw 文件
      if (
        file.name.endsWith(".excalidraw") || 
        file.type === "application/json"
      ) {
        const contents = await loadFromBlob(file, null, null);
        excalidrawAPI.updateScene(contents);
      } else {
        setError("不支持的文件类型。请选择 .excalidraw 或 JSON 文件。");
      }
    } catch (err: any) {
      setError(`打开文件时出错: ${err.message}`);
      console.error("打开文件时出错:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染文件树的递归函数
  const renderTree = (items: FileSystemItem[] | undefined, level = 0) => {
    if (!items || items.length === 0) {
        return null;
    };

    return (
      <ul 
        className="file-browser-list" 
        style={{ paddingLeft: level > 0 ? "1.2rem" : "0" }}
      >
        {items.map((item) => (
          <li key={`${item.name}-${item.kind}`} className="file-browser-item">
            <div
              className={`file-browser-entry ${item.kind}`}
              onClick={() => item.kind === "directory" ? toggleDirectory(item) : openFile(item)}
            >
              {item.kind === "directory" && (
                <span className={`directory-icon ${item.isExpanded ? "expanded" : "collapsed"}`}>
                  {item.isExpanded ? "▼" : "▶"}
                </span>
              )}
              <span className={`item-icon ${item.kind}`}></span>
              <span className="item-name">{item.name}</span>
            </div>
            {item.kind === "directory" && item.isExpanded && renderTree(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  // 如果文件浏览器未打开，返回 null
  if (!isOpen) return null;

  // 渲染文件浏览器界面
  return (
    <div className="file-browser-sidebar">
      {/* 文件浏览器头部 */}
      <div className="file-browser-header">
        <h3>文件浏览器</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      {/* 操作按钮区域 */}
      <div className="file-browser-actions">
        <button 
          className="select-directory-button"
          onClick={selectDirectory}
          disabled={isLoading}
        >
          选择目录
        </button>
      </div>
      
      {/* 错误信息显示 */}
      {error && <div className="file-browser-error">{error}</div>}
      
      {/* 加载状态显示 */}
      {isLoading && <div className="file-browser-loading">加载中...</div>}
      
      {/* 文件浏览器内容区域 */}
      <div className="file-browser-content">
        {rootDirectory ? (
          <div className="file-tree">
            {/* 根目录项 */}
            <div 
              className="file-browser-entry directory root"
              onClick={() => toggleDirectory(rootDirectory)}
            >
              <span 
                className={`directory-icon ${rootDirectory.isExpanded ? "expanded" : "collapsed"}`}
              >
                {rootDirectory.isExpanded ? "▼" : "▶"}
              </span>
              <span className="item-icon directory"></span>
              <span className="item-name">{rootDirectory.name}</span>
            </div>
            {/* 渲染子目录和文件 */}
            {rootDirectory.isExpanded && renderTree(rootDirectory.children)}
          </div>
        ) : (
          <div className="no-directory">
            <p>请选择一个目录以浏览文件</p>
          </div>
        )}
      </div>
    </div>
  );
};