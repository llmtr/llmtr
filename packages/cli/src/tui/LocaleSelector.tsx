import type { LocaleEntry } from '@llmtr/core'
import { fetchLocales } from '@llmtr/core'
import { Box, Text, useInput } from 'ink'
import { useEffect, useState } from 'react'

const WINDOW_SIZE = 10

interface LocaleSelectorProps {
  initialSelected?: string[]
  onConfirm: (locales: string[]) => void
}

export function LocaleSelector({ initialSelected = [], onConfirm }: LocaleSelectorProps) {
  const [locales] = useState<LocaleEntry[]>(() => fetchLocales())
  const [filter, setFilter] = useState('')
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))

  const filtered = locales.filter(e =>
    !filter
    || e.locale.toLowerCase().includes(filter.toLowerCase())
    || e.language.name.toLowerCase().includes(filter.toLowerCase()),
  )

  useEffect(() => {
    setCursor(c => Math.min(c, Math.max(0, filtered.length - 1)))
  }, [filter, filtered.length])

  const windowStart = Math.max(0, Math.min(cursor - Math.floor(WINDOW_SIZE / 2), filtered.length - WINDOW_SIZE))
  const visible = filtered.slice(windowStart, windowStart + WINDOW_SIZE)

  const toggleCurrent = () => {
    const item = filtered[cursor]
    if (!item)
      return
    setSelected((s) => {
      const next = new Set(s)
      next.has(item.locale) ? next.delete(item.locale) : next.add(item.locale)
      return next
    })
  }

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor(c => Math.max(0, c - 1))
      return
    }
    if (key.downArrow) {
      setCursor(c => Math.min(filtered.length - 1, c + 1))
      return
    }
    if (key.return) {
      if (selected.size > 0)
        onConfirm(Array.from(selected))
      return
    }
    if (key.backspace || key.delete) {
      setFilter(f => f.slice(0, -1))
      return
    }
    if (input === ' ') {
      toggleCurrent()
      return
    }
    if (input && !key.ctrl && !key.meta)
      setFilter(f => f + input)
  })

  const selectedList = Array.from(selected)

  return (
    <Box flexDirection="column" gap={1}>
      {/* Filter input box */}
      <Box borderStyle="single" borderColor="cyan" paddingX={1} gap={1}>
        <Text color="gray">Filter:</Text>
        <Text>{filter}</Text>
        <Text color="cyan">▌</Text>
        <Text color="gray" dimColor>
          {filtered.length}
          {' '}
          results
        </Text>
      </Box>

      {/* Locale list */}
      <Box flexDirection="column">
        {visible.map((entry, i) => {
          const absoluteIdx = windowStart + i
          const isCursor = absoluteIdx === cursor
          const isSelected = selected.has(entry.locale)
          return (
            <Box key={entry.locale} gap={1}>
              <Text color={isCursor ? 'cyan' : 'gray'}>{isCursor ? '❯' : ' '}</Text>
              <Text color={isSelected ? 'green' : 'gray'}>{isSelected ? '◉' : '○'}</Text>
              <Text color={isCursor ? 'cyan' : 'white'} bold={isCursor}>{entry.locale.padEnd(9)}</Text>
              <Text color={isCursor ? 'white' : 'gray'}>{entry.language.name.padEnd(18)}</Text>
              <Text color="gray" dimColor>{entry.country?.name ?? ''}</Text>
            </Box>
          )
        })}
        {filtered.length > WINDOW_SIZE && (
          <Text color="gray" dimColor>
            {'  '}
            ↑↓
            {' '}
            {cursor + 1}
            {' '}
            /
            {' '}
            {filtered.length}
          </Text>
        )}
      </Box>

      {/* Selected chips */}
      <Box gap={1} flexWrap="wrap">
        <Text color="gray">Selected:</Text>
        {selectedList.length === 0
          ? <Text color="gray" dimColor>(none)</Text>
          : selectedList.map(l => (
              <Text key={l} color="green">
                [
                {l}
                ]
              </Text>
            ))}
      </Box>

      {/* Hint */}
      <Text color="gray" dimColor>
        Space toggle · ↑↓ navigate · Enter confirm
        {selectedList.length === 0 ? ' (select at least one)' : ''}
      </Text>
    </Box>
  )
}
