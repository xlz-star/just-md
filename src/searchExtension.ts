import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface SearchResult {
  from: number
  to: number
}

export interface SearchOptions {
  searchTerm: string
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (searchOptions: SearchOptions) => ReturnType
      setCurrentSearchIndex: (index: number) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

const searchPluginKey = new PluginKey('search')

export const SearchExtension = Extension.create({
  name: 'search',

  addOptions() {
    return {
      searchResults: [] as SearchResult[],
      currentIndex: -1,
      searchOptions: {
        searchTerm: '',
        caseSensitive: false,
        wholeWord: false,
        useRegex: false,
      } as SearchOptions,
    }
  },

  addCommands() {
    return {
      setSearchTerm: (searchOptions: SearchOptions) => ({ tr, dispatch }: any) => {
        if (dispatch) {
          const meta = {
            searchOptions,
            searchResults: [],
            currentIndex: -1,
          }
          tr.setMeta(searchPluginKey, meta)
        }
        return true
      },

      setCurrentSearchIndex: (index: number) => ({ tr, dispatch }: any) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { currentIndex: index })
        }
        return true
      },

      clearSearch: () => ({ tr, dispatch }: any) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, {
            searchOptions: {
              searchTerm: '',
              caseSensitive: false,
              wholeWord: false,
              useRegex: false,
            },
            searchResults: [],
            currentIndex: -1,
          })
        }
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init() {
            return {
              searchOptions: extension.options.searchOptions,
              searchResults: extension.options.searchResults,
              currentIndex: extension.options.currentIndex,
              decorationSet: DecorationSet.empty,
            }
          },
          apply(tr, state) {
            const meta = tr.getMeta(searchPluginKey)
            if (meta) {
              const newState = { ...state }
              
              if (meta.searchOptions !== undefined) {
                newState.searchOptions = meta.searchOptions
                newState.searchResults = []
                newState.currentIndex = -1
                
                // Perform search
                if (meta.searchOptions.searchTerm) {
                  const results = performSearch(tr.doc, meta.searchOptions)
                  newState.searchResults = results
                  newState.currentIndex = results.length > 0 ? 0 : -1
                }
              }
              
              if (meta.currentIndex !== undefined) {
                newState.currentIndex = meta.currentIndex
              }
              
              // Create decorations
              newState.decorationSet = createDecorations(tr.doc, newState.searchResults, newState.currentIndex)
              
              return newState
            }
            
            // Map decorations through the transaction
            return {
              ...state,
              decorationSet: state.decorationSet.map(tr.mapping, tr.doc),
            }
          },
        },
        props: {
          decorations(state) {
            const pluginState = this.getState(state)
            return pluginState?.decorationSet || DecorationSet.empty
          },
        },
      }),
    ]
  },
})

function performSearch(doc: any, options: SearchOptions): SearchResult[] {
  const results: SearchResult[] = []
  const text = doc.textContent
  
  if (!options.searchTerm) return results
  
  let regex: RegExp
  try {
    if (options.useRegex) {
      regex = new RegExp(options.searchTerm, options.caseSensitive ? 'g' : 'gi')
    } else {
      let pattern = escapeRegExp(options.searchTerm)
      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`
      }
      regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi')
    }
  } catch (e) {
    return results
  }
  
  let match
  while ((match = regex.exec(text)) !== null) {
    results.push({
      from: match.index,
      to: match.index + match[0].length,
    })
  }
  
  return results
}

function createDecorations(doc: any, results: SearchResult[], currentIndex: number): DecorationSet {
  const decorations: Decoration[] = []
  
  results.forEach((result, index) => {
    const isActive = index === currentIndex
    const decoration = Decoration.inline(
      result.from,
      result.to,
      { class: isActive ? 'search-match active' : 'search-match' }
    )
    decorations.push(decoration)
  })
  
  return DecorationSet.create(doc, decorations)
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getSearchState(state: any) {
  return searchPluginKey.getState(state)
}