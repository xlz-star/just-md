// 打开的文件类型
export interface OpenedFile {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean; // 是否已编辑但未保存
}

// 大纲项目类型
export interface HeadingStructure {
  level: number;
  text: string;
  pos: number;
}

// 文件树项目类型
export interface FileTreeItem {
  name: string;        // 文件或文件夹名称
  path: string;        // 完整路径
  isDirectory: boolean; // 是否是目录
  children?: FileTreeItem[]; // 子文件和文件夹
  isExpanded?: boolean;     // 是否展开
  level: number;            // 缩进级别
} 