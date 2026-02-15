'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  categories: string[]
  selectedCategory: string | null
  onSelect: (category: string | null) => void
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors',
          selectedCategory === null
            ? 'bg-black text-white'
            : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.08] hover:text-black/70'
        )}
      >
        Wszystkie
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect(category)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            selectedCategory === category
              ? 'bg-black text-white'
              : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.08] hover:text-black/70'
          )}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
