import '@tiptap/core'
import { SearchOptions } from './searchExtension'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (searchOptions: SearchOptions) => ReturnType
      setCurrentSearchIndex: (index: number) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}