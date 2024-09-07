import { File, default as parse } from 'parse-diff'

export type Diff = File & { from: string | null; to: string | null }

export function parseDiff(input: string) {
  const diff = parse(input).map((file) => ({
    ...file,
    from: !file.from || file.from === '/dev/null' ? null : file.from,
    to: !file.to || file.to === '/dev/null' ? null : file.to,
  }))
  return diff as Diff[]
}
