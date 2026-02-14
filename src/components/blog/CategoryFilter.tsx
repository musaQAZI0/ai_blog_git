'use client'

import React from 'react'

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
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`transition-colors ${
          selectedCategory === null ? 'text-black' : 'text-black/60 hover:text-black'
        }`}
      >
        Wszystkie
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect(category)}
          className={`transition-colors ${
            selectedCategory === category ? 'text-black' : 'text-black/60 hover:text-black'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
