/**
 * Unit Tests for Chart Generator
 * Tests chart generation, canvas pooling, and chart types
 */

import { clearChartCanvasPool, generateChartImage } from '@/lib/charts/chart-generator'
import type { ChartData } from '@/lib/charts/chart-generator'

// Mock chartjs-node-canvas
jest.mock('chartjs-node-canvas', () => {
  return {
    ChartJSNodeCanvas: jest.fn().mockImplementation(() => ({
      renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-chart-image')),
    })),
  }
})

describe('Chart Generator - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearChartCanvasPool()
  })

  describe('generateChartImage', () => {
    it('should generate a bar chart successfully', async () => {
      const chartData: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Test Data',
            data: [10, 20, 30],
          },
        ],
      }

      const buffer = await generateChartImage(chartData, {
        title: 'Test Chart',
        width: 800,
        height: 600,
        type: 'bar',
      })

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('should handle different chart types', async () => {
      const chartData: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Data', data: [1, 2, 3] }],
      }

      const types: Array<'bar' | 'line' | 'pie' | 'doughnut' | 'radar'> = [
        'bar',
        'line',
        'pie',
        'doughnut',
        'radar',
      ]

      for (const type of types)
      {
        const buffer = await generateChartImage(chartData, {
          title: `Test ${type}`,
          type,
        })
        expect(buffer).toBeInstanceOf(Buffer)
      }
    })

    it('should apply custom dimensions', async () => {
      const chartData: ChartData = {
        labels: ['A', 'B'],
        datasets: [{ label: 'Data', data: [1, 2] }],
      }

      const buffer = await generateChartImage(chartData, {
        title: 'Custom Size',
        width: 1200,
        height: 800,
        type: 'bar',
      })

      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('should handle empty datasets gracefully', async () => {
      const chartData: ChartData = {
        labels: [],
        datasets: [],
      }

      const buffer = await generateChartImage(chartData, {
        title: 'Empty Chart',
        type: 'bar',
      })

      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('should handle large datasets', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => i)
      const chartData: ChartData = {
        labels: largeData.map((i) => `Item ${i}`),
        datasets: [{ label: 'Large Dataset', data: largeData }],
      }

      const buffer = await generateChartImage(chartData, {
        title: 'Large Chart',
        type: 'bar',
      })

      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('should handle multiple datasets', async () => {
      const chartData: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Dataset 1', data: [10, 20, 30] },
          { label: 'Dataset 2', data: [15, 25, 35] },
          { label: 'Dataset 3', data: [5, 15, 25] },
        ],
      }

      const buffer = await generateChartImage(chartData, {
        title: 'Multi-Dataset Chart',
        type: 'bar',
      })

      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('should handle horizontal bar charts', async () => {
      const chartData: ChartData = {
        labels: ['Formula A', 'Formula B', 'Formula C'],
        datasets: [{ label: 'SD', data: [0.44, 0.48, 0.52] }],
      }

      const buffer = await generateChartImage(chartData, {
        title: 'Horizontal Bars',
        type: 'horizontalBar',
        width: 850,
        height: 550,
      })

      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('should handle stacked bar charts', async () => {
      const chartData: ChartData = {
        labels: ['Group 1', 'Group 2'],
        datasets: [
          { label: 'Category A', data: [10, 20] },
          { label: 'Category B', data: [15, 25] },
        ],
      }

      const buffer = await generateChartImage(chartData, {
        title: 'Stacked Bars',
        type: 'stackedBar',
      })

      expect(buffer).toBeInstanceOf(Buffer)
    })
  })

  describe('Canvas Instance Pooling', () => {
    it('should reuse canvas instances for same dimensions', async () => {
      const { ChartJSNodeCanvas } = require('chartjs-node-canvas')
      const chartData: ChartData = {
        labels: ['A', 'B'],
        datasets: [{ label: 'Data', data: [1, 2] }],
      }

      // Generate first chart
      await generateChartImage(chartData, {
        title: 'Chart 1',
        width: 750,
        height: 500,
      })

      const firstCallCount = ChartJSNodeCanvas.mock.calls.length

      // Generate second chart with same dimensions
      await generateChartImage(chartData, {
        title: 'Chart 2',
        width: 750,
        height: 500,
      })

      // Should reuse existing instance, so no new instantiation
      expect(ChartJSNodeCanvas.mock.calls.length).toBe(firstCallCount)
    })

    it('should create new instance for different dimensions', async () => {
      const { ChartJSNodeCanvas } = require('chartjs-node-canvas')
      const chartData: ChartData = {
        labels: ['A', 'B'],
        datasets: [{ label: 'Data', data: [1, 2] }],
      }

      // Clear previous mocks
      ChartJSNodeCanvas.mockClear()

      // Generate chart with first dimensions
      await generateChartImage(chartData, {
        title: 'Chart 1',
        width: 750,
        height: 500,
      })

      const firstCallCount = ChartJSNodeCanvas.mock.calls.length

      // Generate chart with different dimensions
      await generateChartImage(chartData, {
        title: 'Chart 2',
        width: 900,
        height: 600,
      })

      // Should create new instance for different dimensions
      expect(ChartJSNodeCanvas.mock.calls.length).toBeGreaterThan(firstCallCount)
    })
  })

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', async () => {
      const { ChartJSNodeCanvas } = require('chartjs-node-canvas')

      // Mock rendering error
      ChartJSNodeCanvas.mockImplementationOnce(() => ({
        renderToBuffer: jest.fn().mockRejectedValue(new Error('Rendering failed')),
      }))

      const chartData: ChartData = {
        labels: ['A', 'B'],
        datasets: [{ label: 'Data', data: [1, 2] }],
      }

      await expect(
        generateChartImage(chartData, { title: 'Error Chart' })
      ).rejects.toThrow('Rendering failed')
    })
  })
})
