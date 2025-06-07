export const save = vi.fn()
export const open = vi.fn()

save.mockResolvedValue('/mock/path/file.md')
open.mockResolvedValue(['/mock/path/file.md'])