export const readTextFile = vi.fn()
export const writeTextFile = vi.fn()

readTextFile.mockResolvedValue('mock file content')
writeTextFile.mockResolvedValue(undefined)