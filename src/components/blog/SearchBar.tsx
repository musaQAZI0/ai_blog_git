'use client'

import React, { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  onSearch,
  placeholder = 'Szukaj artykulow...',
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onSearch(query)
    },
    [query, onSearch]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    onSearch('')
  }, [onSearch])

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-black/[0.12] bg-[#f3f3f3] pl-9 pr-9 text-[15px] text-black placeholder:text-black/40 outline-none transition-colors focus:border-black/25 focus:bg-white focus:ring-0"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-black/35 transition-colors hover:text-black/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  )
}
