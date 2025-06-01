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