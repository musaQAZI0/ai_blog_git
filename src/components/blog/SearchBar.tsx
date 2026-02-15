'use client'

import React, { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export function SearchBar({
  onSearch,
  placeholder = 'Szukaj artykulow...',
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
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-black/[0.08] bg-white pl-9 pr-9 text-sm text-black placeholder:text-black/30 outline-none transition-colors focus:border-black/20 focus:ring-0"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  )
}
